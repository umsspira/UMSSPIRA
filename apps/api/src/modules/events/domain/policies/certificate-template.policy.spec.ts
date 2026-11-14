import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import {
  MAX_CERTIFICATE_TEMPLATE_BYTES,
  missingCertificateFields,
  validateCertificateTemplate,
} from './certificate-template.policy';

const validPdf = Buffer.from('%PDF-1.4\ncontenido\n%%EOF\n', 'latin1');

function codeOf(action: () => unknown): string | undefined {
  try {
    action();
  } catch (error) {
    return error instanceof BusinessRuleError ? error.code : 'OTHER';
  }
  return undefined;
}

describe('validateCertificateTemplate', () => {
  it('acepta un PDF válido', () => {
    expect(validateCertificateTemplate('modelo.pdf', validPdf)).toBe('application/pdf');
  });

  it('rechaza un archivo vacío', () => {
    expect(codeOf(() => validateCertificateTemplate('modelo.pdf', Buffer.alloc(0)))).toBe(
      'TEMPLATE_EMPTY',
    );
  });

  it('rechaza un archivo que supera el límite', () => {
    const big = Buffer.alloc(MAX_CERTIFICATE_TEMPLATE_BYTES + 1, 1);
    expect(codeOf(() => validateCertificateTemplate('modelo.pdf', big))).toBe('TEMPLATE_TOO_LARGE');
  });

  it('rechaza formatos no admitidos', () => {
    expect(codeOf(() => validateCertificateTemplate('modelo.png', validPdf))).toBe(
      'TEMPLATE_FORMAT_NOT_ALLOWED',
    );
    expect(codeOf(() => validateCertificateTemplate('modelo.pdf', Buffer.from('hola')))).toBe(
      'TEMPLATE_FORMAT_NOT_ALLOWED',
    );
  });

  it('rechaza un PDF dañado (sin marca de fin)', () => {
    expect(
      codeOf(() => validateCertificateTemplate('modelo.pdf', Buffer.from('%PDF-1.4\ncortado'))),
    ).toBe('TEMPLATE_DAMAGED');
  });
});

describe('missingCertificateFields', () => {
  it('no reporta faltantes cuando el evento tiene nombre y fecha', () => {
    expect(missingCertificateFields({ title: 'Feria', startDate: new Date() })).toEqual([]);
  });

  it('reporta nombre y fecha faltantes', () => {
    expect(missingCertificateFields({ title: '  ', startDate: null })).toEqual([
      'EVENT_NAME',
      'EVENT_DATE',
    ]);
  });
});
