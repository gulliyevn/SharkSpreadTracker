/**
 * Тестовая Serverless Function для проверки, что Vercel видит /api
 * Endpoint: /api/ping
 * Runtime: Node.js (по умолчанию)
 * 
 * ВАЖНО: Используем Web API формат (Request/Response) для совместимости
 * с новыми версиями Vercel, которые поддерживают это для Node.js runtime
 */

export default async function handler(req: Request) {
  return new Response(
    JSON.stringify({
      success: true,
      type: 'serverless',
      message: 'Vercel Serverless Function работает!',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      runtime: 'nodejs',
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

