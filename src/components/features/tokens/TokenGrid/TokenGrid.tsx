import { useState, useEffect, memo, useCallback } from 'react';
import { TokenCard } from '../TokenCard';
import type { StraightData } from '@/types';
import { logger } from '@/utils/logger';
import { useLanguage } from '@/contexts/LanguageContext';

export interface TokenGridProps {
  tokens: StraightData[];
  onFavoriteToggle?: (token: StraightData) => void;
  onEdit?: (token: StraightData) => void;
  isFavorite?: (token: StraightData) => boolean; // Функция для проверки, является ли токен избранным
}

// Максимальное количество токенов для начального рендеринга
// Остальные будут загружаться по мере прокрутки
const INITIAL_RENDER_LIMIT = 100;
const LOAD_MORE_BATCH = 50;

/**
 * Адаптивная сетка токенов с автоматическим определением количества колонок
 * Использует CSS Grid для эффективного отображения всех токенов
 *
 * Особенности:
 * - Адаптивный layout: 1 колонка на мобильных, 2 на планшетах, 3 на десктопе
 * - Автоматическое определение размеров на основе ширины экрана
 * - Ленивая загрузка для оптимизации производительности при большом количестве токенов
 * - Оптимизирован с помощью React.memo для предотвращения лишних ререндеров
 */
export const TokenGrid = memo(function TokenGrid({
  tokens,
  onFavoriteToggle,
  onEdit,
  isFavorite,
}: TokenGridProps) {
  const { t } = useLanguage();
  const [columnCount, setColumnCount] = useState(3);
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_LIMIT);

  // Определяем количество колонок в зависимости от ширины экрана
  // Используем useCallback для оптимизации
  const updateLayout = useCallback(() => {
    const width = window.innerWidth;

    if (width < 640) {
      // Mobile: 1 колонка
      setColumnCount(1);
    } else if (width < 1024) {
      // Tablet: 2 колонки
      setColumnCount(2);
    } else {
      // Desktop: 3 колонки
      setColumnCount(3);
    }
  }, []);

  useEffect(() => {
    updateLayout();

    // Debounce для resize события
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = setTimeout(() => {
        updateLayout();
      }, 150); // 150ms debounce
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
    };
  }, [updateLayout]);

  // Сбрасываем видимые токены при изменении списка токенов
  useEffect(() => {
    setVisibleCount(Math.min(INITIAL_RENDER_LIMIT, tokens.length));
  }, [tokens.length]);

  // Ленивая загрузка при прокрутке
  useEffect(() => {
    if (visibleCount >= tokens.length) return;

    const handleScroll = () => {
      const scrollBottom = window.innerHeight + window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;

      // Загружаем больше токенов когда пользователь близко к низу страницы
      if (scrollBottom >= documentHeight - 500) {
        setVisibleCount((prev) =>
          Math.min(prev + LOAD_MORE_BATCH, tokens.length)
        );
      }
    };

    // Throttle для оптимизации производительности
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledHandleScroll);
  }, [visibleCount, tokens.length]);

  // Видимые токены (slice быстрая операция, мемоизация не нужна)
  const visibleTokens = tokens.slice(0, visibleCount);

  // Защита от пустых данных
  if (tokens.length === 0) {
    return null;
  }

  // Проверяем, что columnCount валиден
  if (!columnCount || columnCount < 1) {
    logger.warn('TokenGrid: Invalid column count', { columnCount });
    return null;
  }

  return (
    <>
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        }}
      >
        {visibleTokens.map((row) => {
          const network = (row.network || '').toLowerCase();
          const chain: 'solana' | 'bsc' =
            network === 'bsc' || network === 'bep20' ? 'bsc' : 'solana';
          const symbol = (row.token || '').toUpperCase().trim();
          // Используем только symbol-chain для key, БЕЗ index
          // Это гарантирует, что React будет обновлять тот же компонент при изменении данных токена
          const key = `${symbol}-${chain}`;

          return (
            <TokenCard
              key={key}
              token={row}
              isFavorite={isFavorite ? isFavorite(row) : false}
              onFavoriteToggle={
                onFavoriteToggle ? () => onFavoriteToggle(row) : undefined
              }
              onEdit={onEdit ? () => onEdit(row) : undefined}
            />
          );
        })}
      </div>
      {visibleCount < tokens.length && (
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('tokens.showing')
            ?.replace('{{visible}}', String(visibleCount))
            ?.replace('{{total}}', String(tokens.length)) ||
            `Показано ${visibleCount} из ${tokens.length} токенов. Прокрутите вниз для загрузки остальных.`}
        </div>
      )}
    </>
  );
});
