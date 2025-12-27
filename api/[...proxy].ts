/**
 * Тест: catch-all route прямо в api/ (не в поддиректории)
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
      message: "catch-all in api/ root works",
    }),
    { headers: { "content-type": "application/json" } }
  );
}

