import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useLanguage } from '@/contexts/LanguageContext';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * Компонент для отображения статуса подключения к бэкенду
 */
export function ConnectionStatus({ className, showLabel = true }: ConnectionStatusProps) {
  const { t } = useLanguage();
  const [state, setState] = useState<ConnectionState>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const checkConnection = useCallback(async () => {
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL;
    
    if (!wsUrl) {
      setState('error');
      return;
    }

    setState('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        setState('disconnected');
        setRetryCount((prev) => prev + 1);
      }, 10000); // 10 секунд таймаут

      ws.onopen = () => {
        clearTimeout(timeout);
        setState('connected');
        setLastUpdate(new Date());
        setRetryCount(0);
        // Закрываем тестовое соединение
        setTimeout(() => ws.close(), 1000);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        setState('error');
        setRetryCount((prev) => prev + 1);
      };

      ws.onmessage = () => {
        setLastUpdate(new Date());
      };

    } catch {
      setState('error');
      setRetryCount((prev) => prev + 1);
    }
  }, []);

  useEffect(() => {
    checkConnection();
    
    // Проверяем соединение каждые 30 секунд
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, [checkConnection]);

  const getStatusConfig = () => {
    switch (state) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-success-500',
          bgColor: 'bg-success-500/10',
          label: t('connection.connected') || 'Connected',
          pulse: false,
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'text-warning-500',
          bgColor: 'bg-warning-500/10',
          label: t('connection.connecting') || 'Connecting...',
          pulse: true,
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-error-500',
          bgColor: 'bg-error-500/10',
          label: t('connection.disconnected') || 'Disconnected',
          pulse: false,
        };
      case 'error':
        return {
          icon: WifiOff,
          color: 'text-error-500',
          bgColor: 'bg-error-500/10',
          label: t('connection.error') || 'Connection Error',
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
        config.bgColor,
        className
      )}
      title={lastUpdate ? `Last update: ${lastUpdate.toLocaleTimeString()}` : undefined}
    >
      <Icon
        className={cn(
          'h-4 w-4',
          config.color,
          config.pulse && 'animate-spin'
        )}
      />
      {showLabel && (
        <span className={cn('font-medium', config.color)}>
          {config.label}
          {retryCount > 0 && state !== 'connected' && (
            <span className="ml-1 text-xs opacity-70">
              ({retryCount})
            </span>
          )}
        </span>
      )}
    </div>
  );
}

