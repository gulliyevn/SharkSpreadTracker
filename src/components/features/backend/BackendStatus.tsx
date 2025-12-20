/**
 * Компонент для отображения статуса бэкенда
 * Показывается только если используется backend/hybrid/auto режим
 */

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { backendHealthMonitor, type BackendHealthStatus } from '@/utils/backend-health';
import { API_MODE } from '@/api/adapters/api-adapter';
import { cn } from '@/utils/cn';

/**
 * Компонент статуса бэкенда
 */
export function BackendStatus() {
  const [status, setStatus] = useState<BackendHealthStatus>('unknown');
  const [lastCheck, setLastCheck] = useState<number | null>(null);

  useEffect(() => {
    // Показываем только если используется backend/hybrid/auto режим
    if (API_MODE === 'direct') {
      return;
    }
    // Подписываемся на изменения статуса
    const unsubscribe = backendHealthMonitor.subscribe((newStatus) => {
      setStatus(newStatus);
      setLastCheck(backendHealthMonitor.getLastCheck());
    });

    // Получаем текущий статус
    setStatus(backendHealthMonitor.getStatus());
    setLastCheck(backendHealthMonitor.getLastCheck());

    return unsubscribe;
  }, []);

  // Показываем только если используется backend/hybrid/auto режим
  if (API_MODE === 'direct') {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return {
          icon: CheckCircle2,
          text: 'Backend Online',
          className: 'text-green-500 dark:text-green-400',
          bgClassName: 'bg-green-50 dark:bg-green-900/20',
        };
      case 'unhealthy':
        return {
          icon: XCircle,
          text: 'Backend Offline',
          className: 'text-red-500 dark:text-red-400',
          bgClassName: 'bg-red-50 dark:bg-red-900/20',
        };
      default:
        return {
          icon: Loader2,
          text: 'Checking...',
          className: 'text-yellow-500 dark:text-yellow-400',
          bgClassName: 'bg-yellow-50 dark:bg-yellow-900/20',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium transition-colors',
        config.bgClassName,
        config.className
      )}
      title={
        lastCheck
          ? `Last check: ${new Date(lastCheck).toLocaleTimeString()}`
          : 'Backend status'
      }
      aria-label={`Backend status: ${status}`}
    >
      <Icon
        className={cn('h-3 w-3', status === 'unknown' && 'animate-spin')}
        aria-hidden="true"
      />
      <span className="hidden sm:inline">{config.text}</span>
    </div>
  );
}

