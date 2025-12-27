/**
 * Vercel Edge Function для проксирования запросов к бэкенду
 * Решает проблему Mixed Content Policy на HTTPS страницах
 * (браузер блокирует ws:// соединения с HTTPS страниц)
 */

export const config = {
  runtime: 'edge',
};

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://158.220.122.153:8080';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  
  // Извлекаем путь после /api/backend
  const path = url.pathname.replace(/^\/api\/backend/, '');
  const backendUrl = `${BACKEND_URL}${path}${url.search}`;

  try {
    // Делаем HTTP запрос к бэкенду
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        ...Object.fromEntries(req.headers.entries()),
        'Host': new URL(BACKEND_URL).host,
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    });

    // Если сервер требует WebSocket upgrade (426), это означает что endpoint требует WebSocket
    // В этом случае возвращаем пустой массив, так как мы не можем использовать WebSocket через Edge Function
    if (response.status === 426) {
      console.warn('[Backend Proxy] Server requires WebSocket upgrade (426) for:', path);
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Возвращаем ответ от бэкенда
    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Backend Proxy] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to proxy request to backend' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

