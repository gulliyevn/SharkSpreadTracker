import { type ReactNode } from 'react';
import { Inbox, Search, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface EmptyStateProps {
  /**
   * Иконка для отображения
   */
  icon?: 'inbox' | 'search' | 'alert' | ReactNode;
  /**
   * Заголовок
   */
  title: string;
  /**
   * Описание
   */
  description?: string;
  /**
   * Дополнительное действие (кнопка)
   */
  action?: ReactNode;
  /**
   * Дополнительные классы
   */
  className?: string;
}

const defaultIcons = {
  inbox: Inbox,
  search: Search,
  alert: AlertCircle,
};

/**
 * Компонент для отображения пустого состояния
 * Используется когда нет данных для отображения
 */
export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const IconComponent =
    typeof icon === 'string' && icon in defaultIcons
      ? defaultIcons[icon as keyof typeof defaultIcons]
      : null;
  const CustomIcon = typeof icon !== 'string' ? icon : null;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {/* Иконка */}
      <div className="mb-4">
        {CustomIcon ? (
          <div className="text-gray-500 dark:text-gray-500">{CustomIcon}</div>
        ) : IconComponent ? (
          <IconComponent className="h-12 w-12 sm:h-16 sm:w-16 text-gray-500 dark:text-gray-500" />
        ) : null}
      </div>

      {/* Заголовок */}
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      {/* Описание */}
      {description && (
        <p className="text-sm sm:text-base text-gray-700 dark:text-gray-400 max-w-md mb-6">
          {description}
        </p>
      )}

      {/* Действие */}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
