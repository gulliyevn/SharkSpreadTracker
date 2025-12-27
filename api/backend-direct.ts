/**
 * Тест: проверяем, работает ли файл напрямую в api/ (не в поддиректории)
 */

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  return new Response(
    JSON.stringify({
      ok: true,
      message: "backend-direct endpoint works",
      pathname: url.pathname,
    }),
    { headers: { "content-type": "application/json" } }
  );
}

