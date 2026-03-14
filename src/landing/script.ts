const POPUP_CARE_ID = "popup-care";
const POPUP_FORM_ID = "popup-donation-form";
const TOTAL_STEPS = 3;

const activationKeys: ReadonlySet<string> = new Set(["Enter", " "]);

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

const initPetsSlider = (): void => {
  if (window.innerWidth <= 640) return;

  const prevButton = document.querySelector<HTMLElement>(".pets__arrow--prev");
  const nextButton = document.querySelector<HTMLElement>(".pets__arrow--next");
  const track = document.querySelector<HTMLElement>(".pets__track");
  const firstSlide = document.querySelector<HTMLElement>(".pets__slide:not(.pets__slide--mirrored)");
  const mirroredSlide = document.querySelector<HTMLElement>(".pets__slide--mirrored");
  const firstRow = document.querySelector<HTMLElement>('.pets__row[data-row="1"]');
  const secondRow = document.querySelector<HTMLElement>('.pets__row[data-row="2"]');

  if (!prevButton || !nextButton || !track || !mirroredSlide || !firstRow || !secondRow) return;

  mirroredSlide.appendChild(secondRow.cloneNode(true));
  mirroredSlide.appendChild(firstRow.cloneNode(true));

  let currentSlide = 0;
  const totalSlides = 2;

  const updateSlider = (): void => {
    track.style.transform = `translateX(-${currentSlide * 50}%)`;
    mirroredSlide.setAttribute("aria-hidden", currentSlide === 0 ? "true" : "false");
    firstSlide?.setAttribute("aria-hidden", currentSlide === 1 ? "true" : "false");
  };

  const handlePrevious = (): void => {
    if (currentSlide <= 0) return;
    currentSlide -= 1;
    updateSlider();
  };

  const handleNext = (): void => {
    if (currentSlide >= totalSlides - 1) return;
    currentSlide += 1;
    updateSlider();
  };

  prevButton.addEventListener("click", handlePrevious);
  nextButton.addEventListener("click", handleNext);

  prevButton.addEventListener("keydown", (event) => {
    if (!activationKeys.has(event.key)) return;
    event.preventDefault();
    handlePrevious();
  });

  nextButton.addEventListener("keydown", (event) => {
    if (!activationKeys.has(event.key)) return;
    event.preventDefault();
    handleNext();
  });

  updateSlider();
};

const initTestimonialsSlider = (): void => {
  if (window.innerWidth <= 640) return;

  const prevButton = document.querySelector<HTMLElement>(".testimonials__arrow--prev");
  const nextButton = document.querySelector<HTMLElement>(".testimonials__arrow--next");
  const track = document.querySelector<HTMLElement>(".testimonials__track");
  const slides = document.querySelectorAll<HTMLElement>(".testimonials__slide");

  if (!prevButton || !nextButton || !track || slides.length === 0) return;

  let currentSlide = 0;
  const totalSlides = slides.length;

  const updateSlider = (): void => {
    track.style.transform = `translateX(-${currentSlide * 50}%)`;
    slides.forEach((slide, index) => {
      slide.setAttribute("aria-hidden", index !== currentSlide ? "true" : "false");
    });
    prevButton.setAttribute("aria-disabled", currentSlide === 0 ? "true" : "false");
    nextButton.setAttribute("aria-disabled", currentSlide === totalSlides - 1 ? "true" : "false");
  };

  const handlePrevious = (): void => {
    if (currentSlide <= 0) return;
    currentSlide -= 1;
    updateSlider();
  };

  const handleNext = (): void => {
    if (currentSlide >= totalSlides - 1) return;
    currentSlide += 1;
    updateSlider();
  };

  prevButton.addEventListener("click", handlePrevious);
  nextButton.addEventListener("click", handleNext);

  prevButton.addEventListener("keydown", (event) => {
    if (!activationKeys.has(event.key)) return;
    event.preventDefault();
    handlePrevious();
  });

  nextButton.addEventListener("keydown", (event) => {
    if (!activationKeys.has(event.key)) return;
    event.preventDefault();
    handleNext();
  });

  updateSlider();
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
  initPetsSlider();
  initTestimonialsSlider();
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
