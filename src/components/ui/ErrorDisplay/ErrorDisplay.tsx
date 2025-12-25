import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../Button';
import { useLanguage } from '@/contexts/LanguageContext';
import { getErrorMessage } from '@/utils/errors';
import { cn } from '@/utils/cn';

interface ErrorDisplayProps {
  error: Error | null | unknown;
  onReset?: () => void;
  onGoHome?: () => void;
  title?: string;
  className?: string;
  showDetails?: boolean;
}

/**
 * Компонент для отображения ошибок
 */
export function ErrorDisplay({
  error,
  onReset,
  onGoHome,
  title,
  className,
  showDetails = false,
}: ErrorDisplayProps) {
  const { t } = useLanguage();
  const errorMessage = getErrorMessage(error, t);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] p-6 text-center',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="mb-4">
        <AlertCircle className="h-16 w-16 sm:h-20 sm:w-20 text-error-500 dark:text-error-400" />
      </div>

      <h2 className="text-xl sm:text-2xl font-bold mb-2 text-gray-900 dark:text-white">
        {title || t('common.error') || 'Error'}
      </h2>

      <p className="text-sm sm:text-base text-gray-700 dark:text-gray-400 mb-6 max-w-md">
        {errorMessage}
      </p>

      {showDetails && error instanceof Error && (
        <details className="mb-6 text-left max-w-md w-full">
          <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-500 mb-2">
            {t('common.details') || 'Details'}
          </summary>
          <pre className="text-xs bg-light-100 dark:bg-dark-800 p-3 rounded overflow-auto">
            {error.stack || error.message}
          </pre>
        </details>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        {onReset && (
          <Button
            onClick={onReset}
            variant="primary"
            size="md"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t('common.retry') || 'Try Again'}
          </Button>
        )}

        {onGoHome && (
          <Button
            onClick={onGoHome}
            variant="outline"
            size="md"
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            {t('common.goHome') || 'Go Home'}
          </Button>
        )}
      </div>
    </div>
  );
}
