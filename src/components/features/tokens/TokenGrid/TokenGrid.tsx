import { useState, useEffect, memo, useCallback } from 'react';
import { TokenCard } from '../TokenCard';
import type { StraightData } from '@/types';
import { logger } from '@/utils/logger';

export interface TokenGridProps {
  tokens: StraightData[];
  onFavoriteToggle?: (token: StraightData) => void;
  onEdit?: (token: StraightData) => void;
}

/**
 * Адаптивная сетка токенов с автоматическим определением количества колонок
 * Использует CSS Grid для эффективного отображения всех токенов
 *
 * Особенности:
 * - Адаптивный layout: 1 колонка на мобильных, 2 на планшетах, 3 на десктопе
 * - Автоматическое определение размеров на основе ширины экрана
 * - Оптимизирован для отображения любого количества токенов
 * - Оптимизирован с помощью React.memo для предотвращения лишних ререндеров
 *
 * Примечание: Изначально планировалась виртуализация через react-window,
 * но CSS Grid показал отличную производительность даже для больших списков,
 * поэтому виртуализация не требуется.
 */
export const TokenGrid = memo(function TokenGrid({
  tokens,
  onFavoriteToggle,
  onEdit,
}: TokenGridProps) {
  const [columnCount, setColumnCount] = useState(3);

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
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [updateLayout]);

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
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
      }}
    >
      {tokens.map((row, index) => {
        const network = (row.network || '').toLowerCase();
        const chain: 'solana' | 'bsc' = network === 'bsc' || network === 'bep20' ? 'bsc' : 'solana';
        const symbol = (row.token || '').toUpperCase().trim();
        
        return (
          <TokenCard
            key={`${symbol}-${chain}-${index}`}
            token={row}
            isFavorite={false}
            onFavoriteToggle={onFavoriteToggle ? () => onFavoriteToggle(row) : undefined}
            onEdit={onEdit ? () => onEdit(row) : undefined}
          />
        );
      })}
    </div>
  );
});
