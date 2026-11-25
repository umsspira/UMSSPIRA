import {
  canTransitionJobPostingStatus,
  normalizeJobPostingStatus,
} from './job-posting-status.policy';

describe('normalizeJobPostingStatus', () => {
  it.each([
    ['PUBLICADA', 'PUBLICADO'],
    ['publicado', 'PUBLICADO'],
    [' ACTIVA ', 'PUBLICADO'],
    ['ACTIVO', 'PUBLICADO'],
    ['PUBLISHED', 'PUBLICADO'],
    ['PAUSADA', 'PAUSADO'],
    ['PAUSED', 'PAUSADO'],
    ['CERRADA', 'CERRADO'],
    ['closed', 'CERRADO'],
    ['BORRADOR', null],
    ['DISPONIBLE', null],
    ['', null],
    [null, null],
    [undefined, null],
  ] as const)('%s → %s', (raw, expected) => {
    expect(normalizeJobPostingStatus(raw)).toBe(expected);
  });
});

describe('canTransitionJobPostingStatus', () => {
  it.each([
    ['PUBLICADO', 'PAUSADO', true],
    ['PUBLICADO', 'CERRADO', true],
    ['PAUSADO', 'PUBLICADO', true],
    ['PAUSADO', 'CERRADO', true],
    ['CERRADO', 'PUBLICADO', false],
    ['CERRADO', 'PAUSADO', false],
    ['PUBLICADO', 'PUBLICADO', false],
  ] as const)('%s → %s = %s', (from, to, expected) => {
    expect(canTransitionJobPostingStatus(from, to)).toBe(expected);
  });
});