import { ocrFailure, OcrTimeoutError } from "./ocr-errors";
describe("OCR diagnostics", () => {
  it("keeps stage, status and timeout without sending exception text", () => {
    const error = Object.assign(new Error("secret token and document text"), {
      status: 403,
    });
    const diagnosed = ocrFailure(error, "document");
    expect(diagnosed.failure).toEqual({
      stage: "document",
      code: "HTTP_ERROR",
      status: 403,
    });
    expect(JSON.stringify(diagnosed)).not.toContain("secret");
    expect(ocrFailure(new OcrTimeoutError(), "read").failure.code).toBe(
      "TIMEOUT",
    );
  });
});
