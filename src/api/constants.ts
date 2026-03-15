export const API_BASE_URL = "https://vsqsnqnxkh.execute-api.eu-central-1.amazonaws.com/prod/";

export enum ApiRoute {
  INFO = "",
  PETS = "pets",
  FEEDBACK = "feedback",
  CAMERAS = "cameras",
  AUTH_REGISTER = "auth/register",
  AUTH_LOGIN = "auth/login",
  AUTH_PROFILE = "auth/profile",
  DONATIONS = "donations",
}

export const getPetByIdRoute = (id: number): string => `${ApiRoute.PETS}/${id}`;
