import { getCameras, type CameraItem } from "../api";

interface SidebarVisual {
  iconSrc: string;
  alt: string;
}

const defaultPetByPage: Record<string, number> = {
  panda: 1,
  eagles: 5,
  gorilla: 3,
  lemur: 2,
};

const knownPetVisuals: Record<number, SidebarVisual> = {
  1: {
    iconSrc: "../../../assets/icons/sidePanel_pandaBig.png",
    alt: "Panda",
  },
  2: {
    iconSrc: "../../../assets/icons/sidePanel_lemurBig.png",
    alt: "Lemur",
  },
  3: {
    iconSrc: "../../../assets/icons/sidePanel_gorillaBig.png",
    alt: "Gorilla",
  },
  5: {
    iconSrc: "../../../assets/icons/sidePanel_eagleBig.png",
    alt: "Eagles",
  },
};

const fallbackVisuals: ReadonlyArray<SidebarVisual> = [
  knownPetVisuals[1],
  knownPetVisuals[5],
  knownPetVisuals[3],
  knownPetVisuals[2],
];

const getCurrentPageKey = (): string => {
  const path = window.location.pathname.toLowerCase();
  if (path.includes("/eagles/")) return "eagles";
  if (path.includes("/gorilla/")) return "gorilla";
  if (path.includes("/lemur/")) return "lemur";
  return "panda";
};

const getActivePetId = (): number => {
  const fromQuery = Number.parseInt(new URLSearchParams(window.location.search).get("petId") ?? "", 10);
  if (!Number.isNaN(fromQuery) && fromQuery > 0) return fromQuery;

  const pageKey = getCurrentPageKey();
  return defaultPetByPage[pageKey] ?? 1;
};

const pickVisual = (petId: number, index: number): SidebarVisual => {
  if (knownPetVisuals[petId]) return knownPetVisuals[petId];
  return fallbackVisuals[index % fallbackVisuals.length];
};

const toSidebarItems = (cameras: ReadonlyArray<CameraItem>): string => {
  const activePetId = getActivePetId();

  const camerasWithLocalVisuals = cameras.filter((camera) => {
    const cameraPetId = typeof camera.petId === "number" ? camera.petId : -1;
    return Boolean(knownPetVisuals[cameraPetId]);
  });

  const itemsMarkup = camerasWithLocalVisuals
    .map((camera, index) => {
      const cameraPetId = typeof camera.petId === "number" ? camera.petId : index + 1;
      const text = typeof camera.text === "string" && camera.text.length > 0 ? camera.text : "Watch live animal cam";
      const visual = pickVisual(cameraPetId, index);
      const activeClass = cameraPetId === activePetId ? " zoos-sidebar__box--active" : "";

      return `
      <button type="button" class="zoos-sidebar__box${activeClass}" data-pet-id="${cameraPetId}" aria-label="${text}">
        <img src="${visual.iconSrc}" alt="${visual.alt}">
        <span class="zoos-sidebar__label">${text}</span>
      </button>`;
    })
    .join("");

  if (itemsMarkup.length === 0) {
    return `
      <p class="zoos-sidebar__status zoos-sidebar__status--error">
        Something went wrong. Please, refresh the page
      </p>
    `;
  }

  return `${itemsMarkup}<div class="zoos-sidebar__box zoos-sidebar__arrow-down">&#8964;</div>`;
};

const updateActiveItem = (container: HTMLElement, petId: number): void => {
  const boxes = container.querySelectorAll<HTMLElement>(".zoos-sidebar__box[data-pet-id]");
  boxes.forEach((box) => {
    const boxPetId = Number.parseInt(box.dataset.petId ?? "", 10);
    box.classList.toggle("zoos-sidebar__box--active", boxPetId === petId);
  });
};

const emitPetSelection = (petId: number): void => {
  window.dispatchEvent(
    new CustomEvent("zoo:select-pet", {
      detail: { petId },
    }),
  );
};

const renderLoader = (container: HTMLElement): void => {
  container.innerHTML = `
    <div class="zoos-sidebar__status" role="status" aria-live="polite">
      <div class="zoos-sidebar__loader" aria-hidden="true"></div>
    </div>
  `;
};

const renderError = (container: HTMLElement): void => {
  container.innerHTML = `
    <p class="zoos-sidebar__status zoos-sidebar__status--error">
      Something went wrong. Please, refresh the page
    </p>
  `;
};

const initZoosSidebarData = async (): Promise<void> => {
  const container = document.querySelector<HTMLElement>(".zoos-sidebar__animals");
  if (!container) return;

  renderLoader(container);

  try {
    const cameras = await getCameras();
    container.innerHTML = toSidebarItems(cameras);

    const activePetId = getActivePetId();
    updateActiveItem(container, activePetId);
    emitPetSelection(activePetId);

    const interactiveBoxes = container.querySelectorAll<HTMLElement>(".zoos-sidebar__box[data-pet-id]");
    interactiveBoxes.forEach((box) => {
      const petId = Number.parseInt(box.dataset.petId ?? "", 10);
      if (Number.isNaN(petId) || petId <= 0) return;

      const handleSelect = (): void => {
        updateActiveItem(container, petId);
        emitPetSelection(petId);
      };

      box.addEventListener("click", handleSelect);
      box.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handleSelect();
      });
    });
  } catch {
    renderError(container);
  }
};

void initZoosSidebarData();
