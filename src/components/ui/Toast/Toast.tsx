import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Toast as ToastType } from '@/contexts/ToastContext';

export interface ToastProps {
  toast: ToastType;
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const iconColors = {
  success: 'text-success-600 dark:text-success-400',
  error: 'text-error-600 dark:text-error-400',
  warning: 'text-warning-600 dark:text-warning-400',
  info: 'text-primary-600 dark:text-primary-400',
};

const bgColors = {
  success:
    'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800',
  error:
    'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800',
  warning:
    'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800',
  info: 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800',
};

const textColors = {
  success: 'text-success-800 dark:text-success-200',
  error: 'text-error-800 dark:text-error-200',
  warning: 'text-warning-800 dark:text-warning-200',
  info: 'text-primary-800 dark:text-primary-200',
};

/**
 * Компонент отдельного toast уведомления
 */
export function Toast({ toast, onClose }: ToastProps) {
  const Icon = icons[toast.type];
  const iconColor = iconColors[toast.type];
  const bgColor = bgColors[toast.type];
  const textColor = textColors[toast.type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg',
        'min-w-[300px] max-w-[500px]',
        'animate-in slide-in-from-right-full fade-in-0 duration-300',
        bgColor
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', iconColor)} />
      <div className={cn('flex-1 text-sm font-medium', textColor)}>
        {toast.message}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className={cn(
          'flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors',
          textColor
        )}
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
