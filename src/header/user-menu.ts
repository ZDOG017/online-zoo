import { clearAuth, getCurrentUser, isLoggedIn } from "../auth";

const SIGN_IN_URL = "/online-zoo/pages/signin/index.html";
const REGISTER_URL = "/online-zoo/pages/register/index.html";
const LANDING_URL = "/online-zoo/pages/landing/index.html";

interface MenuParts {
  wrapper: HTMLElement;
  trigger: HTMLButtonElement;
  menu: HTMLElement;
}

const createMenuMarkup = (loggedIn: boolean): string => {
  if (!loggedIn) {
    return `
      <a class="nav__user-menu-link" href="${SIGN_IN_URL}" role="menuitem">Sign In</a>
      <a class="nav__user-menu-link" href="${REGISTER_URL}" role="menuitem">Registration</a>
    `;
  }

  const user = getCurrentUser();
  const safeName = user?.name ?? "User";
  const safeEmail = user?.email ?? "";

  return `
    <div class="nav__user-menu-profile" role="none">
      <p class="nav__user-menu-label">Name</p>
      <p class="nav__user-menu-value">${safeName}</p>
      <p class="nav__user-menu-label">Email</p>
      <p class="nav__user-menu-value">${safeEmail}</p>
    </div>
    <button type="button" class="nav__user-menu-signout" data-user-signout role="menuitem">Sign Out</button>
  `;
};

const createUserNameLabel = (): string => {
  const user = getCurrentUser();
  if (!user?.name) return "";
  return `<span class="nav__user-name">${user.name}</span>`;
};

const createUserControl = (): MenuParts => {
  const wrapper = document.createElement("div");
  wrapper.className = "nav__user";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "nav__user-trigger";
  trigger.setAttribute("aria-label", "User menu");
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
  trigger.innerHTML = `
    <span class="nav__user-icon" aria-hidden="true"></span>
    ${isLoggedIn() ? createUserNameLabel() : ""}
  `;

  const menu = document.createElement("div");
  menu.className = "nav__user-menu";
  menu.setAttribute("role", "menu");
  menu.hidden = true;
  menu.innerHTML = createMenuMarkup(isLoggedIn());

  wrapper.append(trigger, menu);

  return { wrapper, trigger, menu };
};

const closeMenu = (trigger: HTMLButtonElement, menu: HTMLElement): void => {
  trigger.setAttribute("aria-expanded", "false");
  menu.hidden = true;
};

const openMenu = (trigger: HTMLButtonElement, menu: HTMLElement): void => {
  trigger.setAttribute("aria-expanded", "true");
  menu.hidden = false;
};

const attachInteractions = ({ wrapper, trigger, menu }: MenuParts): void => {
  trigger.addEventListener("click", () => {
    const isExpanded = trigger.getAttribute("aria-expanded") === "true";
    if (isExpanded) {
      closeMenu(trigger, menu);
      return;
    }

    openMenu(trigger, menu);
  });

  document.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (wrapper.contains(target)) return;
    closeMenu(trigger, menu);
  });

  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    closeMenu(trigger, menu);
  });

  menu.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const signOutButton = target.closest<HTMLElement>("[data-user-signout]");
    if (!signOutButton) return;

    clearAuth();
    closeMenu(trigger, menu);
    window.location.assign(LANDING_URL);
  });
};

const insertControlIntoNav = (nav: HTMLElement): void => {
  if (nav.querySelector(".nav__user")) return;

  const social = nav.querySelector(".nav__social");
  const parts = createUserControl();

  if (social?.parentNode) {
    social.parentNode.insertBefore(parts.wrapper, social.nextSibling);
  } else {
    nav.append(parts.wrapper);
  }

  attachInteractions(parts);
};

const mountHeaderUserMenu = (): void => {
  const navs = document.querySelectorAll<HTMLElement>(".nav");
  if (navs.length === 0) return;

  navs.forEach((nav) => {
    insertControlIntoNav(nav);
  });
};

const initHeaderUserMenu = (): void => {
  mountHeaderUserMenu();
  window.setTimeout(mountHeaderUserMenu, 0);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHeaderUserMenu);
} else {
  initHeaderUserMenu();
}
