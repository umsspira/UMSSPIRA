import { validateScheduledPublicationDate } from './scheduled-publication.policy';

describe('fecha de publicación programada', () => {
  const now = new Date('2026-11-13T12:00:00Z');

  it('acepta una fecha futura', () => {
    expect(() =>
      validateScheduledPublicationDate(
        new Date('2026-11-13T12:01:00Z'),
        now,
      ),
    ).not.toThrow();
  });

  it.each([
    new Date('2026-11-13T11:59:00Z'),
    new Date('2026-11-13T12:00:00Z'),
    new Date('fecha inválida'),
  ])('rechaza una fecha que no es futura o es inválida', (scheduledAt) => {
    expect(() =>
      validateScheduledPublicationDate(scheduledAt, now),
    ).toThrow('La fecha de publicación debe ser futura');
  });
});
