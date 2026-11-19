import { expect, test } from '@playwright/test';

test.describe('HU09 · navegación de tareas principales', () => {
  test('se llega a configuración en un toque desde otra pantalla', async ({ page }) => {
    await page.goto('/mis-pases');

    const settings = page.getByRole('link', { name: 'Abrir configuración de la aplicación' });
    await expect(settings).toBeVisible();
    await settings.click();

    await expect(page).toHaveURL(/\/portal\/configuracion$/);
    await expect(page.getByText('Configuración PWA')).toBeVisible();
  });

  test('Mis códigos QR vuelve a abrir desde la caché sin conexión', async ({ page, context }) => {
    await page.goto('/mis-pases');
    await page.waitForFunction(() => navigator.serviceWorker?.controller != null, undefined, { timeout: 15_000 });
    await page.reload();

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Mis códigos QR' })).toBeVisible();

    await context.setOffline(false);
  });
});
