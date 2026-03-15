import { getProfile, loginUser, type AuthResponse, type AuthUser, type LoginRequest, type RecordValue } from "../api";
import { setAuth } from "../auth";

type SignInFieldName = "login" | "password";

interface SignInElements {
  form: HTMLFormElement;
  loginInput: HTMLInputElement;
  passwordInput: HTMLInputElement;
  submitButton: HTMLButtonElement;
  authError: HTMLElement;
  loginField: HTMLElement;
  passwordField: HTMLElement;
  loginError: HTMLElement;
  passwordError: HTMLElement;
}

const INCORRECT_CREDENTIALS_MESSAGE = "Incorrect login or password";
const REDIRECT_URL = "../landing/index.html";
const SPECIAL_CHARACTER_PATTERN = /[^A-Za-z0-9]/;
const LOGIN_PATTERN = /^[A-Za-z][A-Za-z]{2,}$/;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null;

const isAuthUser = (value: unknown): value is AuthUser => {
  if (!isRecord(value)) return false;

  return typeof value.name === "string" && value.name.length > 0 && typeof value.email === "string" && value.email.length > 0;
};

const validateLogin = (value: string): string | null => {
  if (value.length < 3) return "Login should be at least 3 characters long";
  if (!/^[A-Za-z]/.test(value)) return "Login should start with a letter";
  if (!LOGIN_PATTERN.test(value)) return "Login should contain only English letters";
  return null;
};

const validatePassword = (value: string): string | null => {
  if (value.length < 6) return "Password should be at least 6 characters long";
  if (!SPECIAL_CHARACTER_PATTERN.test(value)) {
    return "Password should contain at least 1 special character";
  }
  return null;
};

const getElements = (): SignInElements | null => {
  const form = document.querySelector<HTMLFormElement>("[data-signin-form]");
  if (!form) return null;

  const loginInput = form.querySelector<HTMLInputElement>("#signin-login");
  const passwordInput = form.querySelector<HTMLInputElement>("#signin-password");
  const submitButton = form.querySelector<HTMLButtonElement>("[data-signin-submit]");
  const authError = form.querySelector<HTMLElement>("[data-auth-error]");
  const loginField = form.querySelector<HTMLElement>('[data-field="login"]');
  const passwordField = form.querySelector<HTMLElement>('[data-field="password"]');
  const loginError = form.querySelector<HTMLElement>("#signin-login-error");
  const passwordError = form.querySelector<HTMLElement>("#signin-password-error");

  if (
    !loginInput ||
    !passwordInput ||
    !submitButton ||
    !authError ||
    !loginField ||
    !passwordField ||
    !loginError ||
    !passwordError
  ) {
    return null;
  }

  return {
    form,
    loginInput,
    passwordInput,
    submitButton,
    authError,
    loginField,
    passwordField,
    loginError,
    passwordError,
  };
};

const getFieldError = (field: SignInFieldName, value: string): string | null => {
  if (field === "login") return validateLogin(value);
  return validatePassword(value);
};

const setFieldErrorState = (
  fieldElement: HTMLElement,
  errorElement: HTMLElement,
  inputElement: HTMLInputElement,
  errorMessage: string | null,
): void => {
  if (errorMessage) {
    fieldElement.classList.add("signin-form__field--invalid");
    errorElement.textContent = errorMessage;
    inputElement.setAttribute("aria-invalid", "true");
    return;
  }

  fieldElement.classList.remove("signin-form__field--invalid");
  errorElement.textContent = "";
  inputElement.setAttribute("aria-invalid", "false");
};

const setSubmitState = (submitButton: HTMLButtonElement, isValid: boolean): void => {
  submitButton.disabled = !isValid;
  submitButton.setAttribute("aria-disabled", String(!isValid));
};

const getFormValidity = (elements: SignInElements): boolean => {
  const loginValue = elements.loginInput.value.trim();
  const passwordValue = elements.passwordInput.value.trim();
  return getFieldError("login", loginValue) === null && getFieldError("password", passwordValue) === null;
};

const extractToken = (response: AuthResponse): string | null => {
  if (typeof response.token === "string" && response.token.length > 0) return response.token;
  if (isRecord(response) && typeof response.accessToken === "string" && response.accessToken.length > 0) {
    return response.accessToken;
  }
  return null;
};

const extractUserFromResponse = (response: AuthResponse): AuthUser | null => {
  if (isAuthUser(response.user)) return response.user;
  if (isRecord(response) && isAuthUser(response.user)) return response.user;
  return null;
};

const getUserForSession = async (response: AuthResponse, token: string): Promise<AuthUser | null> => {
  const userFromResponse = extractUserFromResponse(response);
  if (userFromResponse) return userFromResponse;

  try {
    const profile = await getProfile(token);
    return isAuthUser(profile) ? profile : null;
  } catch {
    return null;
  }
};

const initSignIn = (): void => {
  const elements = getElements();
  if (!elements) return;

  const fieldMap: Record<SignInFieldName, { input: HTMLInputElement; field: HTMLElement; error: HTMLElement }> = {
    login: {
      input: elements.loginInput,
      field: elements.loginField,
      error: elements.loginError,
    },
    password: {
      input: elements.passwordInput,
      field: elements.passwordField,
      error: elements.passwordError,
    },
  };

  const validateAndRenderField = (fieldName: SignInFieldName): string | null => {
    const fieldData = fieldMap[fieldName];
    const value = fieldData.input.value.trim();
    const errorMessage = getFieldError(fieldName, value);

    setFieldErrorState(fieldData.field, fieldData.error, fieldData.input, errorMessage);
    return errorMessage;
  };

  const handleFocus = (fieldName: SignInFieldName): void => {
    const fieldData = fieldMap[fieldName];
    setFieldErrorState(fieldData.field, fieldData.error, fieldData.input, null);
    elements.authError.textContent = "";
  };

  const updateSubmitButton = (): void => {
    setSubmitState(elements.submitButton, getFormValidity(elements));
  };

  (Object.keys(fieldMap) as SignInFieldName[]).forEach((fieldName) => {
    const fieldData = fieldMap[fieldName];

    fieldData.input.addEventListener("blur", () => {
      validateAndRenderField(fieldName);
      updateSubmitButton();
    });

    fieldData.input.addEventListener("focus", () => {
      handleFocus(fieldName);
    });

    fieldData.input.addEventListener("input", () => {
      elements.authError.textContent = "";
      updateSubmitButton();
    });
  });

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const loginError = validateAndRenderField("login");
    const passwordError = validateAndRenderField("password");

    if (loginError || passwordError) {
      updateSubmitButton();
      return;
    }

    const payload: LoginRequest = {
      login: elements.loginInput.value.trim(),
      password: elements.passwordInput.value.trim(),
    };

    const originalButtonLabel = elements.submitButton.querySelector("span");
    const originalLabelText = originalButtonLabel?.textContent ?? "";

    elements.submitButton.disabled = true;
    if (originalButtonLabel) {
      originalButtonLabel.textContent = "Signing in...";
    }
    elements.authError.textContent = "";

    try {
      const response = await loginUser(payload);
      const token = extractToken(response);
      if (!token) throw new Error("Missing token in login response");

      const user = await getUserForSession(response, token);
      if (!user) throw new Error("Missing user data for session");

      setAuth(token, user);
      window.location.assign(REDIRECT_URL);
    } catch {
      elements.authError.textContent = INCORRECT_CREDENTIALS_MESSAGE;
      updateSubmitButton();
    } finally {
      if (originalButtonLabel) {
        originalButtonLabel.textContent = originalLabelText;
      }
    }
  });

  updateSubmitButton();
};

initSignIn();
