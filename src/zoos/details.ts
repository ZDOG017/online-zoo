import { getPetById, type PetDetails } from "../api";

interface InfoImageConfig {
  src: string;
  alt: string;
}

interface CamVisualConfig {
  playerPoster: string;
  cardPoster: string;
  streamUrl: string;
  playerLabel: string;
}

const infoImages: Record<number, InfoImageConfig> = {
  1: { src: new URL("../../online-zoo/assets/images/panda-info.jpg", import.meta.url).href, alt: "Giant Panda" },
  2: { src: new URL("../../online-zoo/assets/images/lemur-info.jpg", import.meta.url).href, alt: "Madagascarian Lemur" },
  3: { src: new URL("../../online-zoo/assets/images/gorilla-info.jpg", import.meta.url).href, alt: "Gorilla in Congo" },
  5: {
    src: new URL("../../online-zoo/assets/images/eagles-info.jpg", import.meta.url).href,
    alt: "West End Bald Eagles",
  },
};

const camVisuals: Record<number, CamVisualConfig> = {
  1: {
    playerPoster: new URL("../../online-zoo/assets/images/Panda live.jpg", import.meta.url).href,
    cardPoster: new URL("../../online-zoo/assets/images/Panda live.jpg", import.meta.url).href,
    streamUrl: "https://www.youtube.com/watch?v=YMOYM1YZ97o",
    playerLabel: "Lucas, the Giant Panda cam 1",
  },
  2: {
    playerPoster: new URL("../../online-zoo/assets/images/lemur live.jpg", import.meta.url).href,
    cardPoster: new URL("../../online-zoo/assets/images/lemur live.jpg", import.meta.url).href,
    streamUrl: "https://www.youtube.com/watch?v=8Pj-YEQbojk",
    playerLabel: "Andy, the Madagascarian Lemur cam 1",
  },
  3: {
    playerPoster: new URL("../../online-zoo/assets/images/Gorilla live.jpg", import.meta.url).href,
    cardPoster: new URL("../../online-zoo/assets/images/Gorilla live.jpg", import.meta.url).href,
    streamUrl: "https://www.youtube.com/watch?v=rgXWDk7rh4w",
    playerLabel: "Glen, the Gorilla cam 1",
  },
  5: {
    playerPoster: new URL("../../online-zoo/assets/images/Eagles live.jpg", import.meta.url).href,
    cardPoster: new URL("../../online-zoo/assets/images/Eagles live.jpg", import.meta.url).href,
    streamUrl: "https://www.youtube.com/watch?v=LuS9f8lKEw8",
    playerLabel: "Sam & Lora, the Bald Eagles cam 1",
  },
};

const DETAIL_ERROR_TEXT = "Something went wrong. Please, refresh the page";
const LEAFLET_CSS_ID = "leaflet-css";
const LEAFLET_SCRIPT_ID = "leaflet-script";
const LEAFLET_SCRIPT_SRC = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS_HREF = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const MAP_CONTAINER_ID = "zoos-leaflet-map";

let requestKey = 0;
let activeCoordinates: { lat: number; lng: number; label: string } | null = null;
let leafletLoader: Promise<void> | null = null;
let leafletMap: LeafletMapLike | null = null;
let leafletMarker: LeafletMarkerLike | null = null;

interface LeafletMarkerLike {
  addTo(map: LeafletMapLike): LeafletMarkerLike;
  bindPopup(content: string): LeafletMarkerLike;
  setLatLng(coordinates: [number, number]): LeafletMarkerLike;
  setPopupContent(content: string): LeafletMarkerLike;
  openPopup(): LeafletMarkerLike;
}

interface LeafletMapLike {
  setView(coordinates: [number, number], zoom: number): LeafletMapLike;
  invalidateSize(): void;
  remove(): void;
}

interface LeafletLike {
  map(container: HTMLElement): LeafletMapLike;
  tileLayer(
    template: string,
    options: {
      attribution: string;
      maxZoom?: number;
    },
  ): { addTo(map: LeafletMapLike): void };
  marker(coordinates: [number, number]): LeafletMarkerLike;
}

declare global {
  interface Window {
    L?: LeafletLike;
  }
}

const parseCoordinate = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)°?\s*([NSEW])$/i);
  if (!match) {
    const rawNumber = Number.parseFloat(value);
    return Number.isNaN(rawNumber) ? null : rawNumber;
  }

  const magnitude = Number.parseFloat(match[1]);
  if (Number.isNaN(magnitude)) return null;

  const direction = match[2].toUpperCase();
  if (direction === "S" || direction === "W") return -magnitude;
  return magnitude;
};

const getPetName = (pet: PetDetails): string =>
  (typeof pet.commonName === "string" && pet.commonName.length > 0 ? pet.commonName : "") ||
  (typeof pet.name === "string" && pet.name.length > 0 ? pet.name : "") ||
  "Animal";

const getField = (value: unknown, fallback = "Unknown"): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;

const getOverlay = (): HTMLElement | null => document.querySelector<HTMLElement>(".zoos-detail-overlay");

const ensureDetailOverlay = (): void => {
  if (document.querySelector(".zoos-detail-overlay")) return;

  const main = document.querySelector<HTMLElement>(".zoos-main");
  if (!main) return;

  const overlay = document.createElement("div");
  overlay.className = "zoos-detail-overlay";
  overlay.hidden = true;
  overlay.innerHTML = '<div class="zoos-detail-overlay__loader" aria-hidden="true"></div>';
  main.append(overlay);
};

const ensureMapModal = (): void => {
  if (document.querySelector(".zoos-map-modal")) return;

  const modal = document.createElement("div");
  modal.className = "zoos-map-modal";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Pet habitat map");
  modal.innerHTML = `
    <div class="zoos-map-modal__panel">
      <button type="button" class="zoos-map-modal__close" aria-label="Close map">×</button>
      <div id="${MAP_CONTAINER_ID}" class="zoos-map-modal__frame" aria-label="Pet habitat map"></div>
    </div>
  `;

  document.body.append(modal);
};

const showOverlay = (): void => {
  const overlay = getOverlay();
  if (!overlay) return;
  overlay.hidden = false;
};

const hideOverlay = (): void => {
  const overlay = getOverlay();
  if (!overlay) return;
  overlay.hidden = true;
};

const renderError = (): void => {
  const didYouKnowText = document.querySelector<HTMLElement>(".zoos-did-you-know__text");
  if (didYouKnowText) {
    didYouKnowText.textContent = DETAIL_ERROR_TEXT;
  }
};

const setInfoValue = (label: string, value: string): void => {
  const rows = document.querySelectorAll<HTMLElement>(".zoos-info__row");
  rows.forEach((row) => {
    const term = row.querySelector<HTMLElement>("dt");
    const description = row.querySelector<HTMLElement>("dd");
    if (!term || !description) return;
    if (term.textContent?.trim().toLowerCase() !== label.toLowerCase()) return;
    description.textContent = value;
  });
};

const updateMapButtonMetadata = (pet: PetDetails): void => {
  const button = document.querySelector<HTMLElement>(".zoos-info__map-btn");
  if (!button) return;

  const lat = parseCoordinate(typeof pet.latitude === "string" ? pet.latitude : undefined);
  const lng = parseCoordinate(typeof pet.longitude === "string" ? pet.longitude : undefined);
  const label = getPetName(pet);

  if (lat === null || lng === null) {
    activeCoordinates = null;
    button.setAttribute("aria-disabled", "true");
    button.classList.add("zoos-info__map-btn--disabled");
    return;
  }

  activeCoordinates = { lat, lng, label };
  button.setAttribute("aria-disabled", "false");
  button.classList.remove("zoos-info__map-btn--disabled");
};

const updatePetDetails = (pet: PetDetails): void => {
  const petName = getPetName(pet);

  const camsTitle = document.querySelector<HTMLElement>(".zoos-cams__title");
  if (camsTitle) camsTitle.textContent = `Live ${petName} Cams`;

  const infoSection = document.querySelector<HTMLElement>(".zoos-info");
  if (infoSection) infoSection.setAttribute("aria-label", `${petName} information`);

  const didYouKnowText = document.querySelector<HTMLElement>(".zoos-did-you-know__text");
  if (didYouKnowText) didYouKnowText.textContent = getField(pet.description);

  const paragraph = document.querySelector<HTMLElement>(".zoos-info__paragraph");
  if (paragraph) paragraph.textContent = getField(pet.detailedDescription, getField(pet.description));

  setInfoValue("Common name:", getField(pet.commonName, petName));
  setInfoValue("Scientific name:", getField(pet.scientificName));
  setInfoValue("Type:", getField(pet.type));
  setInfoValue("Size:", getField(pet.size));
  setInfoValue("Diet:", getField(pet.diet));
  setInfoValue("Habitat:", getField(pet.habitat));
  setInfoValue("Range:", getField(pet.range));

  const image = document.querySelector<HTMLImageElement>(".zoos-info__image");
  if (image) {
    const mappedImage = infoImages[pet.id] ?? infoImages[1];
    image.src = mappedImage.src;
    image.alt = getField(pet.commonName, mappedImage.alt);
  }

  updateMapButtonMetadata(pet);
};

const updateCamVisuals = (pet: PetDetails): void => {
  const visual = camVisuals[pet.id] ?? camVisuals[1];

  const playerLabel = document.querySelector<HTMLElement>(".zoos-cams__player-label");
  if (playerLabel) {
    playerLabel.textContent = visual.playerLabel;
  }

  const mainWrap = document.querySelector<HTMLAnchorElement>(".zoos-cams__video-wrap");
  if (mainWrap) {
    mainWrap.href = visual.streamUrl;
    mainWrap.setAttribute("aria-label", `Watch ${visual.playerLabel} on YouTube`);
  }

  const mainVideo = document.querySelector<HTMLVideoElement>(".zoos-cams__video");
  if (mainVideo) {
    mainVideo.poster = visual.playerPoster;
    mainVideo.setAttribute("aria-label", `Preview of ${visual.playerLabel}`);
  }

  const cardLinks = document.querySelectorAll<HTMLAnchorElement>(".zoos-cams__card");
  cardLinks.forEach((card, index) => {
    card.href = visual.streamUrl;
    card.setAttribute("aria-label", `Cam ${index + 1} for ${getPetName(pet)}`);

    const cardImage = card.querySelector<HTMLImageElement>(".zoos-cams__card-image img");
    if (cardImage) {
      cardImage.src = visual.cardPoster;
      cardImage.alt = `${getPetName(pet)} cam ${index + 1}`;
    }
  });
};

const fetchAndRenderPet = async (petId: number): Promise<void> => {
  requestKey += 1;
  const currentRequestKey = requestKey;
  showOverlay();

  try {
    const pet = await getPetById(petId);
    if (currentRequestKey !== requestKey) return;
    updatePetDetails(pet);
    updateCamVisuals(pet);
  } catch {
    if (currentRequestKey !== requestKey) return;
    renderError();
  } finally {
    if (currentRequestKey === requestKey) {
      hideOverlay();
    }
  }
};

const ensureLeafletCss = (): void => {
  if (document.getElementById(LEAFLET_CSS_ID)) return;

  const link = document.createElement("link");
  link.id = LEAFLET_CSS_ID;
  link.rel = "stylesheet";
  link.href = LEAFLET_CSS_HREF;
  link.crossOrigin = "";
  document.head.append(link);
};

const loadLeaflet = async (): Promise<void> => {
  if (window.L) return;
  if (leafletLoader) return leafletLoader;

  ensureLeafletCss();

  leafletLoader = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(LEAFLET_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Leaflet script")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = LEAFLET_SCRIPT_ID;
    script.src = LEAFLET_SCRIPT_SRC;
    script.async = true;
    script.crossOrigin = "";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Failed to load Leaflet script")), { once: true });
    document.body.append(script);
  });

  return leafletLoader;
};

const initOrUpdateMap = (lat: number, lng: number, label: string): void => {
  const container = document.getElementById(MAP_CONTAINER_ID);
  const leaflet = window.L;
  if (!container || !leaflet) return;

  if (!leafletMap) {
    leafletMap = leaflet.map(container).setView([lat, lng], 5);
    leaflet
      .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      })
      .addTo(leafletMap);
    leafletMarker = leaflet.marker([lat, lng]).addTo(leafletMap).bindPopup(label);
  } else {
    leafletMap.setView([lat, lng], 5);
    leafletMarker?.setLatLng([lat, lng]).setPopupContent(label);
  }

  leafletMarker?.openPopup();
  window.setTimeout(() => {
    leafletMap?.invalidateSize();
  }, 0);
};

const openMapModal = (): void => {
  const modal = document.querySelector<HTMLElement>(".zoos-map-modal");
  if (!modal || !activeCoordinates) return;

  modal.hidden = false;
  document.body.style.overflow = "hidden";

  void loadLeaflet()
    .then(() => {
      if (!activeCoordinates) return;
      initOrUpdateMap(activeCoordinates.lat, activeCoordinates.lng, activeCoordinates.label);
    })
    .catch(() => {
      modal.hidden = true;
      document.body.style.overflow = "";
    });
};

const closeMapModal = (): void => {
  const modal = document.querySelector<HTMLElement>(".zoos-map-modal");
  if (!modal) return;

  modal.hidden = true;
  document.body.style.overflow = "";
};

const initMapModal = (): void => {
  const mapButton = document.querySelector<HTMLAnchorElement>(".zoos-info__map-btn");
  const modal = document.querySelector<HTMLElement>(".zoos-map-modal");
  const closeButton = modal?.querySelector<HTMLElement>(".zoos-map-modal__close");
  if (!mapButton || !modal || !closeButton) return;

  mapButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (mapButton.getAttribute("aria-disabled") === "true") return;
    openMapModal();
  });

  closeButton.addEventListener("click", closeMapModal);

  modal.addEventListener("click", (event) => {
    if (event.target !== modal) return;
    closeMapModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (modal.hidden) return;
    closeMapModal();
  });
};

const initPetSelectionListener = (): void => {
  window.addEventListener("zoo:select-pet", (event: Event) => {
    const customEvent = event as CustomEvent<{ petId?: number }>;
    const petId = customEvent.detail?.petId;
    if (typeof petId !== "number" || petId <= 0) return;
    void fetchAndRenderPet(petId);
  });
};

const init = (): void => {
  if (!document.querySelector(".zoos-main")) return;
  ensureDetailOverlay();
  ensureMapModal();
  initMapModal();
  initPetSelectionListener();
};

init();
