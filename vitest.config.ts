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
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
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
      ],
      // Ускоряем сборку coverage
      all: false, // Не собираем coverage для всех файлов, только для тех, что импортируются
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

