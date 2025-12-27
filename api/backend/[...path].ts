/**
 * Vercel Edge Function для проксирования запросов к бэкенду
 * Решает проблему Mixed Content Policy на HTTPS страницах
 * (браузер блокирует ws:// соединения с HTTPS страниц)
 */

export const config = {
  runtime: 'edge',
};

const BACKEND_URL =
  process.env.VITE_BACKEND_URL || 'http://158.220.122.153:8080';

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

  try {
    // Делаем HTTP запрос к бэкенду
    // Согласно документации API, если WebSocket handshake не удался,
    // сервер должен вернуть HTTP 200 с JSON payload
    //
    // ПРОБЛЕМА: Бэкенд требует WebSocket upgrade заголовки, но не реализует HTTP fallback
    // Решение: пробуем сначала обычный HTTP запрос, если не работает - пробуем с WebSocket заголовками
    // но без реального WebSocket соединения (Edge Function не поддерживает WebSocket)

    // Сохраняем body один раз, если нужно
    const requestBody =
      req.method !== 'GET' && req.method !== 'HEAD'
        ? await req.text()
        : undefined;

    // ВАЖНО: Бэкенд может требовать WebSocket upgrade для /socket/sharkStraight
    // Пробуем разные варианты запросов, чтобы получить данные
    
    // Вариант 1: Обычный HTTP запрос
    console.log('[Backend Proxy] 🔄 Trying standard HTTP request...');
    let response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SharkSpreadTracker/1.0',
      },
      body: requestBody,
    });
    
    console.log('[Backend Proxy] 📥 First attempt status:', response.status);

    // Если получили ошибку, пробуем с WebSocket заголовками
    // Это может помочь бэкенду понять, что мы пытаемся сделать WebSocket handshake
    // и вернуть JSON fallback (если он реализован)
    if (response.status === 426 || (response.status >= 400 && response.status !== 200)) {
      console.log(
        '[Backend Proxy] ⚠️ Received error status, trying with WebSocket headers...'
      );
      console.log('[Backend Proxy] 🔄 Second attempt with WebSocket headers...');
      
      // Пробуем с WebSocket заголовками
      response = await fetch(backendUrl, {
        method: req.method,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SharkSpreadTracker/1.0',
          Upgrade: 'websocket',
          Connection: 'Upgrade',
          'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', // Базовый ключ для handshake
          'Sec-WebSocket-Version': '13',
        },
        body: requestBody,
      });
      
      console.log('[Backend Proxy] 📥 Second attempt status:', response.status);
      
      // Если и это не помогло, пробуем POST запрос (иногда бэкенды требуют POST для WebSocket handshake)
      if (response.status === 426 || (response.status >= 400 && response.status !== 200)) {
        console.log('[Backend Proxy] 🔄 Third attempt with POST method...');
        response = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'SharkSpreadTracker/1.0',
            'Content-Type': 'application/json',
            Upgrade: 'websocket',
            Connection: 'Upgrade',
            'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
            'Sec-WebSocket-Version': '13',
          },
          body: JSON.stringify({}),
        });
        
        console.log('[Backend Proxy] 📥 Third attempt status:', response.status);
      }
    }

    console.log('[Backend Proxy] Response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
    });

    // Получаем текст ответа один раз
    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || '';

    // Если сервер требует WebSocket upgrade (426) или возвращает ошибку WebSocket protocol violation
    // Это означает, что бэкенд не реализует HTTP fallback, как указано в документации
    if (response.status === 426) {
      console.warn(
        '[Backend Proxy] Server requires WebSocket upgrade (426) for:',
        path
      );
      console.warn(
        '[Backend Proxy] Backend does not implement HTTP fallback as documented'
      );
      // Возвращаем пустой массив, так как мы не можем использовать WebSocket через Edge Function
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Проверяем, не является ли ответ ошибкой WebSocket protocol violation
    if (
      responseText.includes('WebSocket protocol violation') ||
      responseText.includes('failed to accept WebSocket')
    ) {
      console.error(
        '[Backend Proxy] Backend returned WebSocket protocol violation error'
      );
      console.error(
        '[Backend Proxy] This means backend does not support HTTP fallback'
      );
      console.error('[Backend Proxy] Backend URL:', backendUrl);
      // Возвращаем пустой массив, так как бэкенд не поддерживает HTTP fallback
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

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
