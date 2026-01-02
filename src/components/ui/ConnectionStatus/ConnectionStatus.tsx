import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getConnectionStatus,
  subscribeToConnectionStatus,
  type ConnectionStatus as ApiConnectionStatus,
} from '@/api/adapters/api-adapter';

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
 * Использует статус из api-adapter вместо создания отдельного WebSocket соединения
 */
export function ConnectionStatus({
  className,
  showLabel = true,
}: ConnectionStatusProps) {
  const { t } = useLanguage();
  const [state, setState] = useState<ConnectionState>(
    getConnectionStatus() as ConnectionState
  );
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Подписываемся на изменения статуса из api-adapter
    const unsubscribe = subscribeToConnectionStatus(
      (status: ApiConnectionStatus) => {
        setState(status as ConnectionState);
        if (status === 'connected') {
          setLastUpdate(new Date());
        }
      }
    );

    // Устанавливаем начальный статус
    setState(getConnectionStatus() as ConnectionState);

    return unsubscribe;
  }, []);

  const getStatusConfig = () => {
    switch (state) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500 dark:text-green-400',
          bgColor:
            'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20',
          label: t('connection.connected') || 'Connected',
          pulse: false,
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'text-yellow-500 dark:text-yellow-400',
          bgColor:
            'bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20',
          label: t('connection.connecting') || 'Connecting...',
          pulse: true,
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-red-500 dark:text-red-400',
          bgColor:
            'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20',
          label: t('connection.disconnected') || 'Disconnected',
          pulse: false,
        };
      case 'error':
        return {
          icon: WifiOff,
          color: 'text-red-500 dark:text-red-400',
          bgColor:
            'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20',
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
        'flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg text-sm',
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
        className={cn(
          'h-4 w-4 flex-shrink-0',
          config.color,
          config.pulse && 'animate-spin'
        )}
      />
      {showLabel && (
        <span className={cn('font-medium', config.color)}>{config.label}</span>
      )}
    </div>
  );
}
