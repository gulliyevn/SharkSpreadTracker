import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { securityHeaders } from './vite.config.security';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Загружаем переменные окружения из .env файлов
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
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
          'i18n-vendor': [
            'i18next',
            'react-i18next',
            'i18next-browser-languagedetector',
          ],
          'ui-vendor': ['lucide-react', 'react-icons'],
          // axios используется только в backend.client.ts, который не используется в основном коде
          // Убираем из manualChunks, чтобы избежать пустого chunk
          // 'axios-vendor': ['axios'],
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
      // ВАЖНО: Порядок прокси важен! Более специфичные маршруты должны быть ПЕРВЫМИ

      // Прокси для HTTP запросов к бэкенду - ДОЛЖЕН БЫТЬ ПЕРВЫМ
      // Этот маршрут должен быть перед другими /api/* маршрутами
      '/api/backend': {
        target: (() => {
          const backendUrl = env.VITE_BACKEND_URL;
          if (!backendUrl) {
            if (mode === 'development') {
              throw new Error(
                'VITE_BACKEND_URL is not set. Please set it in .env file or environment variables.'
              );
            }
            // В production возвращаем пустую строку, чтобы прокси не работал
            // Это заставит использовать прямые запросы или вызовет ошибку
            return '';
          }
          return backendUrl;
        })(),
        changeOrigin: true,
          timeout: 180000, // 180 секунд (3 минуты) таймаут для прокси (бэкенду нужно около 2 минут для загрузки данных)
        rewrite: (path) => {
          // Убираем /api/backend из пути, оставляя остальное
          // /api/backend/socket/sharkStraight -> /socket/sharkStraight
          const rewritten = path.replace(/^\/api\/backend/, '');

          // Логируем только в dev режиме
          if (mode === 'development') {
            console.log('[Proxy] HTTP rewrite:', path, '->', rewritten);
          }

          return rewritten;
        },
        secure: false,
        configure: (proxy, _options) => {
          const target = env.VITE_BACKEND_URL;
          if (!target) {
            if (mode === 'development') {
              console.error(
                '[Proxy] VITE_BACKEND_URL is not set. Proxy will not work.'
              );
            }
            return;
          }

          // Логируем только в dev режиме
          const isDev = mode === 'development';
          if (isDev) {
            console.log('[Proxy] HTTP proxy configured for /api/backend');
            console.log('[Proxy] Target backend:', target);
          }

          proxy.on('proxyReq', (proxyReq, req, _res) => {
            if (isDev) {
              const requestUrl = req.url || '';
              const rewrittenUrl = requestUrl.replace(/^\/api\/backend/, '');
              console.log('[Proxy] HTTP request:', req.method, requestUrl);
              console.log('[Proxy] Proxying to:', `${target}${rewrittenUrl}`);
            }
          });

          proxy.on('proxyRes', (proxyRes, req, _res) => {
            if (isDev) {
              console.log(
                '[Proxy] HTTP response:',
                proxyRes.statusCode,
                'for',
                req.url
              );
            }
          });

          proxy.on('error', (err, _req, _res) => {
            // Ошибки всегда логируем, но только в dev
            if (isDev) {
              console.error('[Proxy] HTTP proxy error:', err.message);
              console.error(
                '[Proxy] Error code:',
                (err as NodeJS.ErrnoException).code
              );
            }
          });
        },
      },
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
            if (mode === 'development') {
              const apiKey = req.headers['x-api-key'];
              if (apiKey) {
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
  };
});
