/**
 * Тестовая Edge Function для проверки, что Vercel видит /api с Edge runtime
 * Endpoint: /api/edge-ping
 */

import { getCorsHeaders } from './utils/cors';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const requestOrigin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(requestOrigin, isDevelopment);
  
  return new Response(
    JSON.stringify({
      success: true,
      type: 'edge',
      message: 'Vercel Edge Function работает!',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      runtime: 'edge',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );
}

