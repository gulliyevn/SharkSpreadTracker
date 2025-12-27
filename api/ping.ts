/**
 * Тестовая Edge Function для проверки, что Vercel видит /api
 * Endpoint: /api/ping
 * Runtime: Edge (быстрее и надежнее чем Node.js)
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  return new Response(
    JSON.stringify({
      success: true,
      type: 'edge',
      message: 'Vercel Edge Function работает!',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      runtime: 'edge',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

