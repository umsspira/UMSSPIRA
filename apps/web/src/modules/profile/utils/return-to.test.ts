import { INICIO_PATH, rutaDeRegreso, volverALaPantallaAnterior } from './return-to';

function routerFalso() {
  return { back: jest.fn(), push: jest.fn() };
}

describe('volverALaPantallaAnterior (Observación 1)', () => {
  it('con pantallas anteriores en el historial regresa a la última (por ejemplo, la de editar)', () => {
    const router = routerFalso();

    volverALaPantallaAnterior(router, 3);

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('sin pantalla anterior (pestaña nueva) va al Inicio y nunca a /profile', () => {
    const router = routerFalso();

    volverALaPantallaAnterior(router, 1);

    expect(router.push).toHaveBeenCalledWith(INICIO_PATH);
    expect(router.push).not.toHaveBeenCalledWith('/profile');
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('rutaDeRegreso', () => {
  it('acepta rutas internas y rechaza otros sitios', () => {
    expect(rutaDeRegreso('/profile/records')).toBe('/profile/records');
    expect(rutaDeRegreso('//otro-sitio.com')).toBeUndefined();
    expect(rutaDeRegreso('https://otro-sitio.com')).toBeUndefined();
  });
});
