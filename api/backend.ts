/**
 * Backend proxy endpoint для /api/backend/*
 * Обрабатывает все запросы к /api/backend/* в одном файле
 * (Vercel не подхватывает новые catch-all routes в поддиректориях)
 */

// ВАЖНО: Node.js runtime по умолчанию на Vercel
// Убираем config, чтобы использовать Node.js runtime (по умолчанию)
// Node.js runtime позволяет делать запросы к IP-адресам

// ВАЖНО: Node.js Functions используют runtime env (не VITE_ префикс)
const BACKEND_URL =
  process.env.BACKEND_URL || 'http://158.220.122.153:8080';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  
  // Пытаемся получить оригинальный путь из различных источников
  let originalPath = url.pathname;
  
  // Проверяем различные заголовки, которые Vercel может передавать при rewrites
  const possibleHeaders = [
    'x-vercel-rewrite',
    'x-invoke-path', 
    'x-forwarded-path',
    'x-original-path',
    'x-rewrite-path'
  ];
  
  for (const headerName of possibleHeaders) {
    const headerValue = req.headers.get(headerName);
    if (headerValue) {
      originalPath = headerValue;
      break;
    }
  }
  
  // Извлекаем путь после /api/backend
  let path = '';
  if (originalPath.startsWith('/api/backend/')) {
    path = originalPath.replace('/api/backend', '');
  } else if (originalPath === '/api/backend') {
    // Если это просто /api/backend, путь пустой
    path = '/';
  } else {
    // Если путь не начинается с /api/backend, возвращаем 404
    return new Response('Not Found', { status: 404 });
  }
  
  const backendUrl = `${BACKEND_URL}${path}${url.search}`;

  // WebSocket endpoints не поддерживают HTTP fallback
  if (path.startsWith('/socket')) {
    return new Response(
      JSON.stringify({
        error: 'WebSocket endpoint does not support HTTP fallback',
        message: 'This endpoint requires a WebSocket connection',
        endpoint: path,
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

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

