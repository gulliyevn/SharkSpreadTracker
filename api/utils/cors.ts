/**
 * Утилита для безопасной обработки CORS
 * Использует переменные окружения для определения разрешенных origins
 */

/**
 * Получить разрешенные origins из переменных окружения
 * @param isDevelopment - true если это development окружение
 * @returns массив разрешенных origins или null для разрешения всех (только в dev)
 */
export function getAllowedOrigins(isDevelopment: boolean): string[] | null {
  // В development разрешаем все origins для удобства разработки
  if (isDevelopment) {
    return null; // null означает разрешить все (*)
  }

  // В production используем переменную окружения
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || process.env.VITE_ALLOWED_ORIGINS;
  
  if (!allowedOriginsEnv) {
    // Если переменная не задана в production, возвращаем пустой массив (блокируем все)
    // Это безопаснее чем разрешать все
    return [];
  }

  // Разделяем по запятой и очищаем от пробелов
  const origins = allowedOriginsEnv
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);

  return origins.length > 0 ? origins : [];
}

/**
 * Проверить, разрешен ли origin для запроса
 * @param requestOrigin - origin из заголовка запроса
 * @param isDevelopment - true если это development окружение
 * @returns true если origin разрешен
 */
export function isOriginAllowed(
  requestOrigin: string | null,
  isDevelopment: boolean
): boolean {
  const allowedOrigins = getAllowedOrigins(isDevelopment);

  // В development разрешаем все
  if (allowedOrigins === null) {
    return true;
  }

  // Если нет разрешенных origins в production, блокируем все
  if (allowedOrigins.length === 0) {
    return false;
  }

  // Если нет origin в запросе (например, same-origin запрос), разрешаем
  if (!requestOrigin) {
    return true;
  }

  // Проверяем совпадение
  return allowedOrigins.includes(requestOrigin);
}

/**
 * Получить значение заголовка Access-Control-Allow-Origin
 * @param requestOrigin - origin из заголовка запроса
 * @param isDevelopment - true если это development окружение
 * @returns значение для заголовка Access-Control-Allow-Origin
 */
export function getCorsHeader(
  requestOrigin: string | null,
  isDevelopment: boolean
): string {
  const allowedOrigins = getAllowedOrigins(isDevelopment);

  // В development разрешаем все
  if (allowedOrigins === null) {
    return '*';
  }

  // Если нет разрешенных origins в production, возвращаем пустую строку
  if (allowedOrigins.length === 0) {
    return '';
  }

  // Если нет origin в запросе или origin не разрешен, возвращаем пустую строку
  if (!requestOrigin || !isOriginAllowed(requestOrigin, isDevelopment)) {
    return '';
  }

  // Возвращаем разрешенный origin
  return requestOrigin;
}

/**
 * Получить полные CORS заголовки для ответа
 * @param requestOrigin - origin из заголовка запроса
 * @param isDevelopment - true если это development окружение
 * @param allowedMethods - разрешенные HTTP методы (по умолчанию GET, POST, OPTIONS)
 * @param allowedHeaders - разрешенные заголовки (по умолчанию Content-Type)
 * @returns объект с CORS заголовками
 */
export function getCorsHeaders(
  requestOrigin: string | null,
  isDevelopment: boolean,
  allowedMethods: string[] = ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: string[] = ['Content-Type']
): Record<string, string> {
  const origin = getCorsHeader(requestOrigin, isDevelopment);

  // Если origin не разрешен, не возвращаем CORS заголовки
  if (!origin) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': allowedMethods.join(', '),
    'Access-Control-Allow-Headers': allowedHeaders.join(', '),
    'Access-Control-Max-Age': '86400', // 24 часа для preflight cache
  };
}
