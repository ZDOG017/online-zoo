export type EntityId = number;

export type RecordValue = Record<string, unknown>;

export type Maybe<TValue> = TValue | null;

export type ApiList<TItem> = ReadonlyArray<TItem>;

export type PetId = EntityId;

export interface ApiEntity {
  id: EntityId;
  [key: string]: unknown;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PetSummary extends ApiEntity {
  name?: string;
  description?: string;
  image?: string;
}

export interface PetDetails extends PetSummary {
  habitat?: string;
  location?: string;
  coordinates?: Coordinates;
  facts?: ReadonlyArray<string>;
}

export interface FeedbackItem extends ApiEntity {
  author?: string;
  text?: string;
  avatar?: string;
}

export interface CameraItem extends ApiEntity {
  description?: string;
  streamUrl?: string;
  petId?: EntityId;
}

export interface AuthUser {
  id?: EntityId;
  name: string;
  email: string;
  [key: string]: unknown;
}

export interface RegisterRequest {
  login: string;
  password: string;
  name: string;
  email: string;
}

export type LoginRequest = Pick<RegisterRequest, "login" | "password">;

export type RegistrationPayload = Required<RegisterRequest>;

export interface AuthResponse {
  token?: string;
  user?: AuthUser;
  message?: string;
  [key: string]: unknown;
}

export interface DonationRequest {
  name: string;
  email: string;
  amount: number;
  petId: PetId;
}

export type DonationPayload = Readonly<DonationRequest>;

export interface DonationResponse {
  message?: string;
  donationId?: string | number;
  [key: string]: unknown;
}

export interface ApiErrorShape {
  message?: string;
  error?: string;
  details?: unknown;
  [key: string]: unknown;
}

export interface RequestConfig<TBody> {
  route: string;
  method: HttpMethod;
  body?: TBody;
  token?: string;
  signal?: AbortSignal;
}

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
}
