/**
 * Моки для E2E тестов
 * Используется Playwright route interception для мокирования API запросов
 */

import type { Page } from '@playwright/test';
import { mockTokensData } from './mock-tokens-data';

/**
 * Настроить моки для всех API запросов
 */
export async function setupMocks(page: Page) {
  // Мокируем WebSocket fallback (HTTP запросы к бэкенду)
  await page.route('**/api/backend/**', async (route) => {
    const url = route.request().url();
    
    // Мокируем запрос токенов
    if (url.includes('/sharkStraight') || url.includes('/tokens')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTokensData),
      });
      return;
    }
    
    // Для других запросов возвращаем пустой ответ
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Мокируем запросы к Jupiter API
  await page.route('**/api/jupiter/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        outputMint: 'So11111111111111111111111111111111111111112',
        inAmount: '1000000',
        outAmount: '1000000',
        priceImpactPct: 0.1,
      }),
    });
  });

  // Мокируем запросы к MEXC API
  await page.route('**/api/mexc/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        symbol: 'BTCUSDT',
        price: '50000',
        bidPrice: '49999',
        askPrice: '50001',
      }),
    });
  });

  // Мокируем запросы к PancakeSwap API
  await page.route('**/api/pancake/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        pairs: [
          {
            priceUsd: '50000',
            priceNative: '1.0',
          },
        ],
      }),
    });
  });
}

/**
 * Очистить все моки
 */
export async function clearMocks(page: Page) {
  await page.unroute('**/api/**');
}

