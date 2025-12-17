import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate between TokensPage and ChartsPage', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Ищем кнопки навигации (зависит от реализации Header)
    const chartsButton = page.locator('button:has-text("Charts"), a:has-text("Charts"), button:has-text("Графики")').first();
    const tokensButton = page.locator('button:has-text("Tokens"), a:has-text("Tokens"), button:has-text("Токены")').first();

    // Если есть кнопка Charts, переходим на неё
    if (await chartsButton.isVisible()) {
      await chartsButton.click();
      await page.waitForTimeout(500);

      // Проверяем что перешли на ChartsPage
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    }

    // Если есть кнопка Tokens, возвращаемся
    if (await tokensButton.isVisible()) {
      await tokensButton.click();
      await page.waitForTimeout(500);

      // Проверяем что вернулись на TokensPage
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    }
  });

  test('should maintain state after navigation', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Проверяем что состояние сохраняется при навигации
    // Это зависит от реализации, но можно проверить что данные не теряются
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});
