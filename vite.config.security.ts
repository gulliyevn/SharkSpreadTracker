/**
 * Конфигурация безопасности для Vite
 */

import type { Plugin } from 'vite';

/**
 * Плагин для добавления security headers в dev режиме
 */
export function securityHeaders(): Plugin {
  return {
    name: 'security-headers',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        // Content Security Policy
        // В dev режиме Vite использует инлайн-скрипты для HMR, поэтому 'unsafe-inline' необходим
        // В production это не требуется, так как все скрипты в отдельных файлах
        // 'unsafe-eval' удалён для безопасности
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://lite-api.jup.ag https://api.dexscreener.com https://contract.mexc.com;"
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

