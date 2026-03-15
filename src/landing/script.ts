import { getFeedback, getPets, type ApiList, type FeedbackItem, type PetSummary } from "../api";

const POPUP_CARE_ID = "popup-care";
const POPUP_FORM_ID = "popup-donation-form";
const TOTAL_STEPS = 3;

const activationKeys: ReadonlySet<string> = new Set(["Enter", " "]);
const CITATION_ICON_SRC = "../../assets/icons/citation-icon.svg";
const DEFAULT_PET_LINK = "../zoos/panda/index.html";

interface PetVisualConfig {
  imageSrc: string;
  badge: string;
  link: string;
  imageAlt: string;
  nameHint: string;
}

interface PetCardData {
  name: string;
  description: string;
  imageSrc: string;
  badge: string;
  link: string;
  imageAlt: string;
}

interface FeedbackCardData {
  title: string;
  text: string;
  author: string;
}

const petVisualCatalog: ReadonlyArray<PetVisualConfig> = [
  {
    nameHint: "panda",
    imageSrc: "../../assets/images/1Panda.jpg",
    badge: "Lucas",
    link: "../zoos/panda/index.html",
    imageAlt: "Giant Panda eating bamboo",
  },
  {
    nameHint: "lemur",
    imageSrc: "../../assets/images/2Madagascarian Lemur.jpg",
    badge: "Andy",
    link: "../zoos/lemur/index.html",
    imageAlt: "Madagascarian Lemur sitting on a branch",
  },
  {
    nameHint: "gorilla",
    imageSrc: "../../assets/images/3Gorilla in Congo.jpg",
    badge: "Glen",
    link: "../zoos/gorilla/index.html",
    imageAlt: "Gorilla in its Congo habitat",
  },
  {
    nameHint: "alligator",
    imageSrc: "../../assets/images/4Alligator.jpg",
    badge: "Mike",
    link: "https://www.youtube.com/watch?v=chu7h09VIoU",
    imageAlt: "Chinese Alligator basking",
  },
  {
    nameHint: "eagle",
    imageSrc: "../../assets/images/5West End Bald Eagles.jpg",
    badge: "Sam & Lora",
    link: "../zoos/eagles/index.html",
    imageAlt: "West End Bald Eagles perched in a tree",
  },
  {
    nameHint: "koala",
    imageSrc: "../../assets/images/6Australian Koala.jpg",
    badge: "Liz",
    link: "https://www.youtube.com/watch?v=aRs5EN4epyE",
    imageAlt: "Australian Koala in a eucalyptus tree",
  },
  {
    nameHint: "tiger",
    imageSrc: "../../assets/images/7Sumatran Tiger.jpg",
    badge: "Senja",
    link: "https://www.youtube.com/watch?v=rpS9vMij3yE",
    imageAlt: "Sumatran Tiger in its habitat",
  },
  {
    nameHint: "lion",
    imageSrc: "../../assets/images/8African Lion.jpg",
    badge: "Shake",
    link: "https://www.youtube.com/watch?v=alWgeYnQd98",
    imageAlt: "African Lion in the savanna",
  },
];

const getPopup = (id: string): HTMLElement | null => document.getElementById(id);
const getCareTriggers = (): NodeListOf<HTMLElement> =>
  document.querySelectorAll<HTMLElement>('[data-popup="care"]');
const getFormTriggers = (): NodeListOf<HTMLElement> =>
  document.querySelectorAll<HTMLElement>('[data-popup="donation-form"]');

const getVisibleStep = (overlay: HTMLElement): HTMLElement | null =>
  overlay.querySelector<HTMLElement>(".donation-form__step:not([hidden])");

const setBodyScrollLocked = (locked: boolean): void => {
  document.body.style.overflow = locked ? "hidden" : "";
};

const parseStep = (value: string | undefined): number | null => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const getStringField = (source: unknown, keys: ReadonlyArray<string>): string | null => {
  if (!(typeof source === "object" && source !== null)) return null;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const toChunks = <TValue>(items: ReadonlyArray<TValue>, size: number): TValue[][] => {
  const chunks: TValue[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const pickPetVisual = (name: string, index: number): PetVisualConfig => {
  const loweredName = name.toLowerCase();
  const byName = petVisualCatalog.find((item) => loweredName.includes(item.nameHint));
  if (byName) return byName;
  return petVisualCatalog[index % petVisualCatalog.length];
};

const toPetCards = (pets: ApiList<PetSummary>): PetCardData[] => {
  const mapped = pets.map((pet, index) => {
    const petName = getStringField(pet, ["commonName", "title", "name"]) ?? `Animal ${index + 1}`;
    const badgeName = getStringField(pet, ["name"]) ?? pickPetVisual(petName, index).badge;
    const description =
      getStringField(pet, ["description", "about"]) ??
      "Watch this amazing animal live and learn more about wildlife.";
    const visual = pickPetVisual(petName, index);

    return {
      name: petName,
      description,
      imageSrc: visual.imageSrc,
      badge: badgeName,
      link: visual.link ?? DEFAULT_PET_LINK,
      imageAlt: visual.imageAlt,
    };
  });

  if (mapped.length > 0) return mapped;

  return petVisualCatalog.map((visual) => ({
    name: visual.nameHint.toUpperCase(),
    description: "Watch this amazing animal live and learn more about wildlife.",
    imageSrc: visual.imageSrc,
    badge: visual.badge,
    link: visual.link,
    imageAlt: visual.imageAlt,
  }));
};

const toFeedbackCards = (feedbackList: ApiList<FeedbackItem>): FeedbackCardData[] => {
  return feedbackList.map((item, index) => ({
    title: `${getStringField(item, ["city"]) ?? "Guest city"}, ${getStringField(item, ["month"]) ?? "Month"} ${getStringField(item, ["year"]) ?? ""}`.trim(),
    text:
      getStringField(item, ["text", "feedback", "message", "description"]) ??
      "Thank you for helping us improve your Online Zoo experience.",
    author: getStringField(item, ["name", "author", "user"]) ?? `Online Zoo visitor #${index + 1}`,
  }));
};

const renderPetsTrack = (cards: ReadonlyArray<PetCardData>): string => {
  const pages = toChunks(cards.slice(0, 16), 8);
  const preparedPages = pages.length > 0 ? pages.slice(0, 2) : [cards.slice(0, 8)];
  if (preparedPages.length === 1) {
    preparedPages.push(preparedPages[0]);
  }

  const slideMarkup = preparedPages
    .map((page) => {
      const rows = toChunks(page, 4);
      const firstRow = rows[0] ?? [];
      const secondRow = rows[1] ?? [];

      const renderRowCards = (rowCards: ReadonlyArray<PetCardData>): string =>
        rowCards
          .map(
            (card) => `
        <article class="pet-card" aria-label="${card.badge} the ${card.name}" data-link="${card.link}">
          <div class="pet-card__image">
            <img src="${card.imageSrc}" alt="${card.imageAlt}" width="478" height="436" loading="lazy">
            <span class="pet-card__badge">${card.badge}</span>
          </div>
          <div class="pet-card__info">
            <h3 class="pet-card__name">${card.name}</h3>
            <p class="pet-card__description">${card.description}</p>
          </div>
          <a href="${card.link}" class="pet-card__link" aria-label="View live camera for ${card.badge} the ${card.name}" tabindex="0">
            <span>View Live Cam</span>
            <svg width="28" height="25" viewBox="0 0 28 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M15.42 0L28 12.5L15.42 25H10.58L21.28 14.38H0V10.62H21.28L10.58 0H15.42Z" fill="#F58021"/>
            </svg>
          </a>
        </article>`,
          )
          .join("");

      return `
      <div class="pets__slide">
        <div class="pets__row" data-row="1">${renderRowCards(firstRow)}</div>
        <div class="pets__row" data-row="2">${renderRowCards(secondRow)}</div>
      </div>`;
    })
    .join("");

  return `<div class="pets__track">${slideMarkup}</div>`;
};

const renderTestimonialsTrack = (cards: ReadonlyArray<FeedbackCardData>): string => {
  const pages = toChunks(cards, 4);
  const preparedPages = pages.length > 0 ? pages : [cards.slice(0, 4)];
  if (preparedPages.length === 1) {
    preparedPages.push(preparedPages[0]);
  }

  const slides = preparedPages
    .map((page) => {
      const cardsMarkup = page
        .map(
          (card) => `
          <article class="testimonial-card">
            <div class="testimonial-card__icon" aria-hidden="true">
              <img src="${CITATION_ICON_SRC}" alt="" width="48" height="40" loading="lazy">
            </div>
            <h3 class="testimonial-card__title">${card.title}</h3>
            <p class="testimonial-card__text">${card.text}</p>
            <p class="testimonial-card__author">${card.author}</p>
          </article>`,
        )
        .join("");

      return `<div class="testimonials__slide"><div class="testimonials__grid" role="region" aria-label="User testimonials">${cardsMarkup}</div></div>`;
    })
    .join("");

  return `<div class="testimonials__track">${slides}</div>`;
};

const initInfiniteSlider = (
  trackSelector: string,
  slideSelector: string,
  prevSelector: string,
  nextSelector: string,
): void => {
  const track = document.querySelector<HTMLElement>(trackSelector);
  const slides = document.querySelectorAll<HTMLElement>(slideSelector);
  const prevButton = document.querySelector<HTMLElement>(prevSelector);
  const nextButton = document.querySelector<HTMLElement>(nextSelector);

  if (!track || slides.length === 0 || !prevButton || !nextButton) return;

  let currentSlide = 0;
  const totalSlides = slides.length;
  const stepPercent = 100 / totalSlides;

  // Override static two-slide CSS sizing so sliders can contain any number of pages.
  track.style.width = `${totalSlides * 100}%`;
  slides.forEach((slide) => {
    slide.style.flex = `0 0 ${100 / totalSlides}%`;
    slide.style.minWidth = `${100 / totalSlides}%`;
  });

  const update = (): void => {
    track.style.transform = `translateX(-${currentSlide * stepPercent}%)`;
    slides.forEach((slide, index) => {
      slide.setAttribute("aria-hidden", index === currentSlide ? "false" : "true");
    });
  };

  const handleNext = (): void => {
    currentSlide = (currentSlide + 1) % totalSlides;
    update();
  };

  const handlePrev = (): void => {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    update();
  };

  prevButton.addEventListener("click", handlePrev);
  nextButton.addEventListener("click", handleNext);

  prevButton.addEventListener("keydown", (event) => {
    if (!activationKeys.has(event.key)) return;
    event.preventDefault();
    handlePrev();
  });

  nextButton.addEventListener("keydown", (event) => {
    if (!activationKeys.has(event.key)) return;
    event.preventDefault();
    handleNext();
  });

  update();
};

const renderSectionLoader = (container: HTMLElement): void => {
  container.innerHTML = '<div class="section-loader" role="status" aria-live="polite" aria-label="Loading"></div>';
};

const renderSectionError = (container: HTMLElement): void => {
  container.innerHTML = '<p class="section-error">Something went wrong. Please, refresh the page</p>';
};

const openCarePopup = (): void => {
  const overlay = getPopup(POPUP_CARE_ID);
  if (!overlay) return;

  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-open");
  setBodyScrollLocked(true);

  const focusable = overlay.querySelector<HTMLElement>(
    "button, [href], input, [tabindex]:not([tabindex=\"-1\"])",
  );

  focusable?.focus();
};

const closeCarePopup = (): void => {
  const overlay = getPopup(POPUP_CARE_ID);
  if (!overlay) return;

  overlay.setAttribute("aria-hidden", "true");
  overlay.classList.remove("is-open");
  setBodyScrollLocked(false);
};

const closePetDropdown = (): void => {
  const trigger = document.getElementById("donation-pet-trigger");
  const dropdown = document.getElementById("donation-pet-dropdown");

  trigger?.setAttribute("aria-expanded", "false");
  dropdown?.classList.remove("is-open");
};

const setDonationStep = (step: number): void => {
  const overlay = getPopup(POPUP_FORM_ID);
  if (!overlay) return;

  const steps = overlay.querySelectorAll<HTMLElement>(".donation-form__step");
  const dots = overlay.querySelectorAll<HTMLElement>(".donation-form__step-dot");
  const backBtn = overlay.querySelector<HTMLButtonElement>(".donation-form__back");
  const nextBtn = overlay.querySelector<HTMLButtonElement>(".donation-form__next");
  const completeBtn = overlay.querySelector<HTMLButtonElement>(".donation-form__complete");

  steps.forEach((stepElement) => {
    const stepNumber = parseStep(stepElement.dataset.step);
    stepElement.hidden = stepNumber !== step;
  });

  dots.forEach((dot) => {
    const stepNumber = parseStep(dot.dataset.step);
    if (stepNumber === null) return;

    dot.classList.toggle("is-active", stepNumber <= step);
    if (stepNumber === step) {
      dot.setAttribute("aria-current", "step");
      return;
    }

    dot.removeAttribute("aria-current");
  });

  if (backBtn) backBtn.hidden = step === 1;
  if (nextBtn) nextBtn.hidden = step === TOTAL_STEPS;
  if (completeBtn) completeBtn.hidden = step !== TOTAL_STEPS;
};

const openDonationForm = (presetAmount: number | null): void => {
  const overlay = getPopup(POPUP_FORM_ID);
  if (!overlay) return;

  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-open");
  setBodyScrollLocked(true);

  setDonationStep(1);

  if (presetAmount !== null) {
    const presetAmountButton = overlay.querySelector<HTMLElement>(
      `.donation-form__amount-btn[data-amount="${presetAmount}"]`,
    );

    if (presetAmountButton) {
      overlay
        .querySelectorAll<HTMLElement>(".donation-form__amount-btn")
        .forEach((button) => button.classList.remove("is-selected"));
      presetAmountButton.classList.add("is-selected");
    }
  }

  const firstFocusable = overlay.querySelector<HTMLElement>(
    ".donation-form__amount-btn, .donation-form__input",
  );

  firstFocusable?.focus();
};

const closeDonationForm = (): void => {
  const overlay = getPopup(POPUP_FORM_ID);
  if (!overlay) return;

  overlay.setAttribute("aria-hidden", "true");
  overlay.classList.remove("is-open");
  setBodyScrollLocked(false);
  closePetDropdown();
};

const handleOverlayClick = (event: MouseEvent, popupId: string): void => {
  if (event.target !== event.currentTarget) return;

  if (popupId === POPUP_CARE_ID) {
    closeCarePopup();
    return;
  }

  if (popupId === POPUP_FORM_ID) {
    closeDonationForm();
  }
};

const handlePopupEscape = (event: KeyboardEvent): void => {
  if (event.key !== "Escape") return;

  const carePopup = getPopup(POPUP_CARE_ID);
  const donationPopup = getPopup(POPUP_FORM_ID);

  if (donationPopup?.getAttribute("aria-hidden") === "false") {
    const petDropdown = document.getElementById("donation-pet-dropdown");
    if (petDropdown?.classList.contains("is-open")) {
      closePetDropdown();
      return;
    }

    closeDonationForm();
    return;
  }

  if (carePopup?.getAttribute("aria-hidden") === "false") {
    closeCarePopup();
  }
};

const initCarePopup = (): void => {
  const overlay = getPopup(POPUP_CARE_ID);
  if (!overlay) return;

  overlay.querySelector<HTMLElement>(".popup__close")?.addEventListener("click", closeCarePopup);
  overlay.addEventListener("click", (event) => handleOverlayClick(event, POPUP_CARE_ID));

  getCareTriggers().forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openCarePopup();
    });
  });

  overlay.querySelectorAll<HTMLElement>(".popup__amount-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const amount = button.classList.contains("popup__amount-btn--other")
        ? null
        : parseStep(button.dataset.amount);

      closeCarePopup();
      openDonationForm(amount);
    });
  });
};

const initDonationForm = (): void => {
  const overlay = getPopup(POPUP_FORM_ID);
  if (!overlay) return;

  overlay
    .querySelector<HTMLElement>(".donation-form__close")
    ?.addEventListener("click", closeDonationForm);
  overlay.addEventListener("click", (event) => handleOverlayClick(event, POPUP_FORM_ID));

  overlay.querySelector<HTMLElement>(".donation-form__next")?.addEventListener("click", () => {
    const currentStepElement = getVisibleStep(overlay);
    const currentStep = parseStep(currentStepElement?.dataset.step);
    if (currentStep === null || currentStep >= TOTAL_STEPS) return;

    setDonationStep(currentStep + 1);
  });

  overlay.querySelector<HTMLElement>(".donation-form__back")?.addEventListener("click", () => {
    const currentStepElement = getVisibleStep(overlay);
    const currentStep = parseStep(currentStepElement?.dataset.step);
    if (currentStep === null || currentStep <= 1) return;

    setDonationStep(currentStep - 1);
  });

  overlay
    .querySelector<HTMLElement>(".donation-form__complete")
    ?.addEventListener("click", closeDonationForm);

  overlay.querySelectorAll<HTMLElement>(".donation-form__amount-btn").forEach((button) => {
    button.addEventListener("click", () => {
      overlay
        .querySelectorAll<HTMLElement>(".donation-form__amount-btn")
        .forEach((amountButton) => amountButton.classList.remove("is-selected"));
      button.classList.add("is-selected");
    });
  });

  const petTrigger = document.getElementById("donation-pet-trigger");
  const petDropdown = document.getElementById("donation-pet-dropdown");

  if (petTrigger && petDropdown) {
    petTrigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = petDropdown.classList.toggle("is-open");
      petTrigger.setAttribute("aria-expanded", String(isOpen));
    });

    petDropdown.querySelectorAll<HTMLLIElement>(".donation-form__pet-list li").forEach((item) => {
      item.addEventListener("click", () => {
        const petButtonText = petTrigger.querySelector<HTMLElement>(".donation-form__pet-btn-text");
        if (!petButtonText) return;

        petButtonText.textContent = item.textContent;
        petButtonText.style.color = "#000000";

        petDropdown
          .querySelectorAll<HTMLLIElement>("li")
          .forEach((listItem) => listItem.classList.remove("is-selected"));
        item.classList.add("is-selected");

        closePetDropdown();
      });
    });
  }

  document.addEventListener("click", (event: MouseEvent) => {
    if (!petDropdown?.classList.contains("is-open")) return;

    const targetNode = event.target;
    if (!(targetNode instanceof Node)) return;

    const wrap = petTrigger?.closest(".donation-form__pet-select-wrap");
    if (!wrap?.contains(targetNode) && !petDropdown.contains(targetNode)) {
      closePetDropdown();
    }
  });

  petDropdown?.addEventListener("click", (event) => event.stopPropagation());
};

const initPetsSlider = async (): Promise<void> => {
  const slider = document.querySelector<HTMLElement>(".pets__slider");
  if (!slider) return;

  renderSectionLoader(slider);

  try {
    const pets = await getPets();
    const cards = toPetCards(pets);
    slider.innerHTML = renderPetsTrack(cards);
    initInfiniteSlider(".pets__track", ".pets__slide", ".pets__arrow--prev", ".pets__arrow--next");
    initPetCardLinks();
  } catch {
    renderSectionError(slider);
  }
};

const initTestimonialsSlider = async (): Promise<void> => {
  const slider = document.querySelector<HTMLElement>(".testimonials__slider");
  if (!slider) return;

  renderSectionLoader(slider);

  try {
    const feedbackList = await getFeedback();
    const cards = toFeedbackCards(feedbackList);
    slider.innerHTML = renderTestimonialsTrack(cards);
    initInfiniteSlider(
      ".testimonials__track",
      ".testimonials__slide",
      ".testimonials__arrow--prev",
      ".testimonials__arrow--next",
    );
  } catch {
    renderSectionError(slider);
  }
};

const initHamburger = (): void => {
  const hamburger = document.querySelector<HTMLElement>(".nav__hamburger");
  const overlay = document.getElementById("nav-overlay");
  const closeButton = overlay?.querySelector<HTMLElement>(".nav-overlay__close");
  const overlayLinks = overlay?.querySelectorAll<HTMLElement>(".nav-overlay__link");

  if (!hamburger || !overlay) return;

  const openMenu = (): void => {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    hamburger.setAttribute("aria-expanded", "true");
    hamburger.setAttribute("aria-label", "Close menu");
    setBodyScrollLocked(true);
  };

  const closeMenu = (): void => {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    hamburger.setAttribute("aria-expanded", "false");
    hamburger.setAttribute("aria-label", "Open menu");
    setBodyScrollLocked(false);
  };

  hamburger.addEventListener("click", () => {
    if (overlay.classList.contains("is-open")) {
      closeMenu();
      return;
    }

    openMenu();
  });

  closeButton?.addEventListener("click", closeMenu);
  overlayLinks?.forEach((link) => link.addEventListener("click", closeMenu));

  overlay.addEventListener("click", (event) => {
    if (event.target !== overlay) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !overlay.classList.contains("is-open")) return;
    closeMenu();
  });
};

const initDonationBanner = (): void => {
  const form = document.querySelector<HTMLFormElement>(".donation-banner__form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const input = form.querySelector<HTMLInputElement>(".donation-banner__input");
    const rawValue = input?.value.trim().replace(/[$,]/g, "") ?? "";
    const parsedAmount = Number.parseInt(rawValue, 10);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      openCarePopup();
      return;
    }

    openDonationForm(parsedAmount);
  });
};

const initPetCardLinks = (): void => {
  const cards = document.querySelectorAll<HTMLElement>(".pet-card[data-link]");

  cards.forEach((card) => {
    const url = card.getAttribute("data-link");
    if (!url) return;

    const handleNavigate = (): void => {
      window.location.href = url;
    };

    card.addEventListener("click", handleNavigate);
    card.addEventListener("keydown", (event) => {
      if (!activationKeys.has(event.key)) return;
      event.preventDefault();
      handleNavigate();
    });

    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "link");
  });
};

const initZoosSidebar = (): void => {
  const sidebar = document.querySelector<HTMLElement>(".zoos-sidebar");
  if (!sidebar) return;

  const collapseButton = sidebar.querySelector<HTMLElement>(".zoos-sidebar__collapse");

  const toggleSidebar = (): void => {
    const isOpen = sidebar.classList.toggle("open");
    if (collapseButton) {
      collapseButton.textContent = isOpen ? "\u00AB" : "\u00BB";
    }
  };

  sidebar.addEventListener("click", (event) => {
    if (sidebar.classList.contains("open")) return;
    event.preventDefault();
    toggleSidebar();
  });

  if (!collapseButton) return;

  collapseButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSidebar();
  });

  collapseButton.addEventListener("keydown", (event) => {
    if (!activationKeys.has(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    toggleSidebar();
  });
};

const init = (): void => {
  initCarePopup();
  initDonationForm();
  void initPetsSlider();
  void initTestimonialsSlider();
  initDonationBanner();
  initHamburger();
  initZoosSidebar();
  initPetCardLinks();
};

getFormTriggers().forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    openDonationForm(null);
  });
});

document.addEventListener("keydown", handlePopupEscape);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
