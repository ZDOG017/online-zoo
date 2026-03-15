import type { AuthUser, Maybe, RecordValue } from "../api";

export interface AuthState {
  token: string;
  user: AuthUser;
}

export enum AuthStorageKey {
  Token = "online-zoo:auth:token",
  User = "online-zoo:auth:user",
}

const isBrowser = (): boolean => typeof window !== "undefined";

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isAuthUser = (value: unknown): value is AuthUser => {
  if (!isRecord(value)) return false;

  return isNonEmptyString(value.name) && isNonEmptyString(value.email);
};

const readStorage = (key: AuthStorageKey): Maybe<string> => {
  if (!isBrowser()) return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: AuthStorageKey, value: string): void => {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
};

const removeStorage = (key: AuthStorageKey): void => {
  if (!isBrowser()) return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
};

export const getAccessToken = (): Maybe<string> => {
  const token = readStorage(AuthStorageKey.Token);
  return isNonEmptyString(token) ? token : null;
};

export const getCurrentUser = (): Maybe<AuthUser> => {
  const raw = readStorage(AuthStorageKey.User);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return isAuthUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const getAuthState = (): Maybe<AuthState> => {
  const token = getAccessToken();
  const user = getCurrentUser();
  if (!token || !user) return null;

  return {
    token,
    user,
  };
};

export const isLoggedIn = (): boolean => getAccessToken() !== null;

export const setAuth = (token: string, user: AuthUser): void => {
  if (!isNonEmptyString(token) || !isAuthUser(user)) return;

  writeStorage(AuthStorageKey.Token, token);
  writeStorage(AuthStorageKey.User, JSON.stringify(user));
};

export const setCurrentUser = (user: AuthUser): void => {
  if (!isAuthUser(user)) return;
  writeStorage(AuthStorageKey.User, JSON.stringify(user));
};

export const clearAuth = (): void => {
  removeStorage(AuthStorageKey.Token);
  removeStorage(AuthStorageKey.User);
};
