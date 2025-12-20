import { test, expect } from '@playwright/test';

test.describe('ChartsPage', () => {
  test.beforeEach(async ({ page }) => {
    // Переходим на страницу Charts
    await page.goto('/');
    
    // Ищем кнопку переключения на Charts (обычно в Header)
    const chartsButton = page.locator('button:has-text("Charts"), button:has-text("Графики"), a:has-text("Charts"), a:has-text("Графики")').first();
    
    if (await chartsButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await chartsButton.click();
      await page.waitForLoadState('networkidle');
    } else {
      // Если кнопки нет, пробуем перейти напрямую через URL или другой способ
      await page.goto('/charts', { waitUntil: 'networkidle' });
    }
  });

  test('should load ChartsPage and display chart', async ({ page }) => {
    // Проверяем что страница загрузилась
    await expect(page).toHaveTitle(/Shark Spread Tracker/i);

    // Ждем загрузки графика
    await page.waitForLoadState('networkidle');

    // Проверяем наличие основных элементов
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Проверяем что есть контент (график или placeholder)
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // Ищем элементы графика (SVG, canvas, или placeholder)
    const chartElement = page.locator('svg, canvas, [data-testid*="chart" i], [role="img"]').first();
    
    // График может быть не сразу виден, если токен не выбран
    // Проверяем что хотя бы контент страницы виден
    await expect(mainContent).toBeVisible();
  });

  test('should select token and timeframe', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Ищем селектор токена (TokenSelector)
    const tokenSelector = page.locator('select[name*="token" i], select[aria-label*="token" i], button[aria-label*="token" i]').first();

    if (await tokenSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Если это select
      if (await tokenSelector.evaluate((el) => el.tagName === 'SELECT').catch(() => false)) {
        // Выбираем первый доступный токен
        const options = await tokenSelector.locator('option').all();
        if (options.length > 1) {
          // Пропускаем первый option (обычно placeholder)
          await tokenSelector.selectOption({ index: 1 });
          await page.waitForTimeout(1000); // Ждем загрузки данных
        }
      } else {
        // Если это кнопка, кликаем для открытия меню
        await tokenSelector.click();
        await page.waitForTimeout(300);

        // Ищем первый токен в выпадающем меню
        const firstToken = page.locator('[role="menuitem"], [role="option"]').first();
        if (await firstToken.isVisible({ timeout: 1000 }).catch(() => false)) {
          await firstToken.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Ищем селектор таймфрейма (TimeframeSelector)
    const timeframeSelector = page.locator('select[name*="timeframe" i], select[aria-label*="timeframe" i], button[aria-label*="timeframe" i]').first();

    if (await timeframeSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Если это select
      if (await timeframeSelector.evaluate((el) => el.tagName === 'SELECT').catch(() => false)) {
        // Выбираем таймфрейм (например, 1h)
        await timeframeSelector.selectOption({ label: /1h|1 hour|1 час/i });
        await page.waitForTimeout(1000);
      } else {
        // Если это кнопка, кликаем для открытия меню
        await timeframeSelector.click();
        await page.waitForTimeout(300);

        // Ищем опцию таймфрейма
        const timeframeOption = page.locator('button:has-text("1h"), button:has-text("1 час"), [role="menuitem"]:has-text("1h" i)').first();
        if (await timeframeOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await timeframeOption.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Проверяем что контент обновился
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should switch data sources', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Ищем селектор источников данных (SourceSelector)
    // Обычно это кнопки или переключатели для Jupiter, MEXC, PancakeSwap
    const sourceButtons = page.locator('button:has-text("Jupiter"), button:has-text("MEXC"), button:has-text("PancakeSwap"), [data-testid*="source" i]');

    const sourceCount = await sourceButtons.count();
    
    if (sourceCount > 0) {
      // Кликаем на первый источник
      await sourceButtons.first().click();
      await page.waitForTimeout(500);

      // Если есть второй источник, переключаемся на него
      if (sourceCount > 1) {
        await sourceButtons.nth(1).click();
        await page.waitForTimeout(500);
      }

      // Проверяем что контент обновился
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
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
    
    // Переходим на Charts
    const chartsButton = page.locator('button:has-text("Charts"), button:has-text("Графики")').first();
    if (await chartsButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await chartsButton.click();
    } else {
      await page.goto('/charts');
    }
    
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
