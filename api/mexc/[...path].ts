/**
 * Vercel Edge Function для проксирования запросов к MEXC API
 * Решает проблему CORS в production
 */

import { getCorsHeaders } from '../utils/cors';

export const config = {
  runtime: 'edge',
};

const MEXC_API_BASE = 'https://contract.mexc.com';

export default async function handler(req: Request) {
  // Начало измерения времени выполнения
  const startTime = performance.now();
  const isDevelopment = process.env.NODE_ENV === 'development';
  const requestOrigin = req.headers.get('origin');
  
  // Разрешаем только GET запросы
  if (req.method !== 'GET') {
    const corsHeaders = getCorsHeaders(requestOrigin, isDevelopment, ['GET'], ['x-api-key', 'Content-Type']);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  try {
    // Получаем путь из URL (например, /api/mexc/v3/exchangeInfo)
    const url = new URL(req.url);
    // Убираем /api/mexc и добавляем /api обратно
    const path = url.pathname.replace('/api/mexc', '/api');
    
    // Формируем URL для MEXC API
    const targetUrl = `${MEXC_API_BASE}${path}${url.search}`;

    // Получаем заголовки из оригинального запроса
    const headers = new Headers();
    
    // Передаем x-api-key если есть
    const apiKey = req.headers.get('x-api-key');
    if (apiKey) {
      headers.set('X-MEXC-APIKEY', apiKey);
    }

    // Добавляем стандартные заголовки
    headers.set('Accept', 'application/json');
    headers.set('User-Agent', 'SharkSpreadTracker/1.0');

    // Выполняем запрос к MEXC API
    const fetchStartTime = performance.now();
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      // Увеличиваем таймаут для надежности
      signal: AbortSignal.timeout(30000), // 30 секунд
    });
    const fetchDuration = performance.now() - fetchStartTime;

    // Проверяем статус ответа
    if (!response.ok) {
      const corsHeaders = getCorsHeaders(requestOrigin, isDevelopment, ['GET'], ['x-api-key', 'Content-Type']);
      return new Response(
        JSON.stringify({
          error: `MEXC API error: ${response.status} ${response.statusText}`,
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Получаем данные
    const data = await response.json();
    
    // Вычисляем общее время выполнения
    const totalDuration = performance.now() - startTime;

    // Возвращаем ответ с CORS заголовками и метриками производительности
    const corsHeaders = getCorsHeaders(requestOrigin, isDevelopment, ['GET'], ['x-api-key', 'Content-Type']);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
        'Cache-Control': 'public, max-age=60, s-maxage=60',
        // Метрики производительности для мониторинга
        'X-Response-Time': `${Math.round(totalDuration)}ms`,
        'X-Fetch-Time': `${Math.round(fetchDuration)}ms`,
        'X-Edge-Function': 'mexc-proxy',
      },
    });
  } catch (error) {
    // Обработка ошибок
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const corsHeaders = getCorsHeaders(requestOrigin, isDevelopment, ['GET'], ['x-api-key', 'Content-Type']);
    
    return new Response(
      JSON.stringify({
        error: `Proxy error: ${errorMessage}`,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

