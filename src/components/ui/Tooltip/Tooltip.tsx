import { useState, useRef, useEffect, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface TooltipProps {
  /**
   * Содержимое подсказки
   */
  content: ReactNode;
  /**
   * Элемент, к которому привязана подсказка
   */
  children: ReactNode;
  /**
   * Позиция подсказки относительно элемента
   */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /**
   * Задержка перед показом (в мс)
   */
  delay?: number;
  /**
   * Дополнительные классы для контейнера подсказки
   */
  className?: string;
  /**
   * Отключить подсказку
   */
  disabled?: boolean;
}

/**
 * Компонент подсказки (tooltip)
 * Показывает всплывающую подсказку при наведении на элемент
 */
export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  className,
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Вычисляем позицию подсказки
  useEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current || disabled) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top + scrollY - tooltipRect.height - 8;
        left =
          triggerRect.left +
          scrollX +
          triggerRect.width / 2 -
          tooltipRect.width / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollY + 8;
        left =
          triggerRect.left +
          scrollX +
          triggerRect.width / 2 -
          tooltipRect.width / 2;
        break;
      case 'left':
        top =
          triggerRect.top +
          scrollY +
          triggerRect.height / 2 -
          tooltipRect.height / 2;
        left = triggerRect.left + scrollX - tooltipRect.width - 8;
        break;
      case 'right':
        top =
          triggerRect.top +
          scrollY +
          triggerRect.height / 2 -
          tooltipRect.height / 2;
        left = triggerRect.right + scrollX + 8;
        break;
    }

    // Корректируем позицию, чтобы не выходить за границы экрана
    const padding = 8;
    const maxLeft = window.innerWidth + scrollX - tooltipRect.width - padding;
    const maxTop = window.innerHeight + scrollY - tooltipRect.height - padding;
    const minLeft = scrollX + padding;
    const minTop = scrollY + padding;

    left = Math.max(minLeft, Math.min(maxLeft, left));
    top = Math.max(minTop, Math.min(maxTop, top));

    setTooltipPosition({ top, left });
  }, [isVisible, position, disabled]);

  const handleMouseEnter = () => {
    if (disabled) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
    setTooltipPosition(null);
  };

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className={cn(
            'fixed z-50 px-2 py-1.5 text-xs font-medium rounded-md shadow-lg',
            'bg-dark-900 dark:bg-dark-950 text-white dark:text-dark-50',
            'border border-dark-700 dark:border-dark-600',
            'pointer-events-none',
            'animate-in fade-in-0 zoom-in-95 duration-150',
            className
          )}
          style={
            tooltipPosition
              ? {
                  top: `${tooltipPosition.top}px`,
                  left: `${tooltipPosition.left}px`,
                }
              : { visibility: 'hidden' }
          }
          role="tooltip"
        >
          {content}
          {/* Стрелка */}
          <div
            className={cn(
              'absolute w-2 h-2 rotate-45',
              'bg-dark-900 dark:bg-dark-950 border-dark-700 dark:border-dark-600',
              position === 'top' &&
                'bottom-[-4px] left-1/2 -translate-x-1/2 border-r border-b',
              position === 'bottom' &&
                'top-[-4px] left-1/2 -translate-x-1/2 border-l border-t',
              position === 'left' &&
                'right-[-4px] top-1/2 -translate-y-1/2 border-r border-b',
              position === 'right' &&
                'left-[-4px] top-1/2 -translate-y-1/2 border-l border-t'
            )}
          />
        </div>
      )}
    </>
  );
}
