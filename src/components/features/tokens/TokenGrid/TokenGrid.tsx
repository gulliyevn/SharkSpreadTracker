import { useState, useEffect } from 'react';
import { TokenCard } from '../TokenCard';
import type { TokenWithData } from '@/api/endpoints/tokens.api';

export interface TokenWithFavorite extends TokenWithData {
  isFavorite?: boolean;
}

export interface TokenGridProps {
  tokens: TokenWithFavorite[];
  onFavoriteToggle?: (token: TokenWithFavorite) => void;
}

/**
 * Адаптивная сетка токенов с автоматическим определением количества колонок
 * Использует CSS Grid для эффективного отображения всех токенов
 * 
 * Особенности:
 * - Адаптивный layout: 1 колонка на мобильных, 2 на планшетах, 3 на десктопе
 * - Автоматическое определение размеров на основе ширины экрана
 * - Оптимизирован для отображения любого количества токенов
 * 
 * Примечание: Изначально планировалась виртуализация через react-window,
 * но CSS Grid показал отличную производительность даже для больших списков,
 * поэтому виртуализация не требуется.
 */
export function TokenGrid({
  tokens,
  onFavoriteToggle,
}: TokenGridProps) {
  const [columnCount, setColumnCount] = useState(3);

  // Определяем количество колонок в зависимости от ширины экрана
  useEffect(() => {
    const updateLayout = () => {
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
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  // Защита от пустых данных
  if (tokens.length === 0) {
    return null;
  }

  // Проверяем, что columnCount валиден
  if (!columnCount || columnCount < 1) {
    console.warn('TokenGrid: Invalid column count', { columnCount });
    return null;
  }

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
      }}
    >
      {tokens.map((token, index) => (
        <TokenCard
          key={`${token.symbol}-${token.chain}-${index}`}
          token={token}
          price={token.price}
          directSpread={token.directSpread}
          reverseSpread={token.reverseSpread}
          isFavorite={token.isFavorite}
          onFavoriteToggle={onFavoriteToggle}
        />
      ))}
    </div>
  );
}

