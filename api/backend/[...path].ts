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

  console.log('[Backend Proxy] Request:', {
    path: url.pathname,
    extractedPath: path,
    backendUrl,
    method: req.method,
  });

  try {
    // Делаем HTTP запрос к бэкенду
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SharkSpreadTracker/1.0',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    });

    console.log('[Backend Proxy] Response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
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
    const contentType = response.headers.get('content-type') || '';
    const data = await response.text();
    
    // Если бэкенд вернул HTML вместо JSON, это ошибка
    // Проверяем и content-type, и начало содержимого (может быть HTML без правильного content-type)
    if (contentType.includes('text/html') || data.trim().startsWith('<!')) {
      console.error('[Backend Proxy] Backend returned HTML instead of JSON');
      console.error('[Backend Proxy] Backend URL:', backendUrl);
      console.error('[Backend Proxy] Response preview:', data.substring(0, 500));
      return new Response(
        JSON.stringify({ 
          error: 'Backend returned HTML instead of JSON. Check backend URL and endpoint.',
          backendUrl,
          responsePreview: data.substring(0, 200)
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'application/json',
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

