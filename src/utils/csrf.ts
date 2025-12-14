/**
 * CSRF защита
 */

const CSRF_TOKEN_KEY = 'csrf_token';

/**
 * Получить или создать CSRF токен
 */
export function getCSRFToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  let token = sessionStorage.getItem(CSRF_TOKEN_KEY);
  if (!token) {
    token = generateToken();
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  }
  return token;
}

/**
 * Генерация случайного токена
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

/**
 * Валидация CSRF токена
 */
export function validateCSRFToken(token: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
  return storedToken !== null && storedToken === token;
}

