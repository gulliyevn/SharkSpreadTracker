/**
 * Vercel Edge Function для проксирования запросов к бэкенду
 * Используется для HTTP fallback когда WebSocket недоступен (HTTPS страницы)
 */

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  // На Vercel переменные окружения доступны через process.env
  // VITE_ префикс используется только на клиенте, на сервере используем без префикса
  const backendUrl = process.env.VITE_BACKEND_URL || process.env.BACKEND_URL;
  
  if (!backendUrl) {
    return new Response(
      JSON.stringify({ error: 'BACKEND_URL is not configured. Please set VITE_BACKEND_URL in Vercel environment variables.' }),
      { 
        status: 500,
        headers: { "content-type": "application/json" } 
      }
    );
  }

  try {
    // Получаем путь из URL (убираем /api/backend)
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/backend/, '');
    
    // Формируем URL для бэкенда
    const targetUrl = `${backendUrl}${path}${url.search}`;

    // Проксируем запрос к бэкенду
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // Передаем body только если это не GET запрос
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    });

    // Если бэкенд возвращает 426 (Upgrade Required), это нормально для WebSocket endpoints
    // Возвращаем понятное сообщение вместо ошибки
    if (response.status === 426) {
      return new Response(
        JSON.stringify({ 
          error: 'WebSocket endpoint requires WebSocket connection',
          message: 'This endpoint requires a WebSocket connection. Use wss:// protocol instead of HTTP.',
          endpoint: targetUrl
        }),
        {
          status: 426,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }

    // Возвращаем ответ от бэкенда
    return new Response(await response.text(), {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Proxy error',
        message: error instanceof Error ? error.message : String(error),
        backendUrl: backendUrl
      }),
      { 
        status: 500,
        headers: { "content-type": "application/json" } 
      }
    );
  }
}
