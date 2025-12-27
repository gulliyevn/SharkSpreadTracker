/**
 * Тест: проверяем, работает ли вообще что-то в api/backend
 */

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "backend-test endpoint works",
      url: req.url,
    }),
    { headers: { "content-type": "application/json" } }
  );
}

