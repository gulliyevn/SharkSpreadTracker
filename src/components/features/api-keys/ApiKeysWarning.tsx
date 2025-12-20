import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  getApiKeysStatusMessage,
  getMissingApiKeys,
  getInvalidApiKeys,
} from '@/utils/api-keys-validator';

/**
 * Компонент для отображения предупреждений об API ключах
 */
export function ApiKeysWarning() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const status = getApiKeysStatusMessage();

  useEffect(() => {
    // Показываем предупреждение только если есть проблемы с ключами
    // и пользователь не закрыл его ранее
    const dismissed = localStorage.getItem('api-keys-warning-dismissed');
    if (status.hasWarnings && !dismissed) {
      setIsVisible(true);
    }
  }, [status.hasWarnings]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('api-keys-warning-dismissed', 'true');
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  const missing = getMissingApiKeys();
  const invalid = getInvalidApiKeys();

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-5">
      <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20">
        <div className="flex items-start gap-3 p-4">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-yellow-900 dark:text-yellow-100 mb-1">
              {t('apiKeys.warning.title', 'API Keys Warning')}
            </h3>
            <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
              {status.message}
            </p>
            {missing.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                  {t('apiKeys.warning.missing', 'Missing keys:')}
                </p>
                <ul className="text-xs text-yellow-800 dark:text-yellow-200 list-disc list-inside">
                  {missing.map((key) => (
                    <li key={key}>{key}</li>
                  ))}
                </ul>
              </div>
            )}
            {invalid.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                  {t('apiKeys.warning.invalid', 'Invalid keys:')}
                </p>
                <ul className="text-xs text-yellow-800 dark:text-yellow-200 list-disc list-inside">
                  {invalid.map((key) => (
                    <li key={key}>{key}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
              {t(
                'apiKeys.warning.hint',
                'Add keys to .env file. See documentation for details.'
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200"
            aria-label={t('common.close', 'Close')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
