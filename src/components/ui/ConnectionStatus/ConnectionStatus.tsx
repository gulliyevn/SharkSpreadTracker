import { useState, useEffect, useCallback, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useLanguage } from '@/contexts/LanguageContext';

export type ConnectionState =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'error';

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * Компонент для отображения статуса подключения к бэкенду
 */
export function ConnectionStatus({
  className,
  showLabel = true,
}: ConnectionStatusProps) {
  const { t } = useLanguage();
  const [state, setState] = useState<ConnectionState>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Refs для хранения WebSocket и таймеров для cleanup
  const wsRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkConnection = useCallback(async () => {
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL;

    if (!wsUrl) {
      setState('error');
      return;
    }

    // Закрываем предыдущее соединение, если оно есть
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Игнорируем ошибки закрытия
      }
      wsRef.current = null;
    }

    // Очищаем предыдущие таймеры
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setState('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      timeoutRef.current = setTimeout(() => {
        if (wsRef.current === ws) {
          try {
            ws.close();
          } catch {
            // Игнорируем ошибки закрытия
          }
          wsRef.current = null;
          setState('disconnected');
          setRetryCount((prev) => prev + 1);
        }
        timeoutRef.current = null;
      }, 10000); // 10 секунд таймаут

      ws.onopen = () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setState('connected');
        setLastUpdate(new Date());
        setRetryCount(0);
        // Закрываем тестовое соединение
        closeTimeoutRef.current = setTimeout(() => {
          if (wsRef.current === ws) {
            try {
              ws.close();
            } catch {
              // Игнорируем ошибки закрытия
            }
            wsRef.current = null;
          }
          closeTimeoutRef.current = null;
        }, 1000);
      };

      ws.onerror = () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setState('error');
        setRetryCount((prev) => prev + 1);
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      };

      ws.onmessage = () => {
        setLastUpdate(new Date());
      };
    } catch {
      setState('error');
      setRetryCount((prev) => prev + 1);
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    checkConnection();

    // Проверяем соединение каждые 30 секунд
    const interval = setInterval(checkConnection, 30000);

    return () => {
      clearInterval(interval);
      // Очищаем WebSocket при unmount
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // Игнорируем ошибки закрытия
        }
        wsRef.current = null;
      }
      // Очищаем все таймеры
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
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
      title={
        lastUpdate
          ? `Last update: ${lastUpdate.toLocaleTimeString()}`
          : undefined
      }
    >
      <Icon
        className={cn('h-4 w-4', config.color, config.pulse && 'animate-spin')}
      />
      {showLabel && (
        <span className={cn('font-medium', config.color)}>
          {config.label}
          {retryCount > 0 && state !== 'connected' && (
            <span className="ml-1 text-xs opacity-70">({retryCount})</span>
          )}
        </span>
      )}
    </div>
  );
}
