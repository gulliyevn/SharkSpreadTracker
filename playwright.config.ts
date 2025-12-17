import { defineConfig, devices } from '@playwright/test';

/**
 * Конфигурация Playwright для E2E тестов
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Максимальное время выполнения одного теста */
  timeout: 30 * 1000,
  expect: {
    /* Максимальное время ожидания для assertions */
    timeout: 5000,
  },
  /* Запускать тесты в файлах параллельно */
  fullyParallel: true,
  /* Fail сборку если есть упавшие тесты */
  forbidOnly: !!process.env.CI,
  /* Retry только в CI */
  retries: process.env.CI ? 2 : 0,
  /* Оптимизация для CI */
  workers: process.env.CI ? 1 : undefined,
  /* Репортер для CI */
  reporter: process.env.CI ? 'html' : 'list',
  /* Общие настройки для всех проектов */
  use: {
    /* Базовый URL для тестов */
    baseURL: 'http://localhost:3000',
    /* Собирать trace при retry */
    trace: 'on-first-retry',
    /* Скриншоты при ошибках */
    screenshot: 'only-on-failure',
  },

  /* Настройка проектов для разных браузеров */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Можно добавить другие браузеры при необходимости
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Запускать dev сервер перед тестами */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
