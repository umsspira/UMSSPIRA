import { ocrFailureSchema } from './ocr.schemas';

const token = '10000000-0000-4000-8000-000000000001';
describe('OCR failure contract', () => {
  it('accepts old clients and bounded diagnostics', () => {
    expect(ocrFailureSchema.parse({ token })).toEqual({ token });
    expect(
      ocrFailureSchema.parse({
        token,
        failure: {
          stage: 'document',
          code: 'HTTP_ERROR',
          status: 503,
        },
      }).failure?.status,
    ).toBe(503);
  });
  it.each([
    { stage: 'document', code: 'HTTP_ERROR', status: 200 },
    { stage: 'document', code: 'HTTP_ERROR', status: 503.5 },
    { stage: 'unknown', code: 'TIMEOUT' },
    { stage: 'read', code: 'PROCESSING_ERROR', message: 'document text or token' },
    { stage: 'read', code: 'unbounded arbitrary error text' },
  ])('rejects invalid or arbitrary diagnostic content', (failure) => {
    expect(ocrFailureSchema.safeParse({ token, failure }).success).toBe(false);
  });
});
