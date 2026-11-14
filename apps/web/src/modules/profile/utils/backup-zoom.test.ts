import { MAX_ZOOM_PERCENT, MIN_ZOOM_PERCENT, zoomIn, zoomOut } from './backup-zoom';

describe('zoom del visor de respaldos (T21.7)', () => {
  it('acerca y aleja en pasos de 25 %', () => {
    expect(zoomIn(100)).toBe(125);
    expect(zoomOut(100)).toBe(75);
  });

  it('no pasa de 300 % ni baja de 50 %', () => {
    expect(zoomIn(MAX_ZOOM_PERCENT)).toBe(300);
    expect(zoomIn(290)).toBe(300);
    expect(zoomOut(MIN_ZOOM_PERCENT)).toBe(50);
    expect(zoomOut(60)).toBe(50);
  });
});
