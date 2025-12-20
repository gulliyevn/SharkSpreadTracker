import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { securityHeaders } from './vite.config.security';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), securityHeaders()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Оптимизация сборки
    minify: 'esbuild', // esbuild быстрее чем terser
    target: 'es2020', // Современный target для меньшего размера
    rollupOptions: {
      output: {
        manualChunks: {
          // Выделяем vendor библиотеки для лучшего кэширования
          'react-vendor': ['react', 'react-dom', 'react/jsx-runtime'],
          'query-vendor': ['@tanstack/react-query'],
          'chart-vendor': ['recharts'],
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'ui-vendor': ['lucide-react', 'react-icons'],
          // Выделяем axios отдельно, так как он используется везде
          'axios-vendor': ['axios'],
        },
        // Оптимизация имен файлов для лучшего кэширования
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 600,
    // Увеличиваем лимит для source maps (если нужны)
    sourcemap: false, // Отключаем source maps для production (ускоряет сборку)
  },
  server: {
    port: 3000,
    cors: true,
    proxy: {
      // Прокси для обхода CORS в dev-режиме
      // Jupiter API использует lite-api.jup.ag/tokens/v2 (работает без ключа)
      // api.jup.ag/tokens/v2 требует Pro план
      '^/api/jupiter/.*': {
        target: 'https://lite-api.jup.ag',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/jupiter/, ''),
        secure: true,
        // Увеличиваем таймауты для надежности
        timeout: 30000,
        // Vite proxy автоматически передает все заголовки из запроса клиента
        // x-api-key добавляется в jupiterClient и будет передан через прокси
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Логируем заголовки для диагностики (только в dev)
            if (process.env.NODE_ENV === 'development') {
              const apiKey = req.headers['x-api-key'];
              if (apiKey) {
                // eslint-disable-next-line no-console
                console.log('[Proxy] Jupiter API: x-api-key header found');
              } else {
                console.warn('[Proxy] Jupiter API: x-api-key header missing!');
              }
            }
          });
          proxy.on('error', (err, _req, _res) => {
            console.error('[Proxy] Jupiter API error:', err.message);
            // Если прокси не работает, можно вернуть ошибку или использовать fallback
          });
        },
      },
      '^/api/mexc/.*': {
        target: 'https://api.mexc.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mexc/, '/api'), // /api/mexc/v3/exchangeInfo -> /api/v3/exchangeInfo
        secure: true,
      },
      '^/api/pancake/.*': {
        target: 'https://api.dexscreener.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pancake/, ''),
        secure: true,
      },
    },
  },
});

