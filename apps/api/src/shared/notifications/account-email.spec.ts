import { passwordRecoveryHtml, registrationCodeHtml } from './account-email';

const origin = 'https://umsspira.test';

describe('Correos de acceso con diseño institucional', () => {
  it('presenta seis dígitos y conserva los cinco minutos del OTP', () => {
    const html = registrationCodeHtml('123456', origin, 5);
    expect(html.match(/font-size:38px[^>]*>\d<\/td>/g)).toHaveLength(6);
    expect(html).toContain('Válido por 5 minutos');
    expect(html).toContain('paso 2');
    expect(html).not.toContain('24 horas');
    expect(html).not.toContain('solicitud aprobada');
  });

  it('comparte la identidad visual de los dictámenes en ambos correos', () => {
    for (const html of [registrationCodeHtml('123456', origin, 5), passwordRecoveryHtml('Hola', origin)]) {
      expect(html).toContain('#0F172A');
      expect(html).toContain('#FAF6EE');
      expect(html).toContain(`${origin}/assets/events/umsspira-logo-desktop.png`);
      expect(html).toContain('Aviso de seguridad institucional');
    }
  });

  it('usa el enlace original y preserva el plazo del mensaje de recuperación', () => {
    const link = `${origin}/reset-password?token=abc%2B123`;
    const html = passwordRecoveryHtml(`Vence en 60 minutos.\n${link}`, origin);
    expect(html).toContain(`href="${link}"`);
    expect(html).toContain('Crear nueva contraseña');
    expect(html).toContain('60 minutos');
  });

  it('escapa contenido variable y no crea enlaces ejecutables', () => {
    const html = passwordRecoveryHtml('<script>alert(1)</script>\njavascript:alert(1)', 'javascript:alert(1)');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('href=');
    expect(html).not.toContain('src=');
    expect(html).toContain('&lt;script&gt;');
    expect(registrationCodeHtml('<', origin, 5)).toContain('&lt;');
  });
});
