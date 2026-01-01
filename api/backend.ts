/**
 * Backend proxy endpoint для /api/backend/*
 * Обрабатывает все запросы к /api/backend/* в одном файле
 * (Vercel не подхватывает новые catch-all routes в поддиректориях)
 */

// ВАЖНО: Node.js runtime по умолчанию на Vercel
// Используем стандартный формат Vercel для Node.js (req, res)
// Node.js runtime позволяет делать запросы к IP-адресам

// ВАЖНО: Node.js Functions используют runtime env (не VITE_ префикс)
const BACKEND_URL =
  process.env.BACKEND_URL || 'http://158.220.122.153:8080';

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Пытаемся получить оригинальный путь из различных источников
  let originalPath = req.url || '';
  
  // Проверяем различные заголовки, которые Vercel может передавать при rewrites
  const possibleHeaders = [
    'x-vercel-rewrite',
    'x-invoke-path', 
    'x-forwarded-path',
    'x-original-path',
    'x-rewrite-path'
  ];
  
  for (const headerName of possibleHeaders) {
    const headerValue = req.headers[headerName];
    if (headerValue && typeof headerValue === 'string') {
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
    return res.status(404).json({ error: 'Not Found' });
  }
  
  const backendUrl = `${BACKEND_URL}${path}${req.url?.includes('?') ? req.url.split('?')[1] : ''}`;

  // ВАЖНО: /socket/sharkStraight поддерживает HTTP fallback
  // Согласно документации API, если WebSocket handshake не удался,
  // сервер возвращает HTTP 200 с JSON payload (массив объектов StraightData)
  // Поэтому проксируем запросы к /socket/* как обычные HTTP запросы

  try {
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SharkSpreadTracker/1.0',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' 
        ? JSON.stringify(req.body) 
        : undefined,
    });

    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html') || responseText.trim().startsWith('<!')) {
      return res.status(500).json({
        error: 'Backend returned HTML instead of JSON',
        requestedPath: path,
        backendUrl,
        responseStatus: response.status,
      });
    }

    res.setHeader('Content-Type', contentType || 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).send(responseText);
  } catch (error) {
    console.error('[Backend Proxy] Error:', error);
    return res.status(500).json({ error: 'Failed to proxy request to backend' });
  }
}

