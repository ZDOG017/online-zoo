import { ApiRoute, getPetByIdRoute } from "./constants";
import { request } from "./client";
import {
  HttpMethod,
  type ApiList,
  type AuthResponse,
  type AuthUser,
  type CameraItem,
  type DonationPayload,
  type DonationResponse,
  type FeedbackItem,
  type LoginRequest,
  type PetDetails,
  type PetId,
  type PetSummary,
  type RegistrationPayload,
} from "./types";

const extractDataList = <TItem>(payload: unknown): ApiList<TItem> => {
  if (Array.isArray(payload)) {
    return payload as ApiList<TItem>;
  }

  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return record.data as ApiList<TItem>;
    }
  }

  return [];
};

export const getPets = async (signal?: AbortSignal): Promise<ApiList<PetSummary>> => {
  const payload = await request<unknown>({
    route: ApiRoute.PETS,
    method: HttpMethod.GET,
    signal,
  });
  return extractDataList<PetSummary>(payload);
};

export const getPetById = async (
  petId: PetId,
  signal?: AbortSignal,
): Promise<PetDetails> => {
  const payload = await request<unknown>({
    route: getPetByIdRoute(petId),
    method: HttpMethod.GET,
    signal,
  });
  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;
    if (typeof record.data === "object" && record.data !== null) {
      return record.data as PetDetails;
    }
  }
  return payload as PetDetails;
};

export const getFeedback = async (signal?: AbortSignal): Promise<ApiList<FeedbackItem>> => {
  const payload = await request<unknown>({
    route: ApiRoute.FEEDBACK,
    method: HttpMethod.GET,
    signal,
  });
  return extractDataList<FeedbackItem>(payload);
};

export const getCameras = async (signal?: AbortSignal): Promise<ApiList<CameraItem>> => {
  const payload = await request<unknown>({
    route: ApiRoute.CAMERAS,
    method: HttpMethod.GET,
    signal,
  });
  return extractDataList<CameraItem>(payload);
};

export const registerUser = async (
  payload: RegistrationPayload,
  signal?: AbortSignal,
): Promise<AuthResponse> =>
  request<AuthResponse, RegistrationPayload>({
    route: ApiRoute.AUTH_REGISTER,
    method: HttpMethod.POST,
    body: payload,
    signal,
  });

export const loginUser = async (
  payload: LoginRequest,
  signal?: AbortSignal,
): Promise<AuthResponse> =>
  request<AuthResponse, LoginRequest>({
    route: ApiRoute.AUTH_LOGIN,
    method: HttpMethod.POST,
    body: payload,
    signal,
  });

export const getProfile = async (token: string, signal?: AbortSignal): Promise<AuthUser> =>
  request<AuthUser>({
    route: ApiRoute.AUTH_PROFILE,
    method: HttpMethod.GET,
    token,
    signal,
  });

export const createDonation = async (
  payload: DonationPayload,
  signal?: AbortSignal,
): Promise<DonationResponse> =>
  request<DonationResponse, DonationPayload>({
    route: ApiRoute.DONATIONS,
    method: HttpMethod.POST,
    body: payload,
    signal,
  });
