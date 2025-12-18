import { useState, useCallback, useMemo, useEffect } from 'react';
import { Copy, Check, Save } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PriceDisplay } from '@/components/features/tokens/PriceDisplay';
import { SpreadIndicator } from '@/components/features/tokens/SpreadIndicator';
import { SpreadChart } from '@/components/features/spreads/SpreadChart';
import { getSourcesForChain } from '@/constants/sources';
import { useSpreadData } from '@/api/hooks/useSpreadData';
import { getMexcTradingLimits } from '@/api/endpoints/mexc-limits.api';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/utils/cn';
import type { Token } from '@/types';
import type { MexcTradingLimits } from '@/types';

export interface TokenDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: Token | null;
  price?: number | null;
  directSpread?: number | null;
  reverseSpread?: number | null;
}

/**
 * Модальное окно с деталями токена
 * Содержит: основную информацию, график спреда, иконки бирж, лимиты MEXC, редактирование спреда
 */
export function TokenDetailsModal({
  isOpen,
  onClose,
  token,
  price = null,
  directSpread = null,
  reverseSpread = null,
}: TokenDetailsModalProps) {
  const { success } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [spreadThreshold, setSpreadThreshold] = useState<string>('');
  const [mexcLimits, setMexcLimits] = useState<MexcTradingLimits | null>(null);
  const [isLoadingLimits, setIsLoadingLimits] = useState(false);

  // Получаем данные спреда для графика
  const { data: spreadData, isLoading: isLoadingSpread } = useSpreadData(
    token,
    '1h',
    isOpen && token !== null
  );

  // Определяем источники для графика (по умолчанию для chain)
  const defaultSources = useMemo(() => {
    if (!token) return { source1: null, source2: null };
    if (token.chain === 'solana') {
      return { source1: 'jupiter' as const, source2: 'mexc' as const };
    }
    return { source1: 'pancakeswap' as const, source2: 'mexc' as const };
  }, [token]);

  // Получаем доступные источники для chain
  const availableSources = useMemo(() => {
    if (!token) return [];
    return getSourcesForChain(token.chain);
  }, [token]);

  // URL для бирж
  const exchangeUrls = useMemo<Record<string, string>>(
    () => ({
      mexc: 'https://www.mexc.com',
      jupiter: 'https://jup.ag',
      pancakeswap: 'https://pancakeswap.finance',
    }),
    []
  );

  // Загружаем настройки спреда из localStorage
  useEffect(() => {
    if (!token) return;

    const key = `token-spread-settings-${token.symbol}-${token.chain}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.threshold !== undefined) {
          setSpreadThreshold(String(settings.threshold));
        }
      } catch {
        // Игнорируем ошибки парсинга
      }
    }
  }, [token]);

  // Загружаем лимиты MEXC
  useEffect(() => {
    if (!token || !isOpen) return;

    // Загружаем лимиты только для BSC или если доступен MEXC
    if (
      token.chain === 'bsc' ||
      availableSources.some((s) => s.id === 'mexc')
    ) {
      setIsLoadingLimits(true);
      // Формируем symbol для MEXC (обычно BASEUSDT, например BTCUSDT)
      const mexcSymbol = `${token.symbol}USDT`;
      getMexcTradingLimits(mexcSymbol)
        .then((limits) => {
          setMexcLimits(limits);
        })
        .catch(() => {
          // Игнорируем ошибки, лимиты не критичны
        })
        .finally(() => {
          setIsLoadingLimits(false);
        });
    }
  }, [token, isOpen, availableSources]);

  const handleCopyAddress = useCallback(async () => {
    if (!token?.address) return;

    try {
      await navigator.clipboard.writeText(token.address);
      setIsCopied(true);
      success('Address copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = token.address;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setIsCopied(true);
        success('Address copied to clipboard');
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        // Игнорируем ошибку
      }
      document.body.removeChild(textArea);
    }
  }, [token?.address, success]);

  const handleExchangeClick = useCallback(
    (sourceId: string) => {
      const url = exchangeUrls[sourceId];
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    },
    [exchangeUrls]
  );

  const handleSaveSpreadSettings = useCallback(() => {
    if (!token) return;

    const key = `token-spread-settings-${token.symbol}-${token.chain}`;
    const settings = {
      threshold: spreadThreshold ? parseFloat(spreadThreshold) : undefined,
    };
    localStorage.setItem(key, JSON.stringify(settings));
    success('Spread settings saved');
  }, [token, spreadThreshold, success]);

  if (!token) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${token.symbol} Details`}
      size="xl"
      className="max-w-[95vw] sm:max-w-4xl"
    >
      <div className="space-y-3 sm:space-y-4">
        {/* Секция 1: Основная информация */}
        <Card className="p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold mb-3 text-dark-950 dark:text-dark-50">
            Basic Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-light-600 dark:text-dark-400">
                Symbol:
              </span>
              <span className="font-bold text-dark-950 dark:text-dark-50">
                {token.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-light-600 dark:text-dark-400">
                Chain:
              </span>
              <span className="font-medium text-dark-950 dark:text-dark-50">
                {token.chain === 'solana' ? 'Solana' : 'BSC'}
              </span>
            </div>
            {token.address && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-light-600 dark:text-dark-400">
                  Address:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-dark-950 dark:text-dark-50 truncate max-w-[120px] sm:max-w-[200px]">
                    {token.address}
                  </span>
                  <button
                    onClick={handleCopyAddress}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      isCopied
                        ? 'text-green-500 dark:text-green-400'
                        : 'text-light-500 dark:text-dark-400 hover:text-primary-500 dark:hover:text-primary-400'
                    )}
                    aria-label="Copy address"
                    title="Copy address"
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
            {price !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-light-600 dark:text-dark-400">
                  Current Price:
                </span>
                <PriceDisplay value={price} className="font-bold" />
              </div>
            )}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-light-600 dark:text-dark-400">
                  Direct Spread:
                </span>
                <SpreadIndicator value={directSpread} type="direct" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-light-600 dark:text-dark-400">
                  Reverse Spread:
                </span>
                <SpreadIndicator value={reverseSpread} type="reverse" />
              </div>
            </div>
          </div>
        </Card>

        {/* Секция 2: Маленький график спреда */}
        <Card className="p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold mb-3 text-dark-950 dark:text-dark-50">
            Spread Chart
          </h3>
          <div className="h-[250px] sm:h-[300px]">
            <SpreadChart
              spreadData={spreadData || null}
              source1={defaultSources.source1}
              source2={defaultSources.source2}
              isLoading={isLoadingSpread}
            />
          </div>
        </Card>

        {/* Секция 3: Иконки бирж (кликабельные) */}
        <Card className="p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold mb-3 text-dark-950 dark:text-dark-50">
            Exchanges
          </h3>
          <div className="flex items-center gap-3 flex-wrap">
            {availableSources.map((source) => (
              <button
                key={source.id}
                onClick={() => handleExchangeClick(source.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
                  'bg-light-100 dark:bg-dark-900 border-light-300 dark:border-dark-700',
                  'hover:bg-light-200 dark:hover:bg-dark-800',
                  'hover:border-primary-500 dark:hover:border-primary-500'
                )}
                title={`Open ${source.label}`}
              >
                <span
                  className={cn('text-xl', source.colorTailwind)}
                  role="img"
                  aria-label={source.label}
                >
                  {source.emoji}
                </span>
                <span className="font-medium text-dark-950 dark:text-dark-50">
                  {source.label}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Секция 4: Лимит на покупку MEXC */}
        {(token.chain === 'bsc' ||
          availableSources.some((s) => s.id === 'mexc')) && (
          <Card className="p-3 sm:p-4">
            <h3 className="text-base sm:text-lg font-semibold mb-3 text-dark-950 dark:text-dark-50">
              MEXC Trading Limits
            </h3>
            {isLoadingLimits ? (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : mexcLimits ? (
              <div className="space-y-3">
                {mexcLimits.minNotional && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-light-600 dark:text-dark-400">
                      MIN_NOTIONAL:
                    </span>
                    <span className="font-medium text-dark-950 dark:text-dark-50">
                      {mexcLimits.minNotional.toFixed(8)}
                    </span>
                  </div>
                )}
                {mexcLimits.minQty && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-light-600 dark:text-dark-400">
                      Min Qty:
                    </span>
                    <span className="font-medium text-dark-950 dark:text-dark-50">
                      {mexcLimits.minQty.toFixed(8)}
                    </span>
                  </div>
                )}
                {mexcLimits.maxQty && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-light-600 dark:text-dark-400">
                      Max Qty:
                    </span>
                    <span className="font-medium text-dark-950 dark:text-dark-50">
                      {mexcLimits.maxQty.toFixed(8)}
                    </span>
                  </div>
                )}
                {mexcLimits.stepSize && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-light-600 dark:text-dark-400">
                      Step Size:
                    </span>
                    <span className="font-medium text-dark-950 dark:text-dark-50">
                      {mexcLimits.stepSize.toFixed(8)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-light-600 dark:text-dark-400">
                Trading limits not available
              </p>
            )}
          </Card>
        )}

        {/* Секция 5: Редактирование спреда */}
        <Card className="p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold mb-3 text-dark-950 dark:text-dark-50">
            Custom Spread Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="spread-threshold"
                className="block text-sm font-medium mb-2 text-dark-950 dark:text-dark-50"
              >
                Spread Threshold (%)
              </label>
              <Input
                id="spread-threshold"
                type="number"
                step="0.1"
                min="0"
                value={spreadThreshold}
                onChange={(e) => setSpreadThreshold(e.target.value)}
                placeholder="0.5"
                className="w-full"
              />
              <p className="mt-1 text-xs text-light-600 dark:text-dark-400">
                Minimum spread percentage for notifications
              </p>
            </div>
            <Button
              onClick={handleSaveSpreadSettings}
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </Card>
      </div>
    </Modal>
  );
}
