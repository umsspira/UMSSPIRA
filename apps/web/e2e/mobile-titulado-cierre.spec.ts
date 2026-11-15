/**
 * INT-07 — Cierre de pruebas móviles: seguridad, aprobación y activación.
 * Destino: apps/web/e2e/mobile-titulado-cierre.spec.ts
 *
 * Complementa mobile-titulado-flow.spec.ts; NO modifica las 15 pruebas existentes.
 * Ejecutar con: pnpm --filter web exec playwright test mobile-titulado-cierre.spec.ts --project=mobile-chromium-360
 *
 * La prueba de aprobación + activación REAL es optativa y está protegida por
 * variables de entorno. Requiere confirmar expresamente que NestJS usa Docker LOCAL.
 */
import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';

const WEB_ORIGIN = 'http://localhost:3001';
const MAILPIT_ORIGIN = 'http://localhost:8025';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function webApi(path: string): string {
  return `${WEB_ORIGIN}${path}`;
}

async function readError(response: APIResponse): Promise<string> {
  const text = await response.text().catch(() => '');
  // No incluir tokens, contraseñas ni respuestas completas en la consola.
  return `HTTP ${response.status()} (${new URL(response.url()).pathname}); contenido de respuesta: ${text ? 'recibido' : 'vacío'}`;
}

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page): Promise<void> {
  const info = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body?.scrollWidth ?? 0,
  }));
  expect(info.document, 'El documento no debe desbordar el viewport').toBeLessThanOrEqual(info.viewport + 2);
  expect(info.body, 'El body no debe desbordar el viewport').toBeLessThanOrEqual(info.viewport + 2);
}

async function expectInvalidPayload(response: APIResponse): Promise<void> {
  expect([400, 422], await readError(response)).toContain(response.status());
}

// ------- Casos seguros: no modifican expedientes ni activan cuentas. -------

test.describe('INT-07: cierre de validaciones móviles y seguridad', () => {
  test('activación: pantalla pública visible sin desbordamiento a 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const response = await page.goto('/activate');
    expect(response?.status(), 'Debe abrir la página pública de activación').toBe(200);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByText('UMSSPIRA', { exact: false }).first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test('activación: POST /status rechaza un ID inválido', async ({ request }) => {
    const response = await request.post(webApi('/api/v1/registrations/activate/status'), {
      data: { applicationId: 'id-no-valido' },
    });
    await expectInvalidPayload(response);
  });

  test('activación: POST /resend rechaza un ID inválido', async ({ request }) => {
    const response = await request.post(webApi('/api/v1/registrations/activate/resend'), {
      data: { applicationId: 'id-no-valido' },
    });
    await expectInvalidPayload(response);
  });

  test('activación: POST /verify rechaza un ID inválido', async ({ request }) => {
    const response = await request.post(webApi('/api/v1/registrations/activate/verify'), {
      data: { applicationId: 'id-no-valido', code: '000000' },
    });
    await expectInvalidPayload(response);
  });

  test('activación: POST /activate rechaza un ID inválido', async ({ request }) => {
    const response = await request.post(webApi('/api/v1/registrations/activate'), {
      data: {
        applicationId: 'id-no-valido',
        activationToken: 'no-es-un-token',
        password: 'PasswordSintetico#2026',
      },
    });
    await expectInvalidPayload(response);
  });

  test('corrección: no permite consultar un expediente sin X-Correction-Token', async ({ request }) => {
    const response = await request.get(webApi('/api/v1/registrations/observed'));
    expect([400, 401, 403, 404, 410], await readError(response)).toContain(response.status());
  });

  test('corrección: no permite reenviar un expediente sin token', async ({ request }) => {
    const response = await request.post(webApi('/api/v1/registrations/observed/submit'), {
      data: { expectedVersion: 1 },
    });
    expect([400, 401, 403, 404, 410], await readError(response)).toContain(response.status());
  });

  test('revisión: bloquea la aprobación sin autenticación administrativa', async ({ request }) => {
    const fictitiousId = 'a7f39c9d-5194-4c11-8df0-4aeb47ed0db9';
    const response = await request.post(webApi(`/api/v1/applications/${fictitiousId}/review`), {
      data: { decision: 'APROBADA' },
    });
    expect([401, 403], await readError(response)).toContain(response.status());
  });
});

// ------- Caso real y destructivo sobre un EXPEDIENTE SINTÉTICO LOCAL. -------
// Modo A: INT07_ADMIN_TOKEN + INT07_TEST_EMAIL: prueba aprobación y busca el correo
//         en Mailpit; intenta extraer el código automáticamente.
// Modo B: INT07_ACTIVATION_CODE: expediente YA aprobado; verifica código y activa.
// En ambos modos: INT07_CONFIRM_LOCAL_DB=SI_LOCAL, INT07_APPLICATION_ID y
// INT07_ACTIVATION_PASSWORD. Se ejecuta una sola vez por expediente.

type MailpitRecipient = { Address?: string; address?: string };
type MailpitSummary = {
  ID?: string;
  Subject?: string;
  Created?: string;
  To?: MailpitRecipient[];
};
type MailpitDetail = MailpitSummary & { Text?: string; HTML?: string };

async function findNewActivationMail(
  request: APIRequestContext,
  targetEmail: string,
  since: number,
): Promise<MailpitDetail> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const res = await request.get(`${MAILPIT_ORIGIN}/api/v1/messages?limit=100`);
    if (!res.ok()) throw new Error('Mailpit no responde en localhost:8025');
    const data = (await res.json()) as { messages?: MailpitSummary[] };
    const found = (data.messages ?? []).find((mail) => {
      const recipients = (mail.To ?? []).map((r) => (r.Address ?? r.address ?? '').toLowerCase());
      const createdAt = mail.Created ? Date.parse(mail.Created) : NaN;
      return recipients.includes(targetEmail.toLowerCase()) &&
        (/activ|aprob|umsspira/i.test(mail.Subject ?? '')) &&
        (!Number.isFinite(createdAt) || createdAt >= since - 5_000);
    });
    if (found?.ID) {
      const detail = await request.get(`${MAILPIT_ORIGIN}/api/v1/message/${encodeURIComponent(found.ID)}`);
      if (detail.ok()) return (await detail.json()) as MailpitDetail;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error('No llegó un correo de aprobación/activación al buzón sintético en Mailpit. Comprueba el worker SMTP.');
}

function extractCode(mail: MailpitDetail): string | null {
  const content = `${mail.Text ?? ''}\n${(mail.HTML ?? '').replace(/<[^>]*>/g, ' ')}`;
  const patterns = [
    /c[oó]digo\s+de\s+activaci[oó]n\s*[:：-]?\s*([A-Z0-9-]{4,16})/i,
    /c[oó]digo\s*[:：-]\s*([A-Z0-9-]{4,16})/i,
    /tu\s+c[oó]digo\s+es\s*[:：-]?\s*([A-Z0-9-]{4,16})/i,
  ];
  for (const pattern of patterns) {
    const value = content.match(pattern)?.[1];
    if (value) return value;
  }
  return null;
}

function extractActivationToken(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;
  for (const name of ['activationToken', 'token', 'verificationToken']) {
    if (typeof obj[name] === 'string' && (obj[name] as string).trim()) return obj[name] as string;
  }
  return extractActivationToken(obj.data);
}

test('INT-07: aprobación, correo y activación real de expediente sintético local', async ({ request }) => {
  test.setTimeout(180_000);
  const applicationId = process.env.INT07_APPLICATION_ID?.trim() ?? '';
  const adminToken = process.env.INT07_ADMIN_TOKEN?.trim() ?? '';
  const targetEmail = process.env.INT07_TEST_EMAIL?.trim() ?? '';
  const password = process.env.INT07_ACTIVATION_PASSWORD ?? '';
  const manualCode = process.env.INT07_ACTIVATION_CODE?.trim() ?? '';
  const manualToken = process.env.INT07_ACTIVATION_TOKEN?.trim() ?? '';
  const confirmedLocal = process.env.INT07_CONFIRM_LOCAL_DB === 'SI_LOCAL';

  test.skip(
    !confirmedLocal || !UUID_PATTERN.test(applicationId) || !password || (!manualCode && !(adminToken && targetEmail)),
    'Integración opcional: requiere INT07_CONFIRM_LOCAL_DB=SI_LOCAL, INT07_APPLICATION_ID, INT07_ACTIVATION_PASSWORD y (INT07_ACTIVATION_CODE o INT07_ADMIN_TOKEN + INT07_TEST_EMAIL).',
  );

  // Este chequeo confirma el destino HTTP local. La BD de NestJS se debe verificar
  // MANUALMENTE en el log de arranque: debe ser 127.0.0.1:5432, no Supabase.
  expect(new URL(WEB_ORIGIN).hostname).toBe('localhost');

  let activationCode = manualCode;
  if (!activationCode) {
    // Aprobación real por API, con el mismo permiso solicitudes:review que usa el modal.
    const since = Date.now();
    const approval = await request.post(webApi(`/api/v1/applications/${applicationId}/review`), {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { decision: 'APROBADA' },
    });
    expect(approval.ok(), `No fue posible aprobar el expediente sintético: ${await readError(approval)}`).toBeTruthy();

    const mail = await findNewActivationMail(request, targetEmail, since);
    expect(mail.Subject, 'El correo de aprobación debe tener asunto').toBeTruthy();
    activationCode = extractCode(mail) ?? '';
    expect(
      activationCode,
      'El correo llegó, pero no se reconoció automáticamente el código. Puedes ejecutar el modo B con INT07_ACTIVATION_CODE tomado de Mailpit.',
    ).not.toBe('');
  }

  // Verificar el código. El token temporal de activación se obtiene de la respuesta.
  const verify = await request.post(webApi('/api/v1/registrations/activate/verify'), {
    data: { applicationId, code: activationCode },
  });
  expect(verify.ok(), `Falló la verificación del código: ${await readError(verify)}`).toBeTruthy();
  const verifyBody = (await verify.json()) as unknown;
  const activationToken = extractActivationToken(verifyBody) ?? manualToken;
  expect(
    activationToken,
    'La verificación no devolvió activationToken/token. Revisa el contrato de ActivateView o proporciona INT07_ACTIVATION_TOKEN.',
  ).not.toBe('');

  // Activar la cuenta REAL: modifica el estado del expediente de prueba.
  const activate = await request.post(webApi('/api/v1/registrations/activate'), {
    data: { applicationId, activationToken, password },
  });
  expect(activate.ok(), `Falló la activación real: ${await readError(activate)}`).toBeTruthy();

  // Nunca imprimir ni adjuntar el código, token de activación o contraseña.
  console.log('INT-07: expediente sintético aprobado/verificado/activado correctamente.');
});
