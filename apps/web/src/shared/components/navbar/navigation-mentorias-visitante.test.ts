import { navigationFor } from './navigation';

const mentorias = (role: Parameters<typeof navigationFor>[0]) =>
  navigationFor(role).find((section) => section.id === 'mentorship');

describe('HU13: Mentorías sin iniciar sesión', () => {
  it('CA01: el visitante solo ve «Sobre las mentorías»', () => {
    expect(mentorias(null)?.items.map((item) => item.label)).toEqual(['Sobre las mentorías']);
  });

  it('CA03: el visitante no ve las opciones privadas', () => {
    const labels = mentorias(null)?.items.map((item) => item.label) ?? [];
    expect(labels).not.toContain('Red de mentorías');
    expect(labels).not.toContain('Mi perfil de mentor');
    expect(labels).not.toContain('Solicitudes recibidas');
  });

  it('CA02/CA06/CA07: la opción apunta a la sección pública, sin ruta protegida', () => {
    expect(mentorias(null)?.items[0].href).toBe('/portal/institucional?tab=mentorias');
  });

  it('con sesión iniciada «Sobre las mentorías» ya no aparece', () => {
    for (const role of ['titulado', 'empresa', 'administrador'] as const) {
      const labels = mentorias(role)?.items.map((item) => item.label) ?? [];
      expect(labels).not.toContain('Sobre las mentorías');
    }
  });
});