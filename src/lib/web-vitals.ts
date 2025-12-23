/**
 * Web Vitals мониторинг для отслеживания производительности
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';
import { captureMessage } from './sentry';
import { analytics } from './analytics';

/**
 * Отправка метрики в Sentry и Analytics
 */
function sendToAnalytics(metric: Metric): void {
  // Отправляем в Sentry для мониторинга
  captureMessage(`Web Vital: ${metric.name} = ${metric.value}`, 'info');

  // Отправляем в Analytics
  analytics.track('web_vital', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  });
}

/**
 * Инициализация Web Vitals мониторинга
 */
export function initWebVitals(): void {
  // Только в production
  if (import.meta.env.PROD) {
    onCLS(sendToAnalytics); // Cumulative Layout Shift
    onFCP(sendToAnalytics); // First Contentful Paint
    onLCP(sendToAnalytics); // Largest Contentful Paint
    onTTFB(sendToAnalytics); // Time to First Byte
    onINP(sendToAnalytics); // Interaction to Next Paint (заменяет FID)
  }
}
