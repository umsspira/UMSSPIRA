import { resolveConnectionMode } from './use-connection-mode';

describe('resolveConnectionMode', () => {
  it('con red: En línea', () => {
    expect(resolveConnectionMode(true, 'wifi')).toBe('en-linea');
    expect(resolveConnectionMode(true)).toBe('en-linea');
  });
  it('sin red y el sistema informa tipo «none»: Modo avión', () => {
    expect(resolveConnectionMode(false, 'none')).toBe('modo-avion');
  });
  it('sin red en cualquier otro caso: Sin señal', () => {
    expect(resolveConnectionMode(false)).toBe('sin-senal');
    expect(resolveConnectionMode(false, 'wifi')).toBe('sin-senal');
    expect(resolveConnectionMode(false, 'cellular')).toBe('sin-senal');
  });
});
