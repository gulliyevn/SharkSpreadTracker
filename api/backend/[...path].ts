/**
 * DEBUG: Минимальный handler для проверки, вызывается ли функция
 */

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  return new Response(
    JSON.stringify({
      ok: true,
      pathname: url.pathname,
      search: url.search,
      method: req.method,
    }),
    { headers: { "content-type": "application/json" } }
  );
}
