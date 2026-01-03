import { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import { Grid, type CellComponentProps } from 'react-window';
import { TokenCard } from '../TokenCard';
import type { StraightData } from '@/types';
import { logger } from '@/utils/logger';

export interface TokenGridProps {
  tokens: StraightData[];
  onFavoriteToggle?: (token: StraightData) => void;
  onEdit?: (token: StraightData) => void;
  isFavorite?: (token: StraightData) => boolean; // Функция для проверки, является ли токен избранным
}

// Примерная высота TokenCard (можно настроить под реальные размеры)
// Реальная высота карточки примерно 60-70px
const ITEM_HEIGHT = 70; // Высота одной карточки токена
const ITEM_GAP = 2; // Отступ между элементами (горизонтальный и вертикальный)

/**
 * Адаптивная сетка токенов с виртуализацией для оптимизации производительности
 * Использует react-window для рендеринга только видимых элементов
 *
 * Особенности:
 * - Адаптивный layout: 1 колонка на мобильных, 2 на планшетах, 3 на десктопе
 * - Виртуализация: рендерит только видимые элементы для оптимизации производительности
 * - Автоматическое определение размеров на основе ширины экрана
 * - Оптимизирован с помощью React.memo для предотвращения лишних ререндеров
 */
export const TokenGrid = memo(function TokenGrid({
  tokens,
  onFavoriteToggle,
  onEdit,
  isFavorite,
}: TokenGridProps) {
  // const { t } = useLanguage(); // Не используется в виртуализированной версии
  const [columnCount, setColumnCount] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Определяем количество колонок в зависимости от ширины экрана
  const updateLayout = useCallback(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

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

    // Обновляем размеры контейнера
    setContainerSize({ width, height });
  }, []);

  useEffect(() => {
    // Инициализация размеров при монтировании
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

    // Используем ResizeObserver для отслеживания изменений размера контейнера
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateLayout();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [updateLayout]);

  // Вычисляем количество строк на основе количества токенов и колонок
  const rowCount = useMemo(() => {
    if (tokens.length === 0 || columnCount === 0) return 0;
    return Math.ceil(tokens.length / columnCount);
  }, [tokens.length, columnCount]);

  // Вычисляем ширину колонки
  const columnWidth = useMemo(() => {
    if (columnCount === 0 || containerSize.width === 0) return 0;
    // Учитываем горизонтальный gap между элементами и немного уменьшаем ширину контейнера
    const totalGap = ITEM_GAP * (columnCount - 1);
    const containerWidth = containerSize.width - 8; // Уменьшаем ширину на 8px
    return (containerWidth - totalGap) / columnCount;
  }, [columnCount, containerSize.width]);

  // Функция для получения токена по индексу строки и колонки
  const getToken = useCallback(
    (rowIndex: number, columnIndex: number): StraightData | null => {
      const index = rowIndex * columnCount + columnIndex;
      const token = index < tokens.length ? tokens[index] : undefined;
      return token ?? null;
    },
    [tokens, columnCount]
  );

  // Рендерер ячейки для виртуализированной сетки
  const Cell = useCallback(
    ({ columnIndex, rowIndex, style, ariaAttributes }: CellComponentProps) => {
      const token = getToken(rowIndex, columnIndex);

      if (!token) {
        return <div style={style} {...ariaAttributes} />;
      }

      const network = (token.network || '').toLowerCase();
      const chain: 'solana' | 'bsc' =
        network === 'bsc' || network === 'bep20' ? 'bsc' : 'solana';
      const symbol = (token.token || '').toUpperCase().trim();
      const key = `${symbol}-${chain}`;

      return (
        <div
          style={{
            ...style,
            paddingRight: columnIndex < columnCount - 1 ? `${ITEM_GAP}px` : '0',
            paddingBottom: rowIndex < rowCount - 1 ? `${ITEM_GAP}px` : '0',
            boxSizing: 'border-box',
          }}
          {...ariaAttributes}
        >
          <TokenCard
            key={key}
            token={token}
            isFavorite={isFavorite ? isFavorite(token) : false}
            onFavoriteToggle={
              onFavoriteToggle ? () => onFavoriteToggle(token) : undefined
            }
            onEdit={onEdit ? () => onEdit(token) : undefined}
          />
        </div>
      );
    },
    [getToken, isFavorite, onFavoriteToggle, onEdit, columnCount, rowCount]
  );

  // Защита от пустых данных
  if (tokens.length === 0) {
    return null;
  }

  // Проверяем, что columnCount валиден
  if (!columnCount || columnCount < 1) {
    logger.warn('TokenGrid: Invalid column count', { columnCount });
    return null;
  }

  // Если контейнер еще не инициализирован или нет токенов для виртуализации, показываем обычную сетку
  const shouldUseVirtualization =
    containerSize.width > 0 && containerSize.height > 0 && tokens.length > 50;

  if (!shouldUseVirtualization) {
    return (
      <div
        ref={containerRef}
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        }}
      >
        {tokens.map((row) => {
          const network = (row.network || '').toLowerCase();
          const chain: 'solana' | 'bsc' =
            network === 'bsc' || network === 'bep20' ? 'bsc' : 'solana';
          const symbol = (row.token || '').toUpperCase().trim();
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
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: containerSize.height || '100vh',
        minHeight: '600px', // Минимальная высота для виртуализации
      }}
    >
      <Grid
        columnCount={columnCount}
        columnWidth={columnWidth}
        defaultHeight={containerSize.height}
        defaultWidth={containerSize.width}
        rowCount={rowCount}
        rowHeight={ITEM_HEIGHT + ITEM_GAP}
        cellComponent={Cell}
        cellProps={{} as Record<string, never>}
        onResize={({ height, width }) => {
          setContainerSize({ width, height });
        }}
        style={{
          overflowX: 'hidden',
          height: containerSize.height,
          width: containerSize.width,
        }}
      />
    </div>
  );
});
