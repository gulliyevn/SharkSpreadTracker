import { Star, Copy, Check, Pencil, ArrowLeftRight } from 'lucide-react';
import { useState, memo, useCallback, useMemo } from 'react';
import { cn } from '@/utils/cn';
import type { StraightData } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { createMexcFuturesUrl } from '@/utils/mexc-futures';
import { createJupiterSwapUrlWithUSDC } from '@/utils/jupiter-swap';
import { createPancakeSwapUrlWithBUSD } from '@/utils/pancakeswap-swap';
import { logger } from '@/utils/logger';

// Иконки бирж и сетей из публичной папки assets
const MEXC_LOGO = '/assets/MEXC Logo Mark_Blue.png';
const SOLANA_LOGO = '/assets/solana-sol-logo.svg';
const BSC_LOGO = '/assets/bnb-bnb-logo.svg';

/**
 * Вычисляет цвет фона для блока спреда на основе значения
 * @param spread - значение спреда
 * @param isReverse - true для обратного спреда (красный), false для прямого (зеленый)
 * @returns объект с HSL цветом в формате {h, s, l} или null для серого
 */
function getSpreadColor(
  spread: number,
  isReverse: boolean
): {
  h: number;
  s: number;
  l: number;
} | null {
  if (spread === 0) return null; // Серый цвет

  const threshold = 3; // Порог для максимального цвета
  const absSpread = Math.abs(spread);

  if (isReverse) {
    // Обратный спред: серый → красный (от 0 до -3)
    if (absSpread >= threshold) {
      // Полностью красный
      return { h: 0, s: 70, l: 50 }; // red-500 примерно
    }
    // Интерполяция от серого (0) к красному (threshold)
    const ratio = absSpread / threshold;
    // Серый: h=0, s=0, l=40 -> Красный: h=0, s=70, l=50
    return {
      h: 0,
      s: Math.round(70 * ratio),
      l: Math.round(40 + 10 * ratio),
    };
  } else {
    // Прямой спред: серый → зеленый (от 0 до +3)
    if (absSpread >= threshold) {
      // Полностью зеленый
      return { h: 142, s: 70, l: 50 }; // green-500 примерно
    }
    // Интерполяция от серого (0) к зеленому (threshold)
    const ratio = absSpread / threshold;
    // Серый: h=0, s=0, l=40 -> Зеленый: h=142, s=70, l=50
    return {
      h: Math.round(142 * ratio),
      s: Math.round(70 * ratio),
      l: Math.round(40 + 10 * ratio),
    };
  }
}

interface TokenCardProps {
  token: StraightData;
  reverseSpread?: number | null; // Обратный спред из отдельной ручки сервера
  isFavorite?: boolean;
  onFavoriteToggle?: (token: StraightData) => void;
  onEdit?: (token: StraightData) => void;
}

/**
 * Карточка токена в стиле из скриншота
 * Оптимизирована с помощью React.memo для предотвращения лишних ререндеров
 */
export const TokenCard = memo(function TokenCard({
  token,
  reverseSpread = null, // Обратный спред будет приходить из /socket/sharkReverse когда endpoint будет реализован на бэкенде
  isFavorite = false,
  onFavoriteToggle,
  onEdit,
}: TokenCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { success, error: showError } = useToast();

  // Извлекаем данные из StraightData
  const tokenSymbol = (token.token || '').toUpperCase().trim();
  const network = (token.network || '').toLowerCase();
  const chain: 'solana' | 'bsc' =
    network === 'bsc' || network === 'bep20' ? 'bsc' : 'solana';
  const directSpread = token.spread ? Number(token.spread) : null; // Прямой спред (BNB/Sol → MEXC)
  // Берем limit из JSON с бэкенда, если отсутствует или пустой - используем 'all'
  const limit =
    token.limit && token.limit.trim() !== '' ? token.limit.trim() : 'all';
  // Адрес токена для копирования и создания URL для Jupiter/PancakeSwap
  const tokenAddress = token.address || null;

  // Вычисляем цвета для блоков спреда
  const directSpreadColor =
    directSpread !== null ? getSpreadColor(directSpread, false) : null;
  const reverseSpreadColor =
    reverseSpread !== null && !isNaN(reverseSpread)
      ? getSpreadColor(reverseSpread, true)
      : null;

  // Форматируем лимит: если "all" - показываем "all", иначе число с $
  const formattedLimit =
    limit === 'all' ? 'all' : limit.includes('$') ? limit : `${limit}$`;

  // Определяем биржи
  const aExchange = (token.aExchange || '').toLowerCase();
  const bExchange = (token.bExchange || '').toLowerCase();
  const isMexcA = aExchange === 'mexc';
  const isMexcB = bExchange === 'mexc';

  // Определяем network exchange (не MEXC)
  const networkExchange = isMexcB ? aExchange : isMexcA ? bExchange : aExchange;

  // URL для бирж
  const exchangeUrls = useMemo<Record<string, string>>(() => {
    const urls: Record<string, string> = {};

    // MEXC Futures URL (использует символ токена)
    urls.mexc = createMexcFuturesUrl(tokenSymbol);

    // Network exchange URL (Jupiter, Match, или PancakeSwap)
    // Используем адрес токена (как MEXC использует символ)
    if (networkExchange === 'jupiter' || chain === 'solana') {
      // Используем адрес токена для создания URL с USDC (как MEXC использует символ)
      urls.network = createJupiterSwapUrlWithUSDC(tokenAddress || '', 'buy');
    } else if (networkExchange === 'match') {
      urls.network = 'https://match.xyz';
    } else if (networkExchange === 'pancakeswap' || chain === 'bsc') {
      // Используем адрес токена для создания URL с BUSD (как MEXC использует символ)
      urls.network = createPancakeSwapUrlWithBUSD(tokenAddress || '', 'buy');
    } else {
      // Fallback
      urls.network =
        chain === 'solana' ? 'https://jup.ag' : 'https://pancakeswap.finance';
    }

    return urls;
  }, [tokenSymbol, networkExchange, chain, tokenAddress]);

  // Иконка для сети (Solana или BSC)
  const networkIcon = useMemo(() => {
    return chain === 'solana' ? SOLANA_LOGO : BSC_LOGO;
  }, [chain]);

  // Вычисляем максимальный спред для динамического ring
  const maxSpread = Math.max(directSpread || 0, reverseSpread || 0);
  const ringOpacity =
    maxSpread > 5 ? 0.6 : maxSpread > 2 ? 0.4 : maxSpread > 0.5 ? 0.2 : 0.05;

  const handleFavoriteToggle = useCallback(() => {
    onFavoriteToggle?.(token);
  }, [onFavoriteToggle, token]);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const handleCopyToken = useCallback(async () => {
    // Копируем адрес токена (если есть), иначе символ токена
    const textToCopy = tokenAddress || tokenSymbol;

    // Проверяем доступность Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        success(
          tokenAddress
            ? 'Token address copied to clipboard'
            : 'Token symbol copied to clipboard'
        );
        setTimeout(() => setIsCopied(false), 2000);
        return;
      } catch (error) {
        // Clipboard API не работает, пробуем fallback
        if (error instanceof Error) {
          logger.warn('Clipboard API failed, using fallback:', error.message);
        }
      }
    }

    // Fallback для старых браузеров или когда Clipboard API недоступен
    try {
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setIsCopied(true);
        success(
          tokenAddress
            ? 'Token address copied to clipboard'
            : 'Token symbol copied to clipboard'
        );
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        throw new Error('execCommand("copy") returned false');
      }
    } catch (error) {
      logger.error('Failed to copy to clipboard:', error);
      // Показываем пользователю альтернативный способ
      showError(`Please copy manually: ${textToCopy}`);
    }
  }, [tokenAddress, tokenSymbol, success, showError]);

  const handleMexcClick = useCallback(() => {
    const url = exchangeUrls.mexc;
    if (url) {
      try {
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (
          !newWindow ||
          newWindow.closed ||
          typeof newWindow.closed === 'undefined'
        ) {
          // Popup был заблокирован
          logger.warn(
            'Popup blocked for MEXC URL. User may need to allow popups.'
          );
          // Показываем пользователю сообщение или открываем в той же вкладке
          window.location.href = url;
        }
      } catch (error) {
        logger.error('Failed to open MEXC URL:', error);
        // Fallback: открываем в той же вкладке
        window.location.href = url;
      }
    }
  }, [exchangeUrls]);

  const handleNetworkExchangeClick = useCallback(() => {
    const url = exchangeUrls.network;
    if (url) {
      try {
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (
          !newWindow ||
          newWindow.closed ||
          typeof newWindow.closed === 'undefined'
        ) {
          // Popup был заблокирован
          logger.warn(
            'Popup blocked for network exchange URL. User may need to allow popups.'
          );
          // Показываем пользователю сообщение или открываем в той же вкладке
          window.location.href = url;
        }
      } catch (error) {
        logger.error('Failed to open network exchange URL:', error);
        // Fallback: открываем в той же вкладке
        window.location.href = url;
      }
    }
  }, [exchangeUrls]);

  const handleEdit = useCallback(() => {
    onEdit?.(token);
  }, [onEdit, token]);

  return (
    <article
      className={cn(
        'group relative bg-white dark:bg-dark-800 border border-light-200 dark:border-dark-700 rounded-lg p-1',
        'hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-200',
        'hover:shadow-md dark:hover:shadow-lg',
        isHovered && 'ring-2 ring-primary-500'
      )}
      style={
        isHovered
          ? ({
              // Динамический ring opacity на основе спреда
              '--tw-ring-opacity': ringOpacity,
            } as React.CSSProperties)
          : undefined
      }
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={`Token ${tokenSymbol} on ${chain}`}
    >
      {/* Основной контейнер: левая часть (название) и правая часть (иконки + спреды) */}
      <div className="flex items-center gap-3 w-full">
        {/* Звезда - выровнена по центру вертикально */}
        <button
          onClick={handleFavoriteToggle}
          className={cn(
            'flex-shrink-0 p-0 transition-colors touch-manipulation self-center',
            'w-7 h-7 flex items-center justify-center',
            isFavorite
              ? 'text-yellow-500'
              : 'text-gray-500 dark:text-gray-500 hover:text-yellow-500'
          )}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className={cn('h-4 w-4', isFavorite && 'fill-current')} />
        </button>

        {/* Левая часть: название, лимит */}
        <div className="flex flex-col gap-1 flex-1 min-w-0 basis-0">
          {/* Верхняя строка: название, копирование */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
              {tokenSymbol}
            </span>
            {/* Кнопка копирования символа токена */}
            <button
              onClick={handleCopyToken}
              className={cn(
                'flex-shrink-0 p-0.5 rounded transition-colors touch-manipulation',
                'w-5 h-5 flex items-center justify-center',
                isCopied
                  ? 'text-green-500 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400'
              )}
              aria-label="Copy token address"
              title="Copy token address"
            >
              {isCopied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
          {/* Средняя строка: Лимит */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {formattedLimit}
            </span>
          </div>
        </div>

        {/* Средняя часть: Network иконка, стрелка, MEXC иконка */}
        <div className="flex items-center gap-1.5 flex-shrink-0 basis-auto">
          <button
            onClick={handleNetworkExchangeClick}
            className={cn(
              'p-0.5 rounded hover:bg-light-200 dark:hover:bg-dark-700 transition-colors touch-manipulation',
              'w-6 h-6 flex items-center justify-center',
              'hover:scale-110 active:scale-95'
            )}
            title={`Open ${networkExchange} on ${chain}`}
            aria-label={`Open ${networkExchange} on ${chain}`}
          >
            <img
              src={networkIcon}
              alt={chain}
              className="h-5 w-5 object-contain"
            />
          </button>
          <ArrowLeftRight className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
          <button
            onClick={handleMexcClick}
            className={cn(
              'p-0.5 rounded hover:bg-light-200 dark:hover:bg-dark-700 transition-colors touch-manipulation',
              'w-6 h-6 flex items-center justify-center',
              'hover:scale-110 active:scale-95'
            )}
            title="Open MEXC Futures"
            aria-label="Open MEXC Futures"
          >
            <img
              src={MEXC_LOGO}
              alt="MEXC"
              className="h-5 w-5 object-contain"
            />
          </button>
        </div>

        {/* Правая часть: Кнопка редактирования и два спреда (зеленый и красный) */}
        <div className="flex items-center gap-2 flex-shrink-0 basis-auto">
          {/* Кнопка редактирования - всегда показываем */}
          <button
            onClick={handleEdit}
            className="p-0 rounded border border-light-300 dark:border-dark-600 hover:bg-light-200 dark:hover:bg-dark-700 transition-colors touch-manipulation w-7 h-7 flex items-center justify-center"
            title="Edit token settings"
            aria-label="Edit token settings"
          >
            <Pencil className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
          {/* Контейнер для спредов: зеленый слева, красный/серый справа, разделены по середине */}
          <div
            className="flex h-7 rounded overflow-hidden"
            role="group"
            aria-label="Spread values"
          >
            {/* Зеленый спред (прямой: BNB/Sol → MEXC) - слева */}
            <div
              className={cn(
                'px-2.5 min-w-[50px] h-full flex items-center justify-center text-center',
                !directSpreadColor && 'bg-gray-400 dark:bg-gray-600'
              )}
              style={{
                backgroundColor: directSpreadColor
                  ? `hsl(${directSpreadColor.h}, ${directSpreadColor.s}%, ${directSpreadColor.l}%)`
                  : undefined,
              }}
              aria-label={`Direct spread: ${directSpread !== null ? `${directSpread.toFixed(2)}%` : 'not available'}`}
            >
              <span className="text-white text-xs font-medium">
                {directSpread !== null ? `${directSpread.toFixed(2)}%` : '—'}
              </span>
            </div>
            {/* Обратный спред (обратный: MEXC → BNB/Sol, из отдельной ручки сервера) - справа */}
            <div
              className={cn(
                'px-2.5 min-w-[50px] h-full flex items-center justify-center text-center',
                !reverseSpreadColor && 'bg-gray-400 dark:bg-gray-600'
              )}
              style={{
                backgroundColor: reverseSpreadColor
                  ? `hsl(${reverseSpreadColor.h}, ${reverseSpreadColor.s}%, ${reverseSpreadColor.l}%)`
                  : undefined,
              }}
              aria-label={`Reverse spread: ${reverseSpread !== null && !isNaN(reverseSpread) ? `${reverseSpread.toFixed(2)}%` : 'not available'}`}
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
  );
});
