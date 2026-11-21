import { test, expect } from '@playwright/test';

// Permite usar Chrome ya instalado sin descargar un navegador para esta comprobación.
test.use({ channel: process.env.E2E_CHROME_CHANNEL, video: 'off' });

test.beforeEach(async ({ page }) => {
  // La ayuda no requiere datos de negocio. También se aísla la sesión de la navbar.
  await page.route('**/api/v1/**', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'Sesión de prueba no iniciada' } }),
  }));
});

for (const width of [390, 768, 1280]) {
  test(`las guías funcionan sin desbordamiento horizontal a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto('/ayuda/bolsa-de-trabajo');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'Ayuda · Bolsa de trabajo' })).toBeVisible();

    for (const label of ['Titulado', 'Reclutador', 'Cómo funciona la afinidad']) {
      await page.getByRole('tab', { name: label, exact: true }).click();
      const panel = page.getByRole('tabpanel', { name: label, exact: true });
      await expect(panel).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

      if (label === 'Cómo funciona la afinidad') {
        await expect(panel.getByRole('heading', { name: 'Contenido de afinidad pendiente' })).toBeVisible();
        continue;
      }

      await expect(panel.getByRole('article')).toHaveCount(4);
      await expect(panel.getByRole('link', { name: 'Ir a la pantalla', exact: true })).toHaveCount(4);
      const images = panel.getByRole('img');
      await expect.poll(() => images.evaluateAll((elements) => elements.every((element) => {
        const image = element as HTMLImageElement;
        return image.complete && image.naturalWidth > 0;
      }))).toBe(true);

      const firstCard = await panel.getByRole('article').nth(0).boundingBox();
      const secondCard = await panel.getByRole('article').nth(1).boundingBox();
      expect(firstCard).not.toBeNull();
      expect(secondCard).not.toBeNull();
      if (width < 768) {
        expect(secondCard!.y).toBeGreaterThan(firstCard!.y + firstCard!.height);
        const tabs = page.getByRole('tab');
        const firstTab = await tabs.nth(0).boundingBox();
        const secondTab = await tabs.nth(1).boundingBox();
        expect(secondTab!.y).toBeGreaterThan(firstTab!.y + firstTab!.height);
        expect(firstTab!.height).toBeGreaterThanOrEqual(44);
      } else {
        expect(secondCard!.x).toBeGreaterThan(firstCard!.x + firstCard!.width);
        expect(Math.abs(secondCard!.y - firstCard!.y)).toBeLessThanOrEqual(1);
      }

      const screenshotPath = testInfo.outputPath(`ayuda-${label.toLowerCase()}-${width}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await testInfo.attach(`ayuda-${label.toLowerCase()}-${width}`, {
        path: screenshotPath,
        contentType: 'image/png',
      });
    }
  });
}

test('abre la guía del reclutador y permite cambiar de pestaña con teclado', async ({ page }) => {
  await page.goto('/ayuda/bolsa-de-trabajo?tab=reclutador');
  const recruiterTab = page.getByRole('tab', { name: 'Reclutador', exact: true });
  await expect(recruiterTab).toHaveAttribute('aria-selected', 'true');
  await recruiterTab.focus();
  await page.keyboard.press('ArrowRight');
  const affinityTab = page.getByRole('tab', { name: 'Cómo funciona la afinidad', exact: true });
  await expect(affinityTab).toBeFocused();
  await expect(affinityTab).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'Titulado', exact: true })).toBeFocused();
  await expect(page.getByRole('heading', { name: '1. Buscar una vacante' })).toBeVisible();
});
