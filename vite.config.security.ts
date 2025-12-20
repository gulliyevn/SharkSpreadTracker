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
        // Content Security Policy для dev режима
        // В dev режиме Vite использует инлайн-скрипты для HMR, поэтому 'unsafe-inline' необходим для script-src
        // В production (vercel.json) 'unsafe-inline' удалён из script-src для безопасности
        // 'unsafe-inline' для style-src необходим, так как Vite может инлайнить критический CSS
        // 'unsafe-eval' удалён для безопасности
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://lite-api.jup.ag https://api.jup.ag https://api.dexscreener.com https://api.mexc.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
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

