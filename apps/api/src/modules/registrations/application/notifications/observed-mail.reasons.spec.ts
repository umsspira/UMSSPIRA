import { buildObservedMail } from './observed-mail';

const base = { fullName: 'Ana Perez', correctionUrl: 'https://portal.test/register/correction/abc' };

describe('buildObservedMail con varios motivos', () => {
  it('lista los motivos en el orden elegido y una sola explicacion', () => {
    const mail = buildObservedMail({
      ...base,
      reasons: ['Documento ilegible', 'Datos incompletos'],
      explanation: 'Sube un PDF nitido',
    });
    expect(mail.text.indexOf('Documento ilegible')).toBeLessThan(mail.text.indexOf('Datos incompletos'));
    expect(mail.text).toContain('Justificación del auditor: Sube un PDF nitido');
    expect(mail.html.indexOf('Documento ilegible')).toBeLessThan(mail.html.indexOf('Datos incompletos'));
  });

  it('no repite motivos', () => {
    const mail = buildObservedMail({ ...base, reasons: ['A', 'A', 'B'], explanation: 'x' });
    expect(mail.text.match(/- A/g)).toHaveLength(1);
  });

  it('mantiene el formato de una observacion antigua', () => {
    const mail = buildObservedMail({ ...base, category: 'Documento ilegible', note: 'Repite la foto' });
    expect(mail.text).toContain('Categoría de observación: Documento ilegible');
    expect(mail.text).toContain('Justificación del auditor: Repite la foto');
  });

  it('escapa html en motivos y explicacion', () => {
    const mail = buildObservedMail({ ...base, reasons: ['<b>x</b>'], explanation: '<script>1</script>' });
    expect(mail.html).not.toContain('<script>1</script>');
    expect(mail.html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});