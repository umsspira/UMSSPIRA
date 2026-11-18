import { EventPassRules } from './event-pass.rules';

describe('Vigencia del pase QR', () => {
  const now = new Date('2026-11-11T12:00:00Z');
  const future = new Date('2026-11-12T12:00:00Z');
  const past = new Date('2026-11-10T12:00:00Z');

  it('mantiene activo un pase vigente de una inscripción confirmada', () => {
    expect(
      EventPassRules.resolveEffectiveStatus(
        'VIGENTE', 'CONFIRMADA', 'PUBLICADO', future, now,
      ),
    ).toEqual({ status: 'ACTIVO', isValid: true });
  });

  it('invalida el pase cuando la inscripción está cancelada', () => {
    expect(
      EventPassRules.resolveEffectiveStatus(
        'VIGENTE', 'CANCELADA', 'PUBLICADO', future, now,
      ),
    ).toEqual({ status: 'INVALIDADO', isValid: false });
  });

  it('invalida el pase cuando el evento está cancelado', () => {
    expect(
      EventPassRules.resolveEffectiveStatus(
        'VIGENTE', 'CONFIRMADA', 'CANCELADO', future, now,
      ),
    ).toEqual({ status: 'INVALIDADO', isValid: false });
  });

  it('muestra vencido el pase cuando el evento ya finalizó', () => {
    expect(
      EventPassRules.resolveEffectiveStatus(
        'VIGENTE', 'CONFIRMADA', 'PUBLICADO', past, now,
      ),
    ).toEqual({ status: 'VENCIDO', isValid: false });
  });
});
