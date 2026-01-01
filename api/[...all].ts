/**
 * Catch-all route для обработки /api/backend/* и других динамических маршрутов
 * Работает в корне api/, так как новые поддиректории не подхватываются Vercel
 */

export const config = { runtime: "edge" };

// Известные endpoints, которые обрабатываются другими файлами
const SKIP_PATHS = [
  '/api/ping',
  '/api/edge-ping',
  '/api/jupiter',
  '/api/mexc',
  '/api/pancake',
];

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  // Пропускаем известные endpoints - возвращаем 404, чтобы Vercel попробовал другие handlers
  if (SKIP_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return new Response('Not Found', { status: 404 });
  }
  
  // Обрабатываем только /api/backend/*
  if (!pathname.startsWith('/api/backend')) {
    return new Response('Not Found', { status: 404 });
  }
  
  // Проксируем на backend.ts
  // Извлекаем путь после /api/backend
  const path = pathname.replace(/^\/api\/backend/, '') || '/';
  
  // ВАЖНО: Edge Functions используют runtime env (не VITE_ префикс)
  const BACKEND_URL =
    process.env.BACKEND_URL || 'http://158.220.122.153:8080';
  
  const backendUrl = `${BACKEND_URL}${path}${url.search}`;

  console.log('[Backend Proxy] Request:', {
    path: pathname,
    extractedPath: path,
    backendUrl,
    method: req.method,
  });

  // ВАЖНО: /socket/sharkStraight поддерживает HTTP fallback
  // Согласно документации API, если WebSocket handshake не удался,
  // сервер возвращает HTTP 200 с JSON payload (массив объектов StraightData)
  // Поэтому проксируем запросы к /socket/* как обычные HTTP запросы

  try {
    const requestBody =
      req.method !== 'GET' && req.method !== 'HEAD'
        ? await req.text()
        : undefined;

    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SharkSpreadTracker/1.0',
      },
      body: requestBody,
    });

    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html') || responseText.trim().startsWith('<!')) {
      return new Response(
        JSON.stringify({
          error: 'Backend returned HTML instead of JSON',
          requestedPath: path,
          backendUrl,
          responseStatus: response.status,
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

    return new Response(responseText, {
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

