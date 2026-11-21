import { act, renderHook } from "@testing-library/react";
import { authenticatedFetch } from "@/shared/services/auth-session";
import { useReview } from "./use-review";

jest.mock("@/shared/services/auth-session", () => ({
  authenticatedFetch: jest.fn(),
  SessionError: class SessionError extends Error {},
}));

const fetchMock = authenticatedFetch as jest.Mock;
const reply = (status: number, body: unknown = {}) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

beforeEach(() => fetchMock.mockReset());

describe("useReview: versión vigente (CA-14.7)", () => {
  it("envía expectedVersion en el cuerpo", async () => {
    fetchMock.mockResolvedValue(reply(200));
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useReview({ applicationId: "a1", onSuccess }));
    await act(async () => {
      await result.current.submitReview({ decision: "APROBADA", expectedVersion: 3 });
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ decision: "APROBADA", expectedVersion: 3 });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("ante 409 marca la vista como desactualizada y no avisa éxito", async () => {
    fetchMock.mockResolvedValue(reply(409, { message: "VERSION_CONFLICT" }));
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useReview({ applicationId: "a1", onSuccess }));
    let ok = true;
    await act(async () => {
      ok = await result.current.submitReview({ decision: "APROBADA", expectedVersion: 2 });
    });
    expect(ok).toBe(false);
    expect(result.current.stale).toBe(true);
    expect(result.current.error).toBe("La solicitud cambió; actualiza el expediente.");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("clearError limpia el estado desactualizado", async () => {
    fetchMock.mockResolvedValue(reply(409));
    const { result } = renderHook(() => useReview({ applicationId: "a1" }));
    await act(async () => {
      await result.current.submitReview({ decision: "APROBADA" });
    });
    act(() => result.current.clearError());
    expect(result.current.stale).toBe(false);
    expect(result.current.error).toBeNull();
  });
});