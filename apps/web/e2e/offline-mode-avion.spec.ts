import { test, expect, type Page } from '@playwright/test';

const USER_EMAIL = process.env.E2E_USER_EMAIL ?? 'demo@umsspira.test';
const USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'demo1234';
const PASSES_ROUTE = '/events/catalog/passes';
// El QR se dibuja como <svg> de 160 px (QRCodeSVG en EventPassCard), no como <canvas> ni <img>.
const QR_SVG = 'svg[width="160"][height="160"]';
const SAVE_BUTTON = /guardar sin conexión/i;
const SAVED_MESSAGE = /se guardó en este dispositivo|guardado sin conexión/i;

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"], input[type="email"]', USER_EMAIL);
  await page.fill('input[name="password"], input[type="password"]', USER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/portal', { timeout: 15_000 });
}

async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller != null,
    undefined,
    { timeout: 15_000 },
  );
}

test.describe('HU08 · Modo Avión', () => {
  test('CA-01 · login → guardar QR → Modo Avión → recargar → ver QR', async ({ page, context }) => {
    await login(page);
    await waitForServiceWorker(page);

    await page.goto(PASSES_ROUTE);
    const saveButton = page.getByRole('button', { name: SAVE_BUTTON });
    test.skip((await saveButton.count()) === 0, 'No hay pase autorizado para la cuenta E2E');
    await saveButton.first().click();
    await expect(page.getByText(SAVED_MESSAGE).first()).toBeVisible({ timeout: 10_000 });

    await context.setOffline(true);
    await page.reload();

    await page.goto(PASSES_ROUTE);
    await expect(
      page.getByText(/sin conexión: se muestran los pases guardados/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator(QR_SVG).first(),
    ).toBeVisible();

    await context.setOffline(false);
  });

  test('CA-04 · logout en Modo Avión no muestra datos privados', async ({ page, context }) => {
    await login(page);
    await waitForServiceWorker(page);

    const logout = page.getByRole('button', { name: /cerrar sesión|logout|salir/i });
    if ((await logout.count()) > 0) {
      await logout.first().click();
      await page.waitForURL('**/login', { timeout: 10_000 }).catch(() => {});
    }

    await context.setOffline(true);
    await page.reload();
    await page.goto(PASSES_ROUTE);

    await expect(page.locator(QR_SVG)).toHaveCount(0);
    await context.setOffline(false);
  });

  test('CA-06 · (HU14) ruta no cacheada muestra la página de respaldo', async ({ page, context }) => {
    await login(page);
    await waitForServiceWorker(page);

    await context.setOffline(true);
    await page.goto('/portal/mensajes');

    await expect(page.getByTestId('offline-title')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('offline-retry')).toBeVisible();
    await expect(page.getByTestId('offline-link-passes')).toBeVisible();
    await expect(page.getByTestId('offline-link-events')).toBeVisible();

    await context.setOffline(false);
  });

  test('CA-06 · QR guardados visibles con el servicio de pases caído', async ({ page, context }) => {
    await login(page);
    await waitForServiceWorker(page);

    await page.goto(PASSES_ROUTE);
    const saveButton = page.getByRole('button', { name: SAVE_BUTTON });
    test.skip((await saveButton.count()) === 0, 'No hay pase autorizado para la cuenta E2E');
    await saveButton.first().click();
    await expect(page.getByText(SAVED_MESSAGE).first()).toBeVisible({ timeout: 10_000 });

    await context.route('**/api/v1/registrations/my-passes', (route) => route.abort());

    await page.reload();
    await page.goto(PASSES_ROUTE);
    await expect(
      page.getByText(/sin conexión: se muestran los pases guardados/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator(QR_SVG).first(),
    ).toBeVisible();
  });

  test('Pantalla de validación (/portal/validacion-offline) abre sin conexión y marca el Modo Avión', async ({ page, context }) => {
    await login(page);
    await waitForServiceWorker(page);

    // Con conexión se visita una vez para que el Service Worker la guarde.
    await page.goto('/portal/validacion-offline');
    await expect(page.getByRole('heading', { name: 'Flujo en Modo Avión' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Auditoría y navegadores' })).toBeVisible();
    await page.waitForTimeout(1500);

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Flujo en Modo Avión' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('hu8-paso-2')).toHaveAttribute('data-estado', 'ok');
    await expect(page.getByTestId('hu8-paso-3')).toHaveAttribute('data-estado', 'ok');

    await context.setOffline(false);
  });
});


