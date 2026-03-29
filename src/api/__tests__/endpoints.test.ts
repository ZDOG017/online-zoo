import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRoute } from "../constants";
import { HttpMethod } from "../types";

/**
 * Layer 2 — Endpoint helpers (`endpoints.ts`).
 * Guards: REST paths and normalizing list/detail JSON. See TESTING.md at repo root.
 */

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
}));

vi.mock("../client", () => ({
  request: requestMock,
}));

import { getPetById, getPets } from "../endpoints";

describe("Layer 2 — API helpers (endpoints.ts) — getPets()", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  describe("Routing", () => {
    it("calls request with pets route and GET — documents the correct REST path for the animals list", async () => {
      requestMock.mockResolvedValue([]);
      await getPets();
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({ route: ApiRoute.PETS, method: HttpMethod.GET }),
      );
    });
  });

  describe("Response shape → UI list", () => {
    it("when API returns a JSON array at root, returns that array — matches older/simple list payloads", async () => {
      requestMock.mockResolvedValue([{ id: 1, name: "A" }]);
      const result = await getPets();
      expect(result).toEqual([{ id: 1, name: "A" }]);
    });

    it("when API wraps items in { data: [...] }, unwraps to an array — matches wrapped responses without breaking callers", async () => {
      requestMock.mockResolvedValue({ data: [{ id: 2 }] });
      const result = await getPets();
      expect(result).toEqual([{ id: 2 }]);
    });

    it("when API returns {}, returns [] — avoids undefined/forEach crashes in the UI when payload is empty", async () => {
      requestMock.mockResolvedValue({});
      const result = await getPets();
      expect(result).toEqual([]);
    });
  });
});

describe("Layer 2 — API helpers (endpoints.ts) — getPetById()", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  describe("Routing and detail payload", () => {
    it("requests pets/:id and returns nested data object — detail pages need one pet record, not the list wrapper", async () => {
      requestMock.mockResolvedValue({ data: { id: 3, name: "Panda" } });
      const result = await getPetById(3);
      expect(result).toEqual({ id: 3, name: "Panda" });
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({ route: "pets/3", method: HttpMethod.GET }),
      );
    });
  });
});
