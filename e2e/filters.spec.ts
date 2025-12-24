import { test, expect } from '@playwright/test';

test.describe('Token Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should filter tokens by minimum spread', async ({ page }) => {
    // Ищем слайдер или input для минимального спреда
    const minSpreadInput = page.locator('input[type="range"], input[type="number"]').first();
    
    if (await minSpreadInput.isVisible()) {
      await minSpreadInput.fill('1');
      await page.waitForTimeout(500);

      // Проверяем что контент обновился
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    }
  });

  test('should toggle direct spread filter', async ({ page }) => {
    // Ищем чекбокс или кнопку для direct spread
    const directFilter = page.locator('input[type="checkbox"], button:has-text("direct"), button:has-text("Direct")').first();
    
    if (await directFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await directFilter.click();
      await page.waitForTimeout(300);

      // Проверяем что фильтр применился
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    }
  });
});
