import { ApiError, registerUser, type RecordValue, type RegistrationPayload } from "../api";

type RegisterFieldName = "login" | "name" | "email" | "password" | "confirmPassword";

interface RegisterElements {
  form: HTMLFormElement;
  loginInput: HTMLInputElement;
  nameInput: HTMLInputElement;
  emailInput: HTMLInputElement;
  passwordInput: HTMLInputElement;
  confirmPasswordInput: HTMLInputElement;
  submitButton: HTMLButtonElement;
  authError: HTMLElement;
  loginField: HTMLElement;
  nameField: HTMLElement;
  emailField: HTMLElement;
  passwordField: HTMLElement;
  confirmPasswordField: HTMLElement;
  loginError: HTMLElement;
  nameError: HTMLElement;
  emailError: HTMLElement;
  passwordError: HTMLElement;
  confirmPasswordError: HTMLElement;
}

const REDIRECT_URL = "../signin/index.html";
const LOGIN_PATTERN = /^[A-Za-z][A-Za-z]{2,}$/;
const NAME_PATTERN = /^[A-Za-z]{3,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHARACTER_PATTERN = /[^A-Za-z0-9]/;
const FALLBACK_REGISTER_ERROR = "Registration failed. Please try again.";

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null;

const getElements = (): RegisterElements | null => {
  const form = document.querySelector<HTMLFormElement>("[data-register-form]");
  if (!form) return null;

  const loginInput = form.querySelector<HTMLInputElement>("#register-login");
  const nameInput = form.querySelector<HTMLInputElement>("#register-name");
  const emailInput = form.querySelector<HTMLInputElement>("#register-email");
  const passwordInput = form.querySelector<HTMLInputElement>("#register-password");
  const confirmPasswordInput = form.querySelector<HTMLInputElement>("#register-confirm-password");
  const submitButton = form.querySelector<HTMLButtonElement>("[data-register-submit]");
  const authError = form.querySelector<HTMLElement>("[data-auth-error]");
  const loginField = form.querySelector<HTMLElement>('[data-field="login"]');
  const nameField = form.querySelector<HTMLElement>('[data-field="name"]');
  const emailField = form.querySelector<HTMLElement>('[data-field="email"]');
  const passwordField = form.querySelector<HTMLElement>('[data-field="password"]');
  const confirmPasswordField = form.querySelector<HTMLElement>('[data-field="confirmPassword"]');
  const loginError = form.querySelector<HTMLElement>("#register-login-error");
  const nameError = form.querySelector<HTMLElement>("#register-name-error");
  const emailError = form.querySelector<HTMLElement>("#register-email-error");
  const passwordError = form.querySelector<HTMLElement>("#register-password-error");
  const confirmPasswordError = form.querySelector<HTMLElement>("#register-confirm-password-error");

  if (
    !loginInput ||
    !nameInput ||
    !emailInput ||
    !passwordInput ||
    !confirmPasswordInput ||
    !submitButton ||
    !authError ||
    !loginField ||
    !nameField ||
    !emailField ||
    !passwordField ||
    !confirmPasswordField ||
    !loginError ||
    !nameError ||
    !emailError ||
    !passwordError ||
    !confirmPasswordError
  ) {
    return null;
  }

  return {
    form,
    loginInput,
    nameInput,
    emailInput,
    passwordInput,
    confirmPasswordInput,
    submitButton,
    authError,
    loginField,
    nameField,
    emailField,
    passwordField,
    confirmPasswordField,
    loginError,
    nameError,
    emailError,
    passwordError,
    confirmPasswordError,
  };
};

const validateLogin = (value: string): string | null => {
  if (value.length < 3) return "Login should be at least 3 characters long";
  if (!/^[A-Za-z]/.test(value)) return "Login should start with a letter";
  if (!LOGIN_PATTERN.test(value)) return "Login should contain only English letters";
  return null;
};

const validateName = (value: string): string | null => {
  if (value.length < 3) return "Name should be at least 3 characters long";
  if (!NAME_PATTERN.test(value)) return "Name should contain only English letters";
  return null;
};

const validateEmail = (value: string): string | null => {
  if (!EMAIL_PATTERN.test(value)) return "Please enter a valid email";
  return null;
};

const validatePassword = (value: string): string | null => {
  if (value.length < 6) return "Password should be at least 6 characters long";
  if (!SPECIAL_CHARACTER_PATTERN.test(value)) {
    return "Password should contain at least 1 special character";
  }
  return null;
};

const validateConfirmPassword = (passwordValue: string, confirmValue: string): string | null => {
  if (confirmValue.length < 1) return "Please confirm your password";
  if (passwordValue !== confirmValue) return "Passwords should match";
  return null;
};

const setFieldErrorState = (
  fieldElement: HTMLElement,
  errorElement: HTMLElement,
  inputElement: HTMLInputElement,
  errorMessage: string | null,
): void => {
  if (errorMessage) {
    fieldElement.classList.add("register-form__field--invalid");
    errorElement.textContent = errorMessage;
    inputElement.setAttribute("aria-invalid", "true");
    return;
  }

  fieldElement.classList.remove("register-form__field--invalid");
  errorElement.textContent = "";
  inputElement.setAttribute("aria-invalid", "false");
};

const setSubmitState = (submitButton: HTMLButtonElement, isValid: boolean): void => {
  submitButton.disabled = !isValid;
  submitButton.setAttribute("aria-disabled", String(!isValid));
};

const getBackendErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.message.length > 0) {
    return error.message;
  }

  if (isRecord(error) && typeof error.message === "string" && error.message.length > 0) {
    return error.message;
  }

  return FALLBACK_REGISTER_ERROR;
};

const initRegister = (): void => {
  const elements = getElements();
  if (!elements) return;

  const fieldMap: Record<RegisterFieldName, { input: HTMLInputElement; field: HTMLElement; error: HTMLElement }> = {
    login: {
      input: elements.loginInput,
      field: elements.loginField,
      error: elements.loginError,
    },
    name: {
      input: elements.nameInput,
      field: elements.nameField,
      error: elements.nameError,
    },
    email: {
      input: elements.emailInput,
      field: elements.emailField,
      error: elements.emailError,
    },
    password: {
      input: elements.passwordInput,
      field: elements.passwordField,
      error: elements.passwordError,
    },
    confirmPassword: {
      input: elements.confirmPasswordInput,
      field: elements.confirmPasswordField,
      error: elements.confirmPasswordError,
    },
  };

  const getFieldError = (fieldName: RegisterFieldName): string | null => {
    const value = fieldMap[fieldName].input.value.trim();

    if (fieldName === "login") return validateLogin(value);
    if (fieldName === "name") return validateName(value);
    if (fieldName === "email") return validateEmail(value);
    if (fieldName === "password") return validatePassword(value);
    return validateConfirmPassword(elements.passwordInput.value.trim(), value);
  };

  const validateAndRenderField = (fieldName: RegisterFieldName): string | null => {
    const fieldData = fieldMap[fieldName];
    const errorMessage = getFieldError(fieldName);
    setFieldErrorState(fieldData.field, fieldData.error, fieldData.input, errorMessage);
    return errorMessage;
  };

  const getFormValidity = (): boolean =>
    (Object.keys(fieldMap) as RegisterFieldName[]).every((fieldName) => getFieldError(fieldName) === null);

  const updateSubmitButton = (): void => {
    setSubmitState(elements.submitButton, getFormValidity());
  };

  (Object.keys(fieldMap) as RegisterFieldName[]).forEach((fieldName) => {
    const fieldData = fieldMap[fieldName];

    fieldData.input.addEventListener("blur", () => {
      validateAndRenderField(fieldName);
      if (fieldName === "password" && elements.confirmPasswordInput.value.trim().length > 0) {
        validateAndRenderField("confirmPassword");
      }
      updateSubmitButton();
    });

    fieldData.input.addEventListener("focus", () => {
      setFieldErrorState(fieldData.field, fieldData.error, fieldData.input, null);
      elements.authError.textContent = "";
    });

    fieldData.input.addEventListener("input", () => {
      elements.authError.textContent = "";
      if (fieldName === "password" && elements.confirmPasswordInput.value.trim().length > 0) {
        validateAndRenderField("confirmPassword");
      }
      updateSubmitButton();
    });
  });

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();

    void (async () => {
      const errors = (Object.keys(fieldMap) as RegisterFieldName[]).map((fieldName) => validateAndRenderField(fieldName));
      const hasErrors = errors.some((message) => message !== null);
      if (hasErrors) {
        updateSubmitButton();
        return;
      }

      const payload: RegistrationPayload = {
        login: elements.loginInput.value.trim(),
        password: elements.passwordInput.value.trim(),
        name: elements.nameInput.value.trim(),
        email: elements.emailInput.value.trim(),
      };

      const labelElement = elements.submitButton.querySelector("span");
      const originalButtonText = labelElement?.textContent ?? "";
      elements.submitButton.disabled = true;
      elements.submitButton.setAttribute("aria-disabled", "true");
      if (labelElement) {
        labelElement.textContent = "Registering...";
      }
      elements.authError.textContent = "";

      try {
        await registerUser(payload);
        window.location.assign(REDIRECT_URL);
      } catch (error) {
        elements.authError.textContent = getBackendErrorMessage(error);
        updateSubmitButton();
      } finally {
        if (labelElement) {
          labelElement.textContent = originalButtonText;
        }
      }
    })();
  });

  updateSubmitButton();
};

initRegister();
