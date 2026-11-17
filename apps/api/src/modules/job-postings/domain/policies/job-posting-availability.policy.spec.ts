import { isJobPostingAvailable } from './job-posting-availability.policy';

describe('isJobPostingAvailable', () => {
  const now = new Date('2026-11-16T12:00:00.000Z');

  it.each([
    ['PUBLICADO', null, true],
    ['PUBLICADA', null, true],
    ['CERRADO', null, false],
    ['CERRADA', null, false],
    ['PUBLICADO', new Date('2026-11-16T11:59:59.999Z'), false],
    ['PUBLICADA', new Date('2026-11-16T12:00:00.001Z'), true],
    ['ACTIVA', null, false],
    ['DISPONIBLE', null, false],
    [null, null, false],
  ] as const)(
    'evalúa estado %s y fecha de cierre %s',
    (status, closingDate, expected) => {
      expect(isJobPostingAvailable(status, closingDate, now)).toBe(expected);
    },
  );
});
