import { createDonation, getFeedback, getPets, type ApiList, type FeedbackItem, type PetSummary } from "../api";
import { getCurrentUser, isLoggedIn } from "../auth";

const POPUP_CARE_ID = "popup-care";
const POPUP_FORM_ID = "popup-donation-form";
const TOTAL_STEPS = 3;

const activationKeys: ReadonlySet<string> = new Set(["Enter", " "]);
const CITATION_ICON_SRC = new URL("../../online-zoo/assets/icons/citation-icon.svg", import.meta.url).href;
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

interface SavedDonationCard {
  id: string;
  label: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

interface DonationFormState {
  amount: number | null;
  petId: number | null;
  petName: string;
  isSubmitting: boolean;
}

const DONATION_CARD_STORAGE_PREFIX = "online-zoo:donation:cards:";
const PET_ID_BY_SLUG: Record<string, number> = {
  lukas: 1,
  andy: 2,
  glen: 3,
  mike: 4,
  "sam-lora": 5,
  liz: 6,
  shake: 7,
  senja: 8,
};

const petVisualCatalog: ReadonlyArray<PetVisualConfig> = [
  {
    nameHint: "panda",
    imageSrc: new URL("../../online-zoo/assets/images/1Panda.jpg", import.meta.url).href,
    badge: "Lucas",
    link: "../zoos/panda/index.html",
    imageAlt: "Giant Panda eating bamboo",
  },
  {
    nameHint: "lemur",
    imageSrc: new URL("../../online-zoo/assets/images/2Madagascarian Lemur.jpg", import.meta.url).href,
    badge: "Andy",
    link: "../zoos/lemur/index.html",
    imageAlt: "Madagascarian Lemur sitting on a branch",
  },
  {
    nameHint: "gorilla",
    imageSrc: new URL("../../online-zoo/assets/images/3Gorilla in Congo.jpg", import.meta.url).href,
    badge: "Glen",
    link: "../zoos/gorilla/index.html",
    imageAlt: "Gorilla in its Congo habitat",
  },
  {
    nameHint: "alligator",
    imageSrc: new URL("../../online-zoo/assets/images/4Alligator.jpg", import.meta.url).href,
    badge: "Mike",
    link: "https://www.youtube.com/watch?v=chu7h09VIoU",
    imageAlt: "Chinese Alligator basking",
  },
  {
    nameHint: "eagle",
    imageSrc: new URL("../../online-zoo/assets/images/5West End Bald Eagles.jpg", import.meta.url).href,
    badge: "Sam & Lora",
    link: "../zoos/eagles/index.html",
    imageAlt: "West End Bald Eagles perched in a tree",
  },
  {
    nameHint: "koala",
    imageSrc: new URL("../../online-zoo/assets/images/6Australian Koala.jpg", import.meta.url).href,
    badge: "Liz",
    link: "https://www.youtube.com/watch?v=aRs5EN4epyE",
    imageAlt: "Australian Koala in a eucalyptus tree",
  },
  {
    nameHint: "tiger",
    imageSrc: new URL("../../online-zoo/assets/images/7Sumatran Tiger.jpg", import.meta.url).href,
    badge: "Senja",
    link: "https://www.youtube.com/watch?v=rpS9vMij3yE",
    imageAlt: "Sumatran Tiger in its habitat",
  },
  {
    nameHint: "lion",
    imageSrc: new URL("../../online-zoo/assets/images/8African Lion.jpg", import.meta.url).href,
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

const parsePositiveAmount = (rawValue: string): number | null => {
  const normalized = rawValue.trim().replaceAll(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
};

const isValidDonorName = (value: string): boolean => {
  const normalized = value.trim();
  return normalized.length > 0 && /^[A-Za-z ]+$/.test(normalized);
};

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const normalizeCardDigits = (value: string): string => value.replace(/\D/g, "");

const formatCardNumber = (value: string): string => {
  const digits = normalizeCardDigits(value).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
};

const isValidCardNumber = (value: string): boolean => normalizeCardDigits(value).length === 16;

const formatExpiry = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const isValidExpiry = (value: string): boolean => {
  const match = value.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;

  const month = Number.parseInt(match[1], 10);
  const year = Number.parseInt(match[2], 10);
  if (month < 1 || month > 12) return false;

  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
};

const isValidCvv = (value: string): boolean => /^\d{3}$/.test(value);

const safeReadStorage = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeWriteStorage = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
};

const getCardStorageKey = (email: string): string =>
  `${DONATION_CARD_STORAGE_PREFIX}${email.trim().toLowerCase()}`;

const toCardLabel = (cardNumber: string): string => {
  const digits = normalizeCardDigits(cardNumber);
  if (digits.length !== 16) return "Saved card";
  return `${digits.slice(0, 4)} **** **** ${digits.slice(12)}`;
};

const readSavedCards = (email: string): SavedDonationCard[] => {
  if (!email.trim()) return [];
  const raw = safeReadStorage(getCardStorageKey(email));
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedDonationCard => {
      if (typeof item !== "object" || item === null) return false;
      const record = item as Record<string, unknown>;
      return (
        typeof record.id === "string" &&
        typeof record.label === "string" &&
        typeof record.cardNumber === "string" &&
        typeof record.expiry === "string" &&
        typeof record.cvv === "string"
      );
    });
  } catch {
    return [];
  }
};

const writeSavedCards = (email: string, cards: ReadonlyArray<SavedDonationCard>): void => {
  if (!email.trim()) return;
  safeWriteStorage(getCardStorageKey(email), JSON.stringify(cards));
};

const upsertSavedCard = (
  email: string,
  cardNumber: string,
  expiry: string,
  cvv: string,
): SavedDonationCard[] => {
  const normalizedDigits = normalizeCardDigits(cardNumber);
  if (normalizedDigits.length !== 16) return readSavedCards(email);

  const currentCards = readSavedCards(email);
  const cardId = `${normalizedDigits.slice(0, 6)}-${normalizedDigits.slice(12)}-${expiry}`;
  const nextCard: SavedDonationCard = {
    id: cardId,
    label: toCardLabel(normalizedDigits),
    cardNumber: normalizedDigits,
    expiry,
    cvv,
  };

  const withoutCurrent = currentCards.filter((card) => card.id !== cardId);
  const updatedCards = [nextCard, ...withoutCurrent];
  writeSavedCards(email, updatedCards);
  return updatedCards;
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
  overlay.dispatchEvent(new CustomEvent("donation:open", { detail: { presetAmount } }));

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

  const nextButton = overlay.querySelector<HTMLButtonElement>(".donation-form__next");
  const backButton = overlay.querySelector<HTMLButtonElement>(".donation-form__back");
  const completeButton = overlay.querySelector<HTMLButtonElement>(".donation-form__complete");
  const petTrigger = document.getElementById("donation-pet-trigger");
  const petTriggerText = petTrigger?.querySelector<HTMLElement>(".donation-form__pet-btn-text") ?? null;
  const petDropdown = document.getElementById("donation-pet-dropdown");
  const otherButton = overlay.querySelector<HTMLButtonElement>(".donation-form__other-btn");
  const amountButtons = overlay.querySelectorAll<HTMLButtonElement>(".donation-form__amount-btn");
  const amountInput = overlay.querySelector<HTMLInputElement>(".donation-form__input--amount");
  const nameInput = overlay.querySelector<HTMLInputElement>(
    '.donation-form__step[data-step="2"] .donation-form__input--full:nth-of-type(1)',
  );
  const emailInput = overlay.querySelector<HTMLInputElement>(
    '.donation-form__step[data-step="2"] .donation-form__input--full:nth-of-type(2)',
  );
  const cardInput = overlay.querySelector<HTMLInputElement>("#donation-card");
  const cvvInput = overlay.querySelector<HTMLInputElement>("#donation-cvv");
  const expiryWraps = overlay.querySelectorAll<HTMLElement>(
    '.donation-form__step[data-step="3"] .donation-form__select-wrap',
  );
  const expiryInput = expiryWraps[0]?.querySelector<HTMLInputElement>(".donation-form__input--select") ?? null;
  const paymentSection = overlay.querySelector<HTMLElement>(
    '.donation-form__step[data-step="3"] .donation-form__section--payment',
  );
  const footer = overlay.querySelector<HTMLElement>(".donation-form__footer");

  if (
    !nextButton ||
    !backButton ||
    !completeButton ||
    !petTrigger ||
    !petTriggerText ||
    !petDropdown ||
    !otherButton ||
    !amountInput ||
    !nameInput ||
    !emailInput ||
    !cardInput ||
    !cvvInput ||
    !expiryInput ||
    !paymentSection ||
    !footer
  ) {
    return;
  }

  const statusMessage = document.createElement("p");
  statusMessage.className = "donation-form__status";
  statusMessage.setAttribute("aria-live", "polite");
  statusMessage.hidden = true;
  footer.insertAdjacentElement("beforebegin", statusMessage);

  const savedCardsBlock = document.createElement("div");
  savedCardsBlock.className = "donation-form__saved-cards";
  savedCardsBlock.hidden = true;
  savedCardsBlock.innerHTML = `
    <label class="donation-form__label" for="donation-saved-cards">Saved cards</label>
    <select id="donation-saved-cards" class="donation-form__input donation-form__input--full donation-form__saved-select">
      <option value="">Choose a saved card</option>
    </select>
  `;
  paymentSection.insertAdjacentElement("afterbegin", savedCardsBlock);

  const savedCardsSelect = savedCardsBlock.querySelector<HTMLSelectElement>("#donation-saved-cards");
  if (!savedCardsSelect) return;

  const saveCardRow = document.createElement("label");
  saveCardRow.className = "donation-form__checkbox-label donation-form__checkbox-label--save-card";
  saveCardRow.hidden = true;
  saveCardRow.innerHTML = `
    <input type="checkbox" class="donation-form__checkbox donation-form__save-card-checkbox">
    <span>Save card info for future donations</span>
  `;
  paymentSection.append(saveCardRow);

  const saveCardCheckbox = saveCardRow.querySelector<HTMLInputElement>(".donation-form__save-card-checkbox");
  if (!saveCardCheckbox) return;

  if (expiryWraps[1]) {
    expiryWraps[1].style.display = "none";
  }
  expiryInput.removeAttribute("readonly");
  expiryInput.placeholder = "MM/YY";
  expiryInput.setAttribute("maxlength", "5");
  expiryInput.setAttribute("inputmode", "numeric");
  expiryInput.setAttribute("aria-label", "Expiration date MM slash YY");

  cvvInput.setAttribute("maxlength", "3");
  cvvInput.setAttribute("inputmode", "numeric");
  cardInput.setAttribute("maxlength", "19");
  cardInput.setAttribute("inputmode", "numeric");

  const state: DonationFormState = {
    amount: null,
    petId: null,
    petName: "",
    isSubmitting: false,
  };

  let activeSavedCards: SavedDonationCard[] = [];

  const setFieldInvalid = (field: HTMLElement, invalid: boolean): void => {
    field.classList.toggle("is-invalid", invalid);
    if (field instanceof HTMLInputElement) {
      field.setAttribute("aria-invalid", String(invalid));
    }
  };

  const setStatus = (message: string, type: "error" | "success"): void => {
    statusMessage.textContent = message;
    statusMessage.hidden = false;
    statusMessage.classList.toggle("donation-form__status--error", type === "error");
    statusMessage.classList.toggle("donation-form__status--success", type === "success");
  };

  const clearStatus = (): void => {
    statusMessage.hidden = true;
    statusMessage.textContent = "";
    statusMessage.classList.remove("donation-form__status--error", "donation-form__status--success");
  };

  const clearAmountSelection = (): void => {
    amountButtons.forEach((button) => button.classList.remove("is-selected"));
  };

  const isStep1Valid = (): boolean => state.amount !== null && state.petId !== null;

  const isStep2Valid = (): boolean => {
    const validName = isValidDonorName(nameInput.value);
    const validEmail = isValidEmail(emailInput.value);
    setFieldInvalid(nameInput, !validName);
    setFieldInvalid(emailInput, !validEmail);
    return validName && validEmail;
  };

  const isStep3Valid = (): boolean => {
    const validCard = isValidCardNumber(cardInput.value);
    const validExpiry = isValidExpiry(expiryInput.value);
    const validCvv = isValidCvv(cvvInput.value);
    setFieldInvalid(cardInput, !validCard);
    setFieldInvalid(expiryInput, !validExpiry);
    setFieldInvalid(cvvInput, !validCvv);
    return validCard && validExpiry && validCvv;
  };

  const getCurrentStep = (): number => parseStep(getVisibleStep(overlay)?.dataset.step) ?? 1;

  const syncActionButtons = (): void => {
    const step = getCurrentStep();
    if (step === 1) nextButton.disabled = !isStep1Valid();
    if (step === 2) nextButton.disabled = !isStep2Valid();
    if (step === 3) completeButton.disabled = !isStep3Valid() || state.isSubmitting;
  };

  const openPetDropdown = (): void => {
    petDropdown.classList.add("is-open");
    petTrigger.setAttribute("aria-expanded", "true");
  };

  const selectPet = (item: HTMLLIElement): void => {
    const slug = item.dataset.value ?? "";
    const petId = PET_ID_BY_SLUG[slug] ?? null;
    const petName = item.textContent?.trim() ?? "";

    state.petId = petId;
    state.petName = petName;
    petTriggerText.textContent = petName;
    petTriggerText.style.color = "#000000";

    petDropdown
      .querySelectorAll<HTMLLIElement>("li")
      .forEach((listItem) => listItem.classList.toggle("is-selected", listItem === item));

    closePetDropdown();
    syncActionButtons();
  };

  const setAmountFromInput = (): void => {
    clearAmountSelection();
    const parsedAmount = parsePositiveAmount(amountInput.value);
    state.amount = parsedAmount;
    setFieldInvalid(amountInput, parsedAmount === null && amountInput.value.trim().length > 0);
    syncActionButtons();
  };

  const resetForOpen = (presetAmount: number | null): void => {
    state.amount = null;
    state.petId = null;
    state.petName = "";
    state.isSubmitting = false;
    clearStatus();

    clearAmountSelection();
    amountInput.value = "";
    setFieldInvalid(amountInput, false);

    petTriggerText.textContent = "Choose your favourite";
    petTriggerText.style.color = "#A4A8AE";
    petDropdown
      .querySelectorAll<HTMLLIElement>("li")
      .forEach((item) => item.classList.remove("is-selected"));

    const currentUser = getCurrentUser();
    const loggedInUser = isLoggedIn() && currentUser !== null;

    nameInput.value = loggedInUser ? currentUser.name : "";
    emailInput.value = loggedInUser ? currentUser.email : "";
    setFieldInvalid(nameInput, false);
    setFieldInvalid(emailInput, false);

    cardInput.value = "";
    expiryInput.value = "";
    cvvInput.value = "";
    setFieldInvalid(cardInput, false);
    setFieldInvalid(expiryInput, false);
    setFieldInvalid(cvvInput, false);

    saveCardCheckbox.checked = false;
    saveCardRow.hidden = !loggedInUser;

    activeSavedCards = loggedInUser ? readSavedCards(currentUser.email) : [];
    savedCardsBlock.hidden = activeSavedCards.length === 0;
    savedCardsSelect.innerHTML = '<option value="">Choose a saved card</option>';
    activeSavedCards.forEach((card) => {
      const option = document.createElement("option");
      option.value = card.id;
      option.textContent = card.label;
      savedCardsSelect.append(option);
    });
    savedCardsSelect.value = "";

    if (presetAmount !== null && presetAmount > 0) {
      const presetButton = overlay.querySelector<HTMLButtonElement>(
        `.donation-form__amount-btn[data-amount="${presetAmount}"]`,
      );

      if (presetButton) {
        presetButton.classList.add("is-selected");
      } else {
        amountInput.value = String(presetAmount);
      }

      state.amount = presetAmount;
    }

    setDonationStep(1);
    syncActionButtons();
  };

  overlay
    .querySelector<HTMLElement>(".donation-form__close")
    ?.addEventListener("click", closeDonationForm);
  overlay.addEventListener("click", (event) => handleOverlayClick(event, POPUP_FORM_ID));

  nextButton.addEventListener("click", () => {
    const currentStep = getCurrentStep();
    if (currentStep === 1 && !isStep1Valid()) {
      setStatus("Please choose donation amount and pet.", "error");
      syncActionButtons();
      return;
    }
    if (currentStep === 2 && !isStep2Valid()) {
      setStatus("Please enter a valid name and email.", "error");
      syncActionButtons();
      return;
    }
    clearStatus();
    setDonationStep(Math.min(currentStep + 1, TOTAL_STEPS));
    syncActionButtons();
  });

  backButton.addEventListener("click", () => {
    clearStatus();
    const currentStep = getCurrentStep();
    if (currentStep <= 1) return;
    setDonationStep(currentStep - 1);
    syncActionButtons();
  });

  completeButton.addEventListener("click", async () => {
    if (!isStep3Valid() || state.amount === null || state.petId === null) {
      setStatus("Please fill card details correctly.", "error");
      syncActionButtons();
      return;
    }

    state.isSubmitting = true;
    syncActionButtons();
    clearStatus();

    try {
      await createDonation({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        amount: state.amount,
        petId: state.petId,
      });

      if (saveCardCheckbox.checked && isLoggedIn()) {
        upsertSavedCard(emailInput.value.trim(), cardInput.value, expiryInput.value.trim(), cvvInput.value.trim());
      }

      setStatus(
        `Thank you for your donation of $${state.amount.toFixed(2)} to ${state.petName}!`,
        "success",
      );
    } catch {
      setStatus("Something went wrong. Please, try again later.", "error");
    } finally {
      state.isSubmitting = false;
      syncActionButtons();
    }
  });

  amountButtons.forEach((button) => {
    button.addEventListener("click", () => {
      clearAmountSelection();
      button.classList.add("is-selected");
      amountInput.value = "";
      setFieldInvalid(amountInput, false);
      const amount = parseStep(button.dataset.amount);
      state.amount = amount !== null && amount > 0 ? amount : null;
      syncActionButtons();
    });
  });

  otherButton.addEventListener("click", () => {
    clearAmountSelection();
    amountInput.focus();
  });

  amountInput.addEventListener("input", setAmountFromInput);
  amountInput.addEventListener("blur", setAmountFromInput);

  nameInput.addEventListener("input", () => {
    setFieldInvalid(nameInput, false);
    syncActionButtons();
  });
  emailInput.addEventListener("input", () => {
    setFieldInvalid(emailInput, false);
    syncActionButtons();
  });
  nameInput.addEventListener("blur", () => {
    setFieldInvalid(nameInput, !isValidDonorName(nameInput.value));
    syncActionButtons();
  });
  emailInput.addEventListener("blur", () => {
    setFieldInvalid(emailInput, !isValidEmail(emailInput.value));
    syncActionButtons();
  });

  cardInput.addEventListener("input", () => {
    cardInput.value = formatCardNumber(cardInput.value);
    setFieldInvalid(cardInput, false);
    syncActionButtons();
  });
  cvvInput.addEventListener("input", () => {
    cvvInput.value = cvvInput.value.replace(/\D/g, "").slice(0, 3);
    setFieldInvalid(cvvInput, false);
    syncActionButtons();
  });
  expiryInput.addEventListener("input", () => {
    expiryInput.value = formatExpiry(expiryInput.value);
    setFieldInvalid(expiryInput, false);
    syncActionButtons();
  });
  cardInput.addEventListener("blur", () => {
    setFieldInvalid(cardInput, !isValidCardNumber(cardInput.value));
    syncActionButtons();
  });
  cvvInput.addEventListener("blur", () => {
    setFieldInvalid(cvvInput, !isValidCvv(cvvInput.value));
    syncActionButtons();
  });
  expiryInput.addEventListener("blur", () => {
    setFieldInvalid(expiryInput, !isValidExpiry(expiryInput.value));
    syncActionButtons();
  });

  savedCardsSelect.addEventListener("change", () => {
    const selectedCard = activeSavedCards.find((card) => card.id === savedCardsSelect.value);
    if (!selectedCard) return;

    cardInput.value = formatCardNumber(selectedCard.cardNumber);
    expiryInput.value = selectedCard.expiry;
    cvvInput.value = selectedCard.cvv;
    setFieldInvalid(cardInput, false);
    setFieldInvalid(expiryInput, false);
    setFieldInvalid(cvvInput, false);
    syncActionButtons();
  });

  petTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    if (petDropdown.classList.contains("is-open")) {
      closePetDropdown();
      return;
    }
    openPetDropdown();
  });

  petDropdown.querySelectorAll<HTMLLIElement>(".donation-form__pet-list li").forEach((item) => {
    item.addEventListener("click", () => selectPet(item));
    item.addEventListener("keydown", (event) => {
      if (!activationKeys.has(event.key)) return;
      event.preventDefault();
      selectPet(item);
    });
  });

  document.addEventListener("click", (event: MouseEvent) => {
    if (!petDropdown?.classList.contains("is-open")) return;

    const targetNode = event.target;
    if (!(targetNode instanceof Node)) return;

    const wrap = petTrigger?.closest(".donation-form__pet-select-wrap");
    if (!wrap?.contains(targetNode) && !petDropdown.contains(targetNode)) {
      closePetDropdown();
    }
  });

  petDropdown.addEventListener("click", (event) => event.stopPropagation());
  overlay.addEventListener("donation:open", (event) => {
    const detail = event instanceof CustomEvent ? event.detail : null;
    const presetAmount =
      detail && typeof detail === "object" && "presetAmount" in detail
        ? (detail.presetAmount as number | null)
        : null;
    resetForOpen(presetAmount);
  });
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
    const rawValue = input?.value.trim().replace("$", "") ?? "";
    const parsedAmount = parsePositiveAmount(rawValue);

    if (parsedAmount === null) {
      openCarePopup();
      return;
    }

    openDonationForm(parsedAmount);
  });
};

const initDonationFormTriggers = (): void => {
  getFormTriggers().forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openDonationForm(null);
    });
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
  initDonationFormTriggers();
  void initPetsSlider();
  void initTestimonialsSlider();
  initDonationBanner();
  initHamburger();
  initZoosSidebar();
  initPetCardLinks();
};

document.addEventListener("keydown", handlePopupEscape);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
