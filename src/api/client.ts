import { API_BASE_URL } from "./constants";
import { HttpMethod, type ApiErrorShape, type RecordValue, type RequestConfig } from "./types";

const createHeaders = (token?: string): HeadersInit => {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null;

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

const getErrorMessage = (status: number, payload: unknown): string => {
  if (isRecord(payload)) {
    const apiErrorPayload = payload as ApiErrorShape;
    if (typeof apiErrorPayload.message === "string" && apiErrorPayload.message.length > 0) {
      return apiErrorPayload.message;
    }
    if (typeof apiErrorPayload.error === "string" && apiErrorPayload.error.length > 0) {
      return apiErrorPayload.error;
    }
  }

  return `Request failed with status ${status}`;
};

export class ApiError extends Error {
  public readonly status: number;
  public readonly payload: unknown;

  public constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export const request = async <TResponse, TBody = undefined>({
  route,
  method,
  body,
  token,
  signal,
}: RequestConfig<TBody>): Promise<TResponse> => {
  const url = new URL(route, API_BASE_URL);

  const init: RequestInit = {
    method,
    headers: createHeaders(token),
    signal,
  };

  if (method !== HttpMethod.GET && body !== undefined) {
    init.headers = {
      ...createHeaders(token),
      "Content-Type": "application/json",
    };
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);
  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiError(response.status, getErrorMessage(response.status, payload), payload);
  }

  return payload as TResponse;
};
