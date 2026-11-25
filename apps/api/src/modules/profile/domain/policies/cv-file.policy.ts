import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';

export const MAX_CV_BYTES = 4 * 1024 * 1024;
export const CV_TYPE_MESSAGE = 'El CV debe ser un archivo PDF';
export const CV_SIZE_MESSAGE = 'El archivo supera el tamaño máximo de 4 MB';

// La extensión y la firma binaria se validan juntas porque el MIME del navegador puede falsificarse.
export function validateCvFile(name: string, bytes: Uint8Array): void {
  const extension = name.toLowerCase().split('.').pop() ?? '';
  const isPdf = [0x25, 0x50, 0x44, 0x46, 0x2d].every(
    (value, index) => bytes[index] === value,
  );

  if (extension !== 'pdf' || !isPdf) {
    throw new BusinessRuleError('invalid', 'INVALID_CV_TYPE', CV_TYPE_MESSAGE);
  }
  if (bytes.length > MAX_CV_BYTES) {
    throw new BusinessRuleError('invalid', 'CV_TOO_LARGE', CV_SIZE_MESSAGE);
  }
}
