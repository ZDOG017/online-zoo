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

export const getPets = async (signal?: AbortSignal): Promise<ApiList<PetSummary>> =>
  request<ApiList<PetSummary>>({
    route: ApiRoute.PETS,
    method: HttpMethod.GET,
    signal,
  });

export const getPetById = async (
  petId: PetId,
  signal?: AbortSignal,
): Promise<PetDetails> =>
  request<PetDetails>({
    route: getPetByIdRoute(petId),
    method: HttpMethod.GET,
    signal,
  });

export const getFeedback = async (signal?: AbortSignal): Promise<ApiList<FeedbackItem>> =>
  request<ApiList<FeedbackItem>>({
    route: ApiRoute.FEEDBACK,
    method: HttpMethod.GET,
    signal,
  });

export const getCameras = async (signal?: AbortSignal): Promise<ApiList<CameraItem>> =>
  request<ApiList<CameraItem>>({
    route: ApiRoute.CAMERAS,
    method: HttpMethod.GET,
    signal,
  });

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
