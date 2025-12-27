/**
 * Catch-all route для /api/backend/* проксирования
 * Работает в корне api/, так как новые поддиректории не подхватываются Vercel
 */

export const config = { runtime: "edge" };

// Известные endpoints, которые обрабатываются другими файлами
const SKIP_PATHS = [
  '/api/ping',
  '/api/edge-ping',
  '/api/jupiter',
  '/api/mexc',
  '/api/pancake',
];

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  // Пропускаем известные endpoints - возвращаем 404, чтобы Vercel попробовал другие handlers
  if (SKIP_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return new Response('Not Found', { status: 404 });
  }
  
  // Обрабатываем только /api/backend/*
  if (!pathname.startsWith('/api/backend')) {
    return new Response('Not Found', { status: 404 });
  }
  
  // DEBUG: Минимальный handler для проверки
  return new Response(
    JSON.stringify({
      ok: true,
      pathname: url.pathname,
      search: url.search,
      method: req.method,
      message: "backend proxy in api root works",
    }),
    { headers: { "content-type": "application/json" } }
  );
}

