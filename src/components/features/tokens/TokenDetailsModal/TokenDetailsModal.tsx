import { useState, useCallback, useMemo } from 'react';
import { Copy, Check, Star, ArrowLeftRight, Save } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { AutoRefreshToggle } from '@/components/features/spreads/AutoRefreshToggle';
import { SpreadChartPanel } from '@/components/features/spreads/SpreadChartPanel';
import { useToast } from '@/contexts/ToastContext';
import { useMinSpread } from '@/contexts/MinSpreadContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/utils/cn';
import { createMexcFuturesUrl } from '@/utils/mexc-futures';
import type { Token, StraightData, TimeframeOption } from '@/types';

// Иконки бирж и сетей из публичной папки assets
const MEXC_LOGO = '/assets/MEXC Logo Mark_Blue.png';
const SOLANA_LOGO = '/assets/solana-sol-logo.svg';
const BSC_LOGO = '/assets/bnb-bnb-logo.svg';

export interface TokenDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: Token | null;
  tokenData?: StraightData | null; // Данные токена для отображения в TokenCard
  reverseSpread?: number | null;
}

/**
 * Модальное окно с деталями токена
 * Содержит: основную информацию о токене, иконки бирж, фильтры и настройки
 */
export function TokenDetailsModal({
  isOpen,
  onClose,
  token,
  tokenData = null,
  reverseSpread = null,
}: TokenDetailsModalProps) {
  const { success } = useToast();
  const { t } = useLanguage();
  const { minSpread, setMinSpread } = useMinSpread();
  const [isCopied, setIsCopied] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('1h');
  const [isAutoRefresh, setIsAutoRefresh] = useState(() => {
    const saved = localStorage.getItem('tokens-auto-refresh');
    return saved !== 'false'; // По умолчанию включено
  });
  const [tooltipData, setTooltipData] = useState<{
    timestamp: number;
    directSpread: number | null;
    reverseSpread: number | null;
  } | null>(null);

  // Извлекаем данные из tokenData для отображения в TokenCard
  const tokenCardData = useMemo(() => {
    if (!tokenData || !token) return null;

    const tokenSymbol = (tokenData.token || '').toUpperCase().trim();
    const network = (tokenData.network || '').toLowerCase();
    const chain: 'solana' | 'bsc' =
      network === 'bsc' || network === 'bep20' ? 'bsc' : 'solana';
    const directSpread = tokenData.spread ? Number(tokenData.spread) : null;
    const limit = tokenData.limit || 'all';
    const formattedLimit =
      limit === 'all' ? 'all' : limit.includes('$') ? limit : `${limit}$`;

    // Определяем биржи
    const aExchange = (tokenData.aExchange || '').toLowerCase();
    const bExchange = (tokenData.bExchange || '').toLowerCase();
    const isMexcA = aExchange === 'mexc';
    const isMexcB = bExchange === 'mexc';
    const networkExchange = isMexcB
      ? aExchange
      : isMexcA
        ? bExchange
        : aExchange;

    // Иконка для сети
    const networkIcon = chain === 'solana' ? SOLANA_LOGO : BSC_LOGO;

    return {
      tokenSymbol,
      chain,
      directSpread,
      formattedLimit,
      networkExchange,
      networkIcon,
    };
  }, [tokenData, token]);

  // URL для бирж
  const exchangeUrls = useMemo<Record<string, string>>(() => {
    const urls: Record<string, string> = {};
    if (!tokenCardData) return urls;

    urls.mexc = createMexcFuturesUrl(tokenCardData.tokenSymbol);

    if (tokenCardData.networkExchange === 'jupiter') {
      urls.network = 'https://jup.ag';
    } else if (tokenCardData.networkExchange === 'match') {
      urls.network = 'https://match.xyz';
    } else if (tokenCardData.networkExchange === 'pancakeswap') {
      urls.network = 'https://pancakeswap.finance';
    } else {
      urls.network =
        tokenCardData.chain === 'solana'
          ? 'https://jup.ag'
          : 'https://pancakeswap.finance';
    }

    return urls;
  }, [tokenCardData]);

  const handleCopyToken = useCallback(async () => {
    if (!tokenCardData?.tokenSymbol) return;

    try {
      await navigator.clipboard.writeText(tokenCardData.tokenSymbol);
      setIsCopied(true);
      success('Token symbol copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = tokenCardData.tokenSymbol;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setIsCopied(true);
        success('Token symbol copied to clipboard');
        setTimeout(() => setIsCopied(false), 2000);
      } catch {
        // Игнорируем ошибку
      }
      document.body.removeChild(textArea);
    }
  }, [tokenCardData?.tokenSymbol, success]);

  const handleNetworkExchangeClick = useCallback(() => {
    const url = exchangeUrls.network;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [exchangeUrls]);

  const handleMexcClick = useCallback(() => {
    const url = exchangeUrls.mexc;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [exchangeUrls]);

  const handleMinSpreadInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      // Разрешаем пустое значение
      if (inputValue === '') {
        setMinSpread(0);
        return;
      }
      const value = parseFloat(inputValue);
      if (!isNaN(value) && value >= 0) {
        setMinSpread(value);
      }
    },
    [setMinSpread]
  );

  const handleAutoRefreshToggle = useCallback((isAuto: boolean) => {
    setIsAutoRefresh(isAuto);
    localStorage.setItem('tokens-auto-refresh', String(isAuto));
  }, []);

  const handleRefresh = useCallback(() => {
    // Refresh logic can be added here if needed
  }, []);

  const handleSaveMinSpread = useCallback(() => {
    // minSpread уже сохраняется в MinSpreadContext автоматически при изменении
    // Здесь просто показываем уведомление о сохранении
    success(t('common.saved') || 'Saved');
  }, [success, t]);

  if (!token || !tokenCardData) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tokenCardData.tokenSymbol || ''}
      size="xl"
      className="max-w-[95vw] sm:max-w-5xl lg:max-w-6xl"
      showCloseButton={true}
    >
      <div className="space-y-4">
        {/* Верхняя строка: TokenCard (точная копия с главной страницы) и фильтр минимального спреда */}
        <div className="flex items-center gap-4 justify-start">
          {/* TokenCard - точная копия с главной страницы */}
          <article
            className={cn(
              'group relative bg-white dark:bg-dark-800 border border-light-200 dark:border-dark-700 rounded-lg p-1',
              'w-full max-w-[400px]' // Ширина как одна колонка в grid на главной странице (примерно 1/3 от max-w-7xl)
            )}
          >
            <div className="flex items-center gap-3 w-full">
              {/* Звезда - выровнена по центру вертикально */}
              <div className="flex-shrink-0 p-0 self-center w-7 h-7 flex items-center justify-center">
                <Star className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>

              {/* Левая часть: название, лимит */}
              <div className="flex flex-col gap-1 flex-1 min-w-0 basis-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                    {tokenCardData.tokenSymbol}
                  </span>
                  <button
                    onClick={handleCopyToken}
                    className={cn(
                      'flex-shrink-0 p-0.5 rounded transition-colors touch-manipulation',
                      'w-5 h-5 flex items-center justify-center',
                      isCopied
                        ? 'text-green-500 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400'
                    )}
                    aria-label={
                      t('modal.copyTokenSymbol') || 'Copy token symbol'
                    }
                    title={t('modal.copyTokenSymbol') || 'Copy token symbol'}
                  >
                    {isCopied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {tokenCardData.formattedLimit}
                  </span>
                </div>
              </div>

              {/* Средняя часть: Network иконка, стрелка, MEXC иконка */}
              <div className="flex items-center gap-1.5 flex-shrink-0 basis-auto">
                {(() => {
                  const exchangeName =
                    t(`sources.${tokenCardData.networkExchange}`) ||
                    tokenCardData.networkExchange;
                  const chainName =
                    t(`chains.${tokenCardData.chain}`) || tokenCardData.chain;
                  const exchangeTitle = t('modal.openExchange')
                    .replace('{{exchange}}', exchangeName)
                    .replace('{{chain}}', chainName);
                  return (
                    <button
                      onClick={handleNetworkExchangeClick}
                      className={cn(
                        'p-0.5 rounded hover:bg-light-200 dark:hover:bg-dark-700 transition-colors touch-manipulation',
                        'w-6 h-6 flex items-center justify-center',
                        'hover:scale-110 active:scale-95'
                      )}
                      title={
                        exchangeTitle ||
                        `Open ${tokenCardData.networkExchange} on ${tokenCardData.chain}`
                      }
                      aria-label={
                        exchangeTitle ||
                        `Open ${tokenCardData.networkExchange} on ${tokenCardData.chain}`
                      }
                    >
                      <img
                        src={tokenCardData.networkIcon}
                        alt={tokenCardData.chain}
                        className="h-5 w-5 object-contain"
                      />
                    </button>
                  );
                })()}
                <ArrowLeftRight className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                <button
                  onClick={handleMexcClick}
                  className={cn(
                    'p-0.5 rounded hover:bg-light-200 dark:hover:bg-dark-700 transition-colors touch-manipulation',
                    'w-6 h-6 flex items-center justify-center',
                    'hover:scale-110 active:scale-95'
                  )}
                  title={t('modal.openMexcFutures') || 'Open MEXC Futures'}
                  aria-label={t('modal.openMexcFutures') || 'Open MEXC Futures'}
                >
                  <img
                    src={MEXC_LOGO}
                    alt="MEXC"
                    className="h-5 w-5 object-contain"
                  />
                </button>
              </div>

              {/* Правая часть: два спреда (зеленый и красный) */}
              <div className="flex items-center gap-2 flex-shrink-0 basis-auto">
                {/* Контейнер для спредов: зеленый слева, красный/серый справа, разделены по середине */}
                <div className="flex h-7 rounded overflow-hidden">
                  {/* Зеленый спред (прямой: BNB/Sol → MEXC) - слева */}
                  {tokenCardData.directSpread !== null ? (
                    <div className="bg-green-500 dark:bg-green-600 px-2.5 min-w-[50px] h-full flex items-center justify-center text-center">
                      <span className="text-white text-xs font-medium">
                        {tokenCardData.directSpread.toFixed(2)}%
                      </span>
                    </div>
                  ) : (
                    <div className="bg-gray-400 dark:bg-gray-600 px-2.5 min-w-[50px] h-full flex items-center justify-center text-center">
                      <span className="text-white text-xs font-medium">—</span>
                    </div>
                  )}
                  {/* Обратный спред (обратный: MEXC → BNB/Sol, из отдельной ручки сервера) - справа */}
                  <div
                    className={cn(
                      'px-2.5 min-w-[50px] h-full flex items-center justify-center text-center',
                      reverseSpread !== null && !isNaN(reverseSpread)
                        ? 'bg-red-500 dark:bg-red-600'
                        : 'bg-gray-400 dark:bg-gray-600'
                    )}
                  >
                    <span className="text-white text-xs font-medium">
                      {reverseSpread !== null && !isNaN(reverseSpread)
                        ? `${reverseSpread.toFixed(2)}%`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Минимальный спред - справа от Card */}
          <div className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border bg-white dark:bg-dark-800 border-light-300 dark:border-dark-700">
            <label className="text-xs sm:text-sm text-gray-700 dark:text-gray-400 whitespace-nowrap">
              {t('filters.minSpread')}
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={minSpread === 0 ? '' : minSpread}
              onChange={handleMinSpreadInputChange}
              placeholder=""
              className="w-12 px-1.5 py-0.5 rounded text-xs bg-white dark:bg-dark-900 border border-light-300 dark:border-dark-700 text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-400">
              %
            </span>
          </div>

          {/* Auto Refresh и Refresh */}
          <AutoRefreshToggle
            isAuto={isAutoRefresh}
            onToggle={handleAutoRefreshToggle}
            onRefresh={handleRefresh}
          />

          {/* Tooltip контейнер для данных графика - между Refresh и Save */}
          {tooltipData && (
            <div className="ml-12 flex items-center">
              <div className="flex items-center h-7 rounded border bg-white dark:bg-dark-800 border-light-300 dark:border-dark-700 shadow-sm">
                {/* Время (HH:MM) - слева */}
                <div className="px-2.5 h-full flex items-center justify-center border-r border-light-300 dark:border-dark-700">
                  <span className="text-xs sm:text-sm font-medium text-dark-950 dark:text-dark-50">
                    {(() => {
                      const date = new Date(tooltipData.timestamp);
                      const hours = String(date.getHours()).padStart(2, '0');
                      const minutes = String(date.getMinutes()).padStart(
                        2,
                        '0'
                      );
                      return `${hours}:${minutes}`;
                    })()}
                  </span>
                </div>
                {/* Зеленый спред (Direct Spread) */}
                {tooltipData.directSpread !== null ? (
                  <div className="bg-green-500 dark:bg-green-600 px-2.5 min-w-[50px] h-full flex items-center justify-center text-center rounded-l">
                    <span className="text-white text-xs font-medium">
                      {tooltipData.directSpread.toFixed(2)}%
                    </span>
                  </div>
                ) : (
                  <div className="bg-gray-400 dark:bg-gray-600 px-2.5 min-w-[50px] h-full flex items-center justify-center text-center rounded-l">
                    <span className="text-white text-xs font-medium">—</span>
                  </div>
                )}
                {/* Обратный спред (Reverse Spread) - справа */}
                <div
                  className={cn(
                    'px-2.5 pr-3 min-w-[50px] h-full flex items-center justify-center text-center rounded-r',
                    tooltipData.reverseSpread !== null &&
                      !isNaN(tooltipData.reverseSpread) &&
                      tooltipData.reverseSpread < 0
                      ? 'bg-red-500 dark:bg-red-600'
                      : 'bg-gray-400 dark:bg-gray-600'
                  )}
                >
                  <span className="text-white text-xs font-medium">
                    {tooltipData.reverseSpread !== null &&
                    !isNaN(tooltipData.reverseSpread)
                      ? `${tooltipData.reverseSpread.toFixed(2)}%`
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Кнопка Save для сохранения минимального спреда - справа */}
          <div className="ml-auto">
            <button
              onClick={handleSaveMinSpread}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors border bg-primary-600 border-primary-600 text-white hover:bg-primary-700 flex items-center justify-center"
            >
              <Save className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">
                {t('common.save') || 'Save'}
              </span>
            </button>
          </div>
        </div>

        {/* SpreadChartPanel - график спреда с таймфреймом внутри (справа сверху) */}
        <SpreadChartPanel
          token={token}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          isOpen={isOpen}
          onTooltipDataChange={setTooltipData}
        />
      </div>
    </Modal>
  );
}
