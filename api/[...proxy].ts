/**
 * Тест: catch-all route прямо в api/ (не в поддиректории)
 * Пропускаем известные endpoints, чтобы не ломать их
 */

export const config = { runtime: "edge" };

const SKIP_PATHS = ['/api/ping', '/api/edge-ping'];

export default async function handler(req: Request) {
  const url = new URL(req.url);
  
  // Пропускаем известные endpoints
  if (SKIP_PATHS.some(path => url.pathname === path)) {
    // Возвращаем 404, чтобы Vercel попробовал другие handlers
    return new Response('Not Found', { status: 404 });
  }
  
  return new Response(
    JSON.stringify({
      ok: true,
      pathname: url.pathname,
      search: url.search,
      method: req.method,
      message: "catch-all in api/ root works",
    }),
    { headers: { "content-type": "application/json" } }
  );
}

