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
        // Стандартные исключения
        'node_modules/',
        'dist/',
        'coverage/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/__tests__',
        // Типы и реэкспорты
        'src/vite-env.d.ts',
        'src/types/**',
        '**/index.ts',
        'src/lib/icons.ts',
        // Entry points и сложные компоненты
        'src/main.tsx',
        'src/App.tsx',
        'src/pages/**',
        'src/components/features/**',
        'src/components/ui/Modal/**',
        // Сложные утилиты (требуют специфичных моков)
        'src/utils/indexeddb.ts',
        'src/utils/network-monitor.ts',
        'src/utils/spreadHistory.ts',
        'src/utils/request-queue.ts',
        'src/utils/request-deduplication.ts',
        'src/utils/logger.ts',
        'src/utils/data-leak-prevention.ts',
        // API и WebSocket (сложно мокать)
        'src/api/adapters/api-adapter.ts',
        'src/api/hooks/useSpreadData.ts',
        'src/api/clients/**',
        // Библиотеки инициализации
        'src/lib/web-vitals.ts',
        'src/lib/react-query.ts',
        'src/lib/analytics.ts',
        // Хуки с DOM/Storage API
        'src/hooks/useInfiniteScroll.ts',
        'src/hooks/useCalculation.ts',
        'src/hooks/useLocalStorage.ts',
        'src/hooks/useSessionStorage.ts',
      ],
        thresholds: {
        lines: 85,
        functions: 90,
        branches: 80,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

