import { afterEach, describe, expect, it, vi } from "vitest";
import { request } from "../client";
import { API_BASE_URL } from "../constants";
import { HttpMethod } from "../types";

/**
 * Layer 1 — HTTP client (`client.ts` → `request()`).
 * Guards: URL, headers, JSON POST, error mapping, abort. See TESTING.md at repo root.
 */

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

const mockJsonResponse = (
  body: unknown,
  init: ResponseInit & { contentType?: string } = {},
): Response => {
  const headers = new Headers();
  if (init.contentType !== undefined) {
    headers.set("content-type", init.contentType);
  } else {
    headers.set("content-type", "application/json");
  }
  return new Response(JSON.stringify(body), { ...init, headers });
};

describe("Layer 1 — HTTP client (client.ts → request())", () => {
  describe("1. URL construction", () => {
    it("calls fetch with route resolved against API_BASE_URL — ensures every request hits the configured backend, not a relative path", async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ ok: true }));
      globalThis.fetch = fetchMock;

      await request<{ ok: boolean }>({
        route: "pets",
        method: HttpMethod.GET,
      });

      expect(fetchMock).toHaveBeenCalledOnce();
      const calledUrl = fetchMock.mock.calls[0][0] as URL | string;
      expect(String(calledUrl)).toBe(new URL("pets", API_BASE_URL).href);
    });
  });

  describe("2. Request headers (server expects JSON)", () => {
    it("sends Accept: application/json on GET — tells API we want JSON so parsing and errors stay predictable", async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({}));
      globalThis.fetch = fetchMock;

      await request({ route: "pets", method: HttpMethod.GET });

      const init = fetchMock.mock.calls[0][1] as RequestInit;
      const headers = new Headers(init.headers);
      expect(headers.get("Accept")).toBe("application/json");
    });

    it("sends Authorization: Bearer <token> when token is passed — required for protected routes like profile; missing header would cause silent 401s in the app", async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({}));
      globalThis.fetch = fetchMock;

      await request({ route: "auth/profile", method: HttpMethod.GET, token: "abc" });

      const init = fetchMock.mock.calls[0][1] as RequestInit;
      const headers = new Headers(init.headers);
      expect(headers.get("Authorization")).toBe("Bearer abc");
    });
  });

  describe("3. POST bodies", () => {
    it("stringifies body and sets Content-Type: application/json — backend expects JSON; wrong shape breaks login/register/donations", async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ token: "t" }));
      globalThis.fetch = fetchMock;
      const body = { login: "u", password: "p" };

      await request<{ token: string }, typeof body>({
        route: "auth/login",
        method: HttpMethod.POST,
        body,
      });

      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe("POST");
      expect(init.body).toBe(JSON.stringify(body));
      const headers = new Headers(init.headers);
      expect(headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("4. Errors and user-facing messages", () => {
    it("on non-OK response, throws ApiError with API `message` field — users see server validation text instead of a generic failure", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          mockJsonResponse({ message: "Invalid login" }, { status: 401, statusText: "Unauthorized" }),
        );
      globalThis.fetch = fetchMock;

      await expect(
        request({
          route: "auth/login",
          method: HttpMethod.POST,
          body: { login: "x", password: "y" },
        }),
      ).rejects.toMatchObject({
        name: "ApiError",
        status: 401,
        message: "Invalid login",
      });
    });

    it("on non-OK JSON without message, throws ApiError with status-based fallback — still gives a stable error path when backend omits details", async () => {
      const headers = new Headers();
      headers.set("content-type", "application/json");
      const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 500, headers }));
      globalThis.fetch = fetchMock;

      await expect(request({ route: "pets", method: HttpMethod.GET })).rejects.toMatchObject({
        name: "ApiError",
        status: 500,
        message: "Request failed with status 500",
      });
    });
  });

  describe("5. Cancellation", () => {
    it("passes AbortSignal through to fetch — lets UI cancel in-flight calls (navigation, double-submit) without leaving dangling requests", async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({}));
      globalThis.fetch = fetchMock;
      const controller = new AbortController();

      await request({ route: "pets", method: HttpMethod.GET, signal: controller.signal });

      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.signal).toBe(controller.signal);
    });
  });
});
