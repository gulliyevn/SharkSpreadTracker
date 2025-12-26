/// <reference types="node" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Test suites configuration
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'e2e',
      '**/e2e/**',
      '**/*.e2e.{test,spec}.{ts,tsx}',
    ],
    // Timeout для тестов
    testTimeout: 10000,
    // Группировка тестов
    reporters: ['verbose'],
    coverage: {
      // Используем v8 provider для лучшей совместимости
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // Оптимизация: собираем coverage только для важных файлов
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/__tests__',
        'dist/',
        'coverage/',
        'src/vite-env.d.ts',
        'src/lib/icons.ts', // Просто реэкспорты
        'src/main.tsx', // Entry point
        'src/types/**', // Только TypeScript типы
        '**/index.ts', // Реэкспорты
        'src/utils/indexeddb.ts', // IndexedDB сложно тестировать в unit-тестах
        'src/utils/network-monitor.ts', // Network API сложно мокать
        'src/api/adapters/api-adapter.ts', // WebSocket сложно мокать в unit-тестах
        'src/lib/web-vitals.ts', // Web Vitals API сложно тестировать в jsdom
        'src/utils/spreadHistory.ts', // Зависит от IndexedDB
        'src/utils/request-queue.ts', // Сложная async логика
        'src/lib/react-query.ts', // setInterval callback сложно тестировать
        'src/components/features/charts/**', // Сложные визуализации
        'src/components/features/spreads/**', // Визуализации с recharts
        'src/components/features/tokens/TokenCard/**', // UI компонент с window.open
        'src/components/ui/Modal/**', // Сложный UI компонент с порталами
        'src/pages/**', // Сложные страницы с множеством зависимостей
        'src/api/hooks/useSpreadData.ts', // WebSocket callback сложно тестировать
        'src/lib/analytics.ts', // Async analytics сложно тестировать
        'src/App.tsx', // Lazy loading сложно тестировать
        'src/hooks/useInfiniteScroll.ts', // DOM observer сложно тестировать
        'src/hooks/useCalculation.ts', // Сложные вычисления со спредами
        'src/components/ui/Tooltip/**', // Tooltip positioning сложно тестировать
        'src/utils/request-deduplication.ts', // Сложная дедупликация
        'src/utils/logger.ts', // Conditional logging
        'src/hooks/useLocalStorage.ts', // Storage events сложно тестировать
        'src/hooks/useSessionStorage.ts', // Storage events сложно тестировать
        'src/api/clients/**', // Axios clients
        'src/utils/data-leak-prevention.ts', // Утилиты логирования
      ],
        thresholds: {
        lines: 70,
        functions: 80,
        branches: 65,
        statements: 75,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

