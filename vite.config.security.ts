/**
 * Конфигурация безопасности для Vite
 */

import type { Plugin } from 'vite';
import { loadEnv } from 'vite';

/**
 * Получить URL бэкенда для CSP
 * Используем loadEnv для загрузки переменных окружения из .env файла
 */
function getBackendUrlsForCSP(mode: string): string {
  // Загружаем переменные окружения из .env файла
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_BACKEND_URL;
  
  if (!backendUrl) {
    // Если переменная не установлена, возвращаем пустую строку
    // В dev режиме это нормально, если бэкенд не используется
    return '';
  }

  // Извлекаем хост и порт из URL
  try {
    const url = new URL(backendUrl);
    const host = `${url.protocol}//${url.host}`;
    
    // Для WebSocket добавляем ws:// и wss:// версии
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${url.host}`;
    
    // Возвращаем оба URL (HTTP и WebSocket)
    // Добавляем пробел перед URL для правильного форматирования CSP
    return ` ${host} ${wsUrl}`;
  } catch (error) {
    // Если URL невалидный, логируем ошибку и возвращаем пустую строку
    console.warn('[CSP] Invalid VITE_BACKEND_URL:', backendUrl, error);
    return '';
  }
}

/**
 * Плагин для добавления security headers в dev режиме
 */
export function securityHeaders(): Plugin {
  // Используем замыкание для хранения mode вместо this.mode
  let savedMode = 'development';
  
  return {
    name: 'security-headers',
    configResolved(config) {
      // Сохраняем mode для использования в middleware
      savedMode = config.mode;
    },
    configureServer(server) {
      const mode = savedMode;
      
      server.middlewares.use((_req, res, next) => {
        // Content Security Policy для dev режима
        // В dev режиме Vite и devtools могут использовать инлайн-стили,
        // поэтому здесь допустим 'unsafe-inline' в style-src.
        // В production (vercel.json) style-src уже без 'unsafe-inline'.

        // Добавляем URL бэкенда в connect-src для разрешения подключений
        const backendUrls = getBackendUrlsForCSP(mode);
        const connectSrc = `'self'${backendUrls}`;
        
        res.setHeader(
          'Content-Security-Policy',
          `default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src ${connectSrc}; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`
        );
        // XSS Protection
        res.setHeader('X-XSS-Protection', '1; mode=block');
        // Prevent MIME sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');
        // Prevent clickjacking
        res.setHeader('X-Frame-Options', 'DENY');
        // Referrer Policy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
      });
    },
  };
}

