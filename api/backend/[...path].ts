/**
 * Vercel Edge Function для проксирования запросов к бэкенду
 * Решает проблему Mixed Content Policy на HTTPS страницах
 * (браузер блокирует ws:// соединения с HTTPS страниц)
 */

export const config = {
  runtime: 'edge',
};

// ВАЖНО: Edge Functions используют runtime env (не VITE_ префикс)
// VITE_ переменные доступны только на этапе сборки фронтенда
const BACKEND_URL =
  process.env.BACKEND_URL || 'http://158.220.122.153:8080';

export default async function handler(req: Request) {
  // ВАЖНО: Логируем ВСЕ запросы для диагностики
  // Если этот лог не появляется в Vercel, значит Edge Function не вызывается
  console.log('[Backend Proxy] ===== EDGE FUNCTION CALLED =====');
  console.log('[Backend Proxy] Request URL:', req.url);
  console.log('[Backend Proxy] Request Method:', req.method);
  console.log('[Backend Proxy] Request Headers:', Object.fromEntries(req.headers.entries()));
  
  const url = new URL(req.url);

  // Извлекаем путь после /api/backend
  const path = url.pathname.replace(/^\/api\/backend/, '');
  const backendUrl = `${BACKEND_URL}${path}${url.search}`;

  console.log('[Backend Proxy] Request:', {
    path: url.pathname,
    extractedPath: path,
    backendUrl,
    method: req.method,
    fullUrl: req.url,
  });

  // ВАЖНО: WebSocket endpoints не поддерживают HTTP fallback
  // Vercel Edge Functions не могут проксировать WebSocket соединения
  // Если путь начинается с "socket", возвращаем явную ошибку
  if (path.startsWith('/socket')) {
    console.warn('[Backend Proxy] ⚠️ WebSocket endpoint detected:', path);
    console.warn('[Backend Proxy] WebSocket endpoints do not support HTTP fallback');
    console.warn('[Backend Proxy] Vercel Edge Functions cannot proxy WebSocket connections');
    
    return new Response(
      JSON.stringify({
        error: 'WebSocket endpoint does not support HTTP fallback',
        message: 'This endpoint requires a WebSocket connection, which cannot be proxied through Vercel Edge Functions',
        endpoint: path,
        suggestion: 'Use WebSocket directly from the client, or implement a proper HTTP API endpoint on the backend',
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
    // Делаем HTTP запрос к бэкенду
    // Только для НЕ-WebSocket endpoints (проверка выше уже отфильтровала /socket/*)
    
    // Сохраняем body один раз, если нужно
    const requestBody =
      req.method !== 'GET' && req.method !== 'HEAD'
        ? await req.text()
        : undefined;

    console.log('[Backend Proxy] 🔄 Making HTTP request to backend...');
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SharkSpreadTracker/1.0',
      },
      body: requestBody,
    });
    
    console.log('[Backend Proxy] 📥 Response status:', response.status);

    console.log('[Backend Proxy] Response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
    });

    // Получаем текст ответа один раз
    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || '';

    // Используем уже полученный текст ответа
    const data = responseText;

    // Если бэкенд вернул HTML вместо JSON, это ошибка
    // Проверяем и content-type, и начало содержимого (может быть HTML без правильного content-type)
    // Согласно документации API, бэкенд должен вернуть JSON при HTTP fallback
    if (contentType.includes('text/html') || data.trim().startsWith('<!')) {
      console.error('[Backend Proxy] ❌ Backend returned HTML instead of JSON');
      console.error('[Backend Proxy] Requested path:', path);
      console.error('[Backend Proxy] Full backend URL:', backendUrl);
      console.error('[Backend Proxy] Response status:', response.status);
      console.error(
        '[Backend Proxy] Response headers:',
        Object.fromEntries(response.headers.entries())
      );
      console.error(
        '[Backend Proxy] Response preview (first 500 chars):',
        data.substring(0, 500)
      );

      // Возвращаем ошибку с деталями для диагностики
      return new Response(
        JSON.stringify({
          error: 'Backend returned HTML instead of JSON. This usually means:',
          possibleCauses: [
            '1. Backend endpoint is incorrect or not configured',
            '2. Backend is returning a default HTML page (404 or error page)',
            '3. Backend requires WebSocket upgrade but HTTP fallback is not properly implemented',
            '4. Backend URL is incorrect',
          ],
          requestedPath: path,
          backendUrl,
          responseStatus: response.status,
          responsePreview: data.substring(0, 200),
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
