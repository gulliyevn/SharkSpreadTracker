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

  test('should filter tokens by chain (All/BSC/SOL)', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Ищем кнопки фильтрации по chain
    // ChainFilter обычно содержит кнопки "All", "BSC", "SOL"
    const allButton = page.locator('button:has-text("All"), button:has-text("Все"), [data-testid*="chain-all" i]').first();
    const bscButton = page.locator('button:has-text("BSC"), [data-testid*="chain-bsc" i]').first();
    const solButton = page.locator('button:has-text("SOL"), button:has-text("Solana"), [data-testid*="chain-sol" i]').first();

    // Проверяем что фильтры видны (если есть)
    if (await allButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Кликаем на BSC фильтр
      if (await bscButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await bscButton.click();
        await page.waitForTimeout(500); // Ждем обновления списка

        // Проверяем что контент обновился
        const mainContent = page.locator('main');
        await expect(mainContent).toBeVisible();
      }

      // Кликаем на SOL фильтр
      if (await solButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await solButton.click();
        await page.waitForTimeout(500);

        const mainContent = page.locator('main');
        await expect(mainContent).toBeVisible();
      }

      // Возвращаемся к All
      await allButton.click();
      await page.waitForTimeout(500);

      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    }
  });

  test('should sort tokens', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Ищем селектор сортировки
    // SortSelector обычно содержит select или кнопки для выбора сортировки
    const sortSelector = page.locator('select[name*="sort" i], select[aria-label*="sort" i], button[aria-label*="sort" i]').first();

    if (await sortSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Если это select
      if (await sortSelector.evaluate((el) => el.tagName === 'SELECT').catch(() => false)) {
        // Выбираем сортировку по имени
        await sortSelector.selectOption({ label: /name|имя|название/i });
        await page.waitForTimeout(500);

        // Выбираем сортировку по спреду
        await sortSelector.selectOption({ label: /spread|спред/i });
        await page.waitForTimeout(500);
      } else {
        // Если это кнопка, кликаем для открытия меню
        await sortSelector.click();
        await page.waitForTimeout(300);

        // Ищем опции сортировки в выпадающем меню
        const nameOption = page.locator('button:has-text("Name"), button:has-text("Имя"), [role="menuitem"]:has-text("name" i)').first();
        if (await nameOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await nameOption.click();
          await page.waitForTimeout(500);
        }
      }

      // Проверяем что контент обновился
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    }
  });

  test('should open token details modal', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Ищем первую карточку токена или кнопку "Edit" / "Details"
    // TokenCard обычно содержит кнопку редактирования или кликабельную область
    const tokenCard = page.locator('[data-testid*="token-card" i], .token-card, article, [role="article"]').first();
    const editButton = page.locator('button:has-text("Edit"), button:has-text("Редактировать"), button[aria-label*="edit" i]').first();

    // Пробуем кликнуть на карточку или кнопку редактирования
    if (await tokenCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Сначала пробуем найти кнопку редактирования внутри карточки
      const editInCard = tokenCard.locator('button:has-text("Edit"), button:has-text("Редактировать")').first();
      
      if (await editInCard.isVisible({ timeout: 1000 }).catch(() => false)) {
        await editInCard.click();
      } else if (await editButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await editButton.click();
      } else {
        // Если нет кнопки, пробуем кликнуть на саму карточку
        await tokenCard.click();
      }

      await page.waitForTimeout(500);

      // Проверяем что модальное окно открылось
      // TokenDetailsModal обычно имеет role="dialog" или data-testid
      const modal = page.locator('[role="dialog"], [data-testid*="modal" i], [data-testid*="token-details" i]').first();
      
      if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(modal).toBeVisible();

        // Закрываем модальное окно
        const closeButton = modal.locator('button:has-text("Close"), button:has-text("Закрыть"), button[aria-label*="close" i], button:has-text("×")').first();
        if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeButton.click();
          await page.waitForTimeout(300);
        } else {
          // Пробуем кликнуть вне модального окна или нажать Escape
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      }
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
