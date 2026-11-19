import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const publicPages = [
  {
    name: 'registro',
    path: '/register',
  },
  {
    name: 'inicio-sesion',
    path: '/login',
  },
  {
    name: 'recuperacion',
    path: '/forgot-password',
  },
  {
    name: 'solicitar-correccion',
    path: '/register/correction',
  },
];
test.describe('INT-07: recorrido móvil del Titulado', () => {
  for (const route of publicPages) {
    test(`${route.name}: carga correctamente a 360px`, async ({
      page,
    }, testInfo) => {
      const response = await page.goto(route.path);
      expect(response).not.toBeNull();
      expect(response!.status()).toBeLessThan(400);
      await expect(page.locator('body')).toBeVisible();
      const overflow = await page.evaluate(() => {
        const documentWidth =
          document.documentElement.scrollWidth;
        return documentWidth - window.innerWidth;
      });
      expect(
        overflow,
        `Desbordamiento horizontal en ${route.path}`,
      ).toBeLessThanOrEqual(2);
      await testInfo.attach(`mobile-${route.name}`, {
        body: await page.screenshot({
          fullPage: true,
        }),
        contentType: 'image/png',
      });
    });
  }
});
test.describe('INT-07: validaciones funcionales en móvil', () => {
  test('registro: marca los campos obligatorios', async ({ page, request }, testInfo) => {
page.on('response', async (response) => {
  if (!response.url().includes('/api/v1/')) return;
  const method = response.request().method();
  const path = new URL(response.url()).pathname.replace(
    /\/sessions\/[^/]+/g,
    '/sessions/[oculto]',
  );
  const status = response.status();
  console.log(`[INT-07] ${method} ${path} -> HTTP ${status}`);
  if (status >= 400) {
    try {
      const body = await response.json() as {
        error?: {
          code?: string;
          message?: string;
        };
      };
      console.log('[INT-07] Error API:', {
        code: body.error?.code,
        message: body.error?.message,
      });
    } catch {
      console.log('[INT-07] Respuesta de error no JSON');
    }
  }
});
    await page.goto('/register');
    await page.getByRole('button', {
      name: 'Continuar',
      exact: true,
    }).click();
    await expect(
      page.locator('input[name="correo"]'),
    ).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/register\/?$/, {
      timeout: 30_000,
    });
  });
  test('BUG-02: acepta 254 caracteres sin truncar', async ({
    page,
  }, testInfo) => {
    const correo =
      `${'a'.repeat(64)}@` +
      `${'b'.repeat(63)}.` +
      `${'c'.repeat(63)}.` +
      `${'d'.repeat(57)}.com`;
    expect(correo).toHaveLength(254);
    await page.goto('/register');
    const input = page.locator('input[name="correo"]');
    await input.fill(correo);
    await expect(input).toHaveValue(correo);
    await page.getByRole('button', {
      name: 'Continuar',
      exact: true,
    }).click();
    // Los otros campos están vacíos, pero el correo debe ser válido.
    await expect(input).toHaveAttribute('aria-invalid', 'false');
    await testInfo.attach('registro-correo-254', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });
  test('BUG-02: rechaza 255 caracteres sin truncar', async ({
    page,
  }, testInfo) => {
    const correo =
      `${'a'.repeat(64)}@` +
      `${'b'.repeat(63)}.` +
      `${'c'.repeat(63)}.` +
      `${'d'.repeat(58)}.com`;
    expect(correo).toHaveLength(255);
    await page.goto('/register');
    const input = page.locator('input[name="correo"]');
    await input.fill(correo);
    await expect(input).toHaveValue(correo);
    await page.getByRole('button', {
      name: 'Continuar',
      exact: true,
    }).click();
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(
      page.getByText(/no puede superar los 254 caracteres/i),
    ).toBeVisible();
    await testInfo.attach('registro-correo-255', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });
  test('documentos: exige una sesión de registro', async ({
    page,
  }) => {
    await page.goto('/register/document');
    await expect(
      page.getByText(
        'Primero completa tus datos personales para iniciar tu solicitud.',
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: 'Completar mis datos',
      }),
    ).toBeVisible();
  });
  test('recuperación: valida el correo antes del envío', async ({
    page,
  }) => {
    await page.goto('/forgot-password');
    await page.locator('#email').fill('correo-invalido');
    await page.getByRole('button', {
      name: 'Enviar enlace',
    }).click();
    await expect(
      page.locator('#email-error'),
    ).toContainText(/correo electrónico válido/i);
    await expect(page).toHaveURL(/\/forgot-password\/?$/);
  });
});
test('INT-07: recuperación solicita enlace a la API local', async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.INT07_RUN_INTEGRATION !== '1',
    'Requiere API local y base de datos de desarrollo.',
  );
  page.on('response', (response) => {
    if (response.url().includes('/api/v1/')) {
      console.log(
        `[INT-07] API: ${response.status()} ${response.request().method()} ${response.url()}`,
      );
    }
  });
  page.on('requestfailed', (request) => {
    if (request.url().includes('/api/v1/')) {
      console.log(
        `[INT-07] Petición fallida: ${request.url()} - ${request.failure()?.errorText}`,
      );
    }
  });
  await page.goto('/forgot-password');
  // Cuenta sintética: no utiliza el correo de una persona real.
  const correo = `qa-int07-${Date.now()}@example.com`;
  await page.locator('#email').fill(correo);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/auth/password-recovery/request') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', {
    name: 'Enviar enlace',
  }).click();
  const apiResponse = await responsePromise;
  console.log('[INT-07] Estado HTTP:', apiResponse.status());
  console.log('[INT-07] Respuesta API:', await apiResponse.text());
  expect(
    apiResponse.ok(),
    'La API debe aceptar la solicitud de recuperación',
  ).toBeTruthy();
  await expect(
    page.getByRole('status').filter({
      hasText: 'Si existe una cuenta activa',
    }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole('button', {
      name: /Reenviar enlace en \d+s/,
    }),
  ).toBeDisabled();
  await testInfo.attach('recuperacion-solicitada', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});
test(
  'INT-07: registro real hasta verificación de correo',
  async ({ page, request }, testInfo) => {
    test.setTimeout(120_000);
    test.skip(
      process.env.INT07_RUN_INTEGRATION !== '1',
      'Requiere API y base de datos locales.',
    );
  const unique = Date.now().toString();
  const correo = `qa-int07-${unique}@example.com`;
    page.on('response', (response) => {
      const pathname = new URL(response.url()).pathname;
      if (
        pathname.endsWith('/registrations/sessions') ||
        pathname.includes('/verification')
      ) {
        console.log(
          `[INT-07] ${response.request().method()} HTTP ${response.status()}`,
        );
      }
    });
  await page.goto('/register');
  await page.locator('[name="nombres"]').fill('Prueba');
  await page.locator('[name="apellidos"]').fill('Movil');
  await page.locator('[name="ci"]').fill(unique.slice(-8));
  await page.locator('[name="expedidoEn"]').selectOption({
    index: 1,
  });
  await page.locator('[name="correo"]').fill(correo);
  await page.locator('[name="telefono"]').fill(
    '7' + unique.slice(-7),
  );
  const carrera = page.locator('[name="carreraId"]');
  await expect(carrera).toBeEnabled();
  await carrera.selectOption(
    '10000000-0000-4000-8000-000000000001',
  );
  await page.locator('[name="anioEgreso"]').selectOption(
    '2024',
  );
  await page.locator('[name="codigoSis"]').fill(
    unique.slice(-9),
  );
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/registrations/sessions') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', {
    name: 'Continuar',
    exact: true,
  }).click();
  const response = await responsePromise;
  const registro = await response.json() as {
    data?: {
      sessionToken?: string;
    };
  };
  expect(registro.data?.sessionToken).toBeTruthy();
  const sessionResponse = await request.get(
    `http://localhost:3001/api/v1/registrations/sessions/${
      encodeURIComponent(registro.data!.sessionToken!)
    }`,
    { timeout: 10_000 },
  );
  console.log(
    '[INT-07] Consulta de sesión:',
    sessionResponse.status(),
  );
  if (sessionResponse.ok()) {
    const session = await sessionResponse.json() as {
      data?: {
        hasVerificationCode?: boolean;
        codeExpiresInSeconds?: number;
        resendAvailableInSeconds?: number;
      };
    };
    console.log('[INT-07] Estado OTP:', {
      generado: session.data?.hasVerificationCode,
      vigencia: session.data?.codeExpiresInSeconds,
      reenvioDisponibleEn:
        session.data?.resendAvailableInSeconds,
    });
  }
  expect(
    response.ok(),
    `El registro devolvió HTTP ${response.status()}`,
  ).toBeTruthy();
  await expect(page).toHaveURL(
    /\/register\/verify-email\/?$/,
  );
  await expect(
    page.getByRole('heading', {
      name: /verifica tu correo electr[oó]nico/i,
    }),
  ).toBeVisible();
  // INT-07: consultar el OTP del registro en Mailpit.
  const mailpitBaseUrl = 'http://localhost:8025';
  const mailpitQuery = `to:"${correo}"`;
  type MailpitSearch = {
    messages: Array<{ ID: string }>;
  };
  type MailpitMessage = {
    Text?: string;
    HTML?: string;
  };
  const searchUrl = `${mailpitBaseUrl}/api/v1/search`;
  // El correo puede tardar unos segundos en llegar.
  await expect.poll(
    async () => {
      const response = await request.get(searchUrl, {
        params: { query: mailpitQuery },
      });
      if (!response.ok()) {
        throw new Error(
          `Mailpit devolvió HTTP ${response.status()}`,
        );
      }
      const result =
        (await response.json()) as MailpitSearch;
      return result.messages.length;
    },
    {
      message: 'Esperando el código de verificación en Mailpit',
      timeout: 120_000,
      intervals: [1000, 2000, 3000],
    },
  ).toBeGreaterThan(0);
  const searchResponse = await request.get(searchUrl, {
    params: { query: mailpitQuery },
  });
  expect(searchResponse.ok()).toBeTruthy();
  const searchResult =
    (await searchResponse.json()) as MailpitSearch;
  const mailId = searchResult.messages[0].ID;
  const messageResponse = await request.get(
    `${mailpitBaseUrl}/api/v1/message/${encodeURIComponent(mailId)}`,
  );
  expect(messageResponse.ok()).toBeTruthy();
  const message =
    (await messageResponse.json()) as MailpitMessage;
  const messageText =
    message.Text ||
    (message.HTML ?? '').replace(/<[^>]+>/g, ' ');
  // Evita seleccionar accidentalmente otro número del correo.
  const codes = Array.from(new Set(messageText.match(/\b\d{6}\b/g) ?? []));
  expect(
    codes,
    'El correo debe contener un único código de seis dígitos',
  ).toHaveLength(1);
  const otp = codes[0];
  // Completar las seis casillas reales del formulario.
  for (let i = 0; i < 6; i++) {
    await page.getByRole('textbox', {
      name: `Dígito ${i + 1} de 6`,
    }).fill(otp[i]);
  }
  const verifyButton = page.getByRole('button', {
    name: 'Verificar correo',
    exact: true,
  });
  await expect(verifyButton).toBeEnabled();
  await verifyButton.click();
  // El registro debe avanzar hasta la carga de documentos.
  await expect(page).toHaveURL(
    /\/register\/document\/?$/,
    { timeout: 20_000 },
  );
  await expect(
    page.getByRole('heading', {
      name: 'Carga de documento de respaldo',
    }),
  ).toBeVisible();
  await testInfo.attach('int07-correo-verificado', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  // INT07-03: carga de documento válido en móvil.
  const pdfPath = join(
    __dirname,
    'fixtures',
    'int07-respaldo-prueba.pdf',
  );
  // Seleccionar un tipo válido del catálogo.
  const tipoDocumento = page.locator(
    'select[name="tipoDocumento"]',
  );
  await expect(tipoDocumento).toBeVisible();
  await tipoDocumento.selectOption({ index: 1 });
  // Adjuntar el PDF sintético.
  await page
    .locator('[data-testid="document-input"]')
    .setInputFiles(pdfPath);
  // Aceptar la declaración jurada.
  const declaracion = page.locator('#declaracion-jurada');
  await expect(declaracion).toBeVisible();
  await declaracion.check();
  await expect(declaracion).toBeChecked();
  // Comprobar que se habilita el envío.
  const finalizar = page.getByRole('button', {
    name: 'Finalizar solicitud',
  });
  await expect(finalizar).toBeEnabled({
    timeout: 15_000,
  });
  await testInfo.attach('int07-documento-preparado', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  // Enviar el documento al backend.
  await finalizar.click();
  // Confirmar que llegamos a la revisión.
  await expect(page).toHaveURL(
    /\/register\/review\/?$/,
    { timeout: 30_000 },
  );
  await testInfo.attach('int07-revision-solicitud', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  // INT07-04: entrega definitiva de la solicitud.
  const entregarSolicitud = page.getByRole('button', {
    name: 'Entregar solicitud',
    exact: true,
  });
  await expect(entregarSolicitud).toBeVisible();
  await expect(entregarSolicitud).toBeDisabled();
  // Aceptar la declaración del resumen.
  const declaracionFinal = page.getByRole('checkbox');
  await expect(declaracionFinal).toHaveCount(1);
  await declaracionFinal.check();
  await expect(entregarSolicitud).toBeEnabled();
  await testInfo.attach('int07-antes-de-entrega', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  // Enviar la solicitud definitiva.

  const submitResponsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        '/api/v1/registrations/submit' &&
      response.request().method() === 'POST',
  );

  await entregarSolicitud.click();

  const submitResponse = await submitResponsePromise;

  console.log(
    '[INT-07] Entrega definitiva:',
    submitResponse.status(),
  );

  expect(
    submitResponse.ok(),
    `La entrega definitiva devolvió HTTP ${submitResponse.status()}`,
  ).toBeTruthy();

  await expect(page).toHaveURL(
    /\/register\/confirmation\/?$/,
    { timeout: 30_000 },
  );

  await expect(
    page.getByRole('heading', {
      name: '¡Solicitud enviada con éxito!',
    }),
  ).toBeVisible();
  await testInfo.attach('int07-solicitud-confirmada', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  // INT07-05: descargar y validar la constancia PDF.
  const descargarConstancia = page.getByRole('button', {
    name: 'Guardar constancia en PDF',
  });
  await expect(descargarConstancia).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await descargarConstancia.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  const downloadedPath = await download.path();
  expect(downloadedPath).toBeTruthy();
  if (!downloadedPath) {
    throw new Error('No se pudo acceder al PDF descargado');
  }
  const pdfBytes = await readFile(downloadedPath);
  expect(pdfBytes.subarray(0, 5).toString('ascii')).toBe(
    '%PDF-',
  );
  expect(pdfBytes.length).toBeGreaterThan(1000);
  await testInfo.attach('int07-constancia-pdf', {
    body: pdfBytes,
    contentType: 'application/pdf',
  });
  },
);

test(
  'INT-07: corrección pública exige datos de identidad',
  async ({ page }, testInfo) => {
    let solicitudesEnviadas = 0;

    page.on('request', (request) => {
      if (
        request.method() === 'POST' &&
        new URL(request.url()).pathname.startsWith('/api/v1/')
      ) {
        solicitudesEnviadas++;
      }
    });

    await page.goto('/register/correction');

    await expect(
      page.getByRole('heading', {
        name: 'Solicitar enlace de corrección',
      }),
    ).toBeVisible();

    await page.getByRole('button', {
      name: 'Solicitar enlace',
      exact: true,
    }).click();

    await expect(
      page.locator('[aria-invalid="true"]').first(),
    ).toBeVisible();

    await expect(page).toHaveURL(
      /\/register\/correction\/?$/,
    );

    expect(solicitudesEnviadas).toBe(0);

    await testInfo.attach('int07-correccion-validacion', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  },
);

test(
  'INT-07: enlace de corrección con formato inválido',
  async ({ page }, testInfo) => {
    await page.goto('/register/correction/token.invalido');

    await expect(page.getByRole('main')).toBeVisible();

    // No debe permitir entrar al formulario de edición.
    await expect(
      page.getByRole('button', {
        name: 'Revisar cambios',
      }),
    ).toHaveCount(0);

    await expect(
      page.getByRole('button', {
        name: 'Entregar solicitud',
      }),
    ).toHaveCount(0);

    // Comprobar que la pantalla no desborda los 360 px.
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth -
      window.innerWidth,
    );

    expect(overflow).toBeLessThanOrEqual(2);

    await testInfo.attach('int07-enlace-invalido', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  },
);
  test('INT-07: solicitud de enlace de corrección desde móvil', async ({ page }) => {
  let datosEnviados: unknown = null;

  await page.route(
    '**/api/v1/registrations/observed/request-link',
    async (route) => {
      datosEnviados = route.request().postDataJSON();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            message: 'Solicitud recibida correctamente.',
          },
        }),
      });
    },
  );

  await page.goto('/register/correction');

  const formulario = page.locator('form');

  await formulario.locator('input').first().fill('9876543');

  const departamento = formulario.locator('select').first();
  await departamento.selectOption({ index: 1 });

  const expedidoEn = await departamento.inputValue();

  await page.getByRole('button', {
    name: 'Solicitar enlace',
    exact: true,
  }).click();

  await expect(
  page.getByRole('alert').filter({
    hasText: 'Solicitud recibida correctamente.',
  }),
  ).toContainText('Solicitud recibida correctamente.');

  expect(datosEnviados).toMatchObject({
    ci: '9876543',
    expedidoEn,
  });

  const desbordamiento = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );

  expect(desbordamiento).toBeLessThanOrEqual(2);

});
test('INT-07: reemplazo real de documento y reenvío de corrección', async ({ page }) => {
  test.setTimeout(120_000);

  const correctionUrl = process.env.INT07_CORRECTION_URL?.trim();

  test.skip(
    process.env.INT07_RUN_CORRECTION !== '1' || !correctionUrl,
    'La corrección real requiere habilitación explícita y un enlace vigente',
  );

  const url = new URL(correctionUrl!);

  expect(['localhost', '127.0.0.1']).toContain(url.hostname);
  expect(url.port).toBe('3001');
  expect(url.pathname).toMatch(
    /^\/register\/correction\/[A-Za-z0-9_-]{1,128}$/,
  );

  // Abrir el enlace como Titulado, sin sesión administrativa.
  await page.goto(url.toString());

  await expect(
    page.getByRole('heading', {
      name: 'Corrige tu solicitud',
    }),
  ).toBeVisible();

  // Comprobar que el correo registrado no puede editarse.
  await expect(page.locator('#email')).toHaveJSProperty(
    'readOnly',
    true,
  );

  // Sustituir el documento con el PDF sintético.
  const archivoPDF = join(
    process.cwd(),
    'e2e',
    'fixtures',
    'int07-respaldo-prueba.pdf',
  );

  await page.locator('input[type="file"]').setInputFiles(
    archivoPDF,
  );

  const revisar = page.getByRole('button', {
    name: 'Revisar cambios',
  });

  await expect(revisar).toBeEnabled();
  await revisar.click();

  // Aceptar la declaración del resumen.
  await page.getByRole('checkbox').check();

  const reemplazo = page.waitForResponse(
    (response) =>
      response.url().includes(
        '/api/v1/registrations/observed/document',
      ) &&
      response.request().method() === 'POST',
  );

  const reenvio = page.waitForResponse(
    (response) =>
      response.url().includes(
        '/api/v1/registrations/observed/submit',
      ) &&
      response.request().method() === 'POST',
  );

  await page.getByRole('button', {
    name: 'Entregar solicitud',
  }).click();

  const respuestaDocumento = await reemplazo;
  expect(
    respuestaDocumento.status(),
    'La sustitución del documento debe funcionar',
  ).toBeGreaterThanOrEqual(200);
  expect(respuestaDocumento.status()).toBeLessThan(300);

  const respuestaEntrega = await reenvio;
  expect(
    respuestaEntrega.status(),
    'El reenvío debe funcionar',
  ).toBeGreaterThanOrEqual(200);
  expect(respuestaEntrega.status()).toBeLessThan(300);

  await expect(
    page.getByRole('heading', {
      name: 'Corrección entregada',
    }),
  ).toBeVisible();

  const desbordamiento = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );

  expect(desbordamiento).toBeLessThanOrEqual(2);
 });
