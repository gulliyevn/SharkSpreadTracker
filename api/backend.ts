/**
 * Backend proxy endpoint
 * Обрабатывает /api/backend/* запросы
 * Используем один файл вместо catch-all, так как новые catch-all routes не работают
 */

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  
  // DEBUG: Минимальный handler
  return new Response(
    JSON.stringify({
      ok: true,
      pathname: url.pathname,
      search: url.search,
      method: req.method,
      message: "backend.ts endpoint works",
    }),
    { headers: { "content-type": "application/json" } }
  );
}

