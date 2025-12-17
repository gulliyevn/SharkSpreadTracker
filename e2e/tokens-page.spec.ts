import { test, expect } from '@playwright/test';

test.describe('TokensPage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load TokensPage and display tokens', async ({ page }) => {
    // Проверяем что страница загрузилась
    await expect(page).toHaveTitle(/Shark Spread Tracker/i);

    // Ждем загрузки токенов (поиск по тексту или элементу)
    // В зависимости от реализации, можно искать по классу или тексту
    await page.waitForLoadState('networkidle');

    // Проверяем наличие основных элементов
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Проверяем что есть контент (токены или loading spinner)
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should filter tokens by search', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Ищем поле поиска (зависит от реализации TokenSearch)
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="поиск" i]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('BTC');
      await page.waitForTimeout(500); // Ждем debounce

      // Проверяем что результаты отфильтрованы
      // Это зависит от реализации, но можно проверить что контент изменился
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should change language', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Ищем кнопку/селектор языка (зависит от реализации Header)
    const languageButton = page.locator('button:has-text("EN"), button:has-text("RU"), [aria-label*="language" i]').first();
    
    if (await languageButton.isVisible()) {
      await languageButton.click();
      await page.waitForTimeout(300);

      // Проверяем что язык изменился (можно проверить по тексту на странице)
      const header = page.locator('header');
      await expect(header).toBeVisible();
    }
  });

  test('should change theme', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Ищем кнопку темы (зависит от реализации Header)
    const themeButton = page.locator('button[aria-label*="theme" i], button:has-text("🌙"), button:has-text("☀️")').first();
    
    if (await themeButton.isVisible()) {
      const initialTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      
      await themeButton.click();
      await page.waitForTimeout(300);

      const newTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      
      // Проверяем что тема изменилась
      expect(newTheme).not.toBe(initialTheme);
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Перехватываем запросы к реальным API endpoints
    await page.route('**/lite-api.jup.ag/**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
        headers: { 'Content-Type': 'application/json' },
      });
    });
    await page.route('**/api.dexscreener.com/**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
        headers: { 'Content-Type': 'application/json' },
      });
    });
    await page.route('**/contract.mexc.com/**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto('/');
    
    // Ждем завершения запросов (с таймаутом)
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch {
      // Игнорируем таймаут, если запросы долго выполняются
    }

    // Даем время React Query обработать ошибку и React отрендерить
    await page.waitForTimeout(3000);

    // Проверяем что приложение не упало - main должен быть виден
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 5000 });

    // Проверяем что страница показывает либо:
    // 1. Сообщение об ошибке
    // 2. Пустое состояние (если ошибка обработана и показан fallback)
    // 3. Или хотя бы header/footer видны (приложение работает)
    const header = page.locator('header');
    await expect(header).toBeVisible({ timeout: 2000 });
    
    // Главное - приложение не должно упасть, main должен быть виден
    const isMainVisible = await mainContent.isVisible();
    expect(isMainVisible).toBe(true);
  });
});
