import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ModalProps {
  /**
   * Открыто ли модальное окно
   */
  isOpen: boolean;
  /**
   * Функция закрытия модального окна
   */
  onClose: () => void;
  /**
   * Заголовок модального окна
   */
  title?: string;
  /**
   * Содержимое модального окна
   */
  children: ReactNode;
  /**
   * Размер модального окна
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /**
   * Показывать ли кнопку закрытия
   */
  showCloseButton?: boolean;
  /**
   * Закрывать ли при клике на overlay
   */
  closeOnOverlayClick?: boolean;
  /**
   * Дополнительные классы для контейнера
   */
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
};

/**
 * Компонент модального окна
 * Поддерживает закрытие по Escape, клику на overlay и кнопке закрытия
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Блокировка скролла body и focus management при открытом модальном окне
  useEffect(() => {
    if (isOpen) {
      // Сохраняем текущий активный элемент
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Блокируем скролл
      document.body.style.overflow = 'hidden';

      // Фокусируемся на модальном окне
      if (modalRef.current) {
        const focusableElement = modalRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusableElement?.focus();
      }

      // Focus trap: ловим Tab внутри модального окна
      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !modalRef.current) return;

        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (!firstElement || !lastElement) return;

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTabKey);
      return () => {
        document.removeEventListener('keydown', handleTabKey);
        document.body.style.overflow = '';
      };
    } else {
      // Восстанавливаем скролл
      document.body.style.overflow = '';

      // Возвращаем фокус на предыдущий элемент
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className={cn(
          'relative z-10 w-full rounded-lg shadow-xl',
          'bg-light-50 dark:bg-dark-800',
          'border border-light-300 dark:border-dark-700',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          'max-h-[90vh] flex flex-col',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-light-200 dark:border-dark-700 flex-shrink-0">
            {title && (
              <h2
                id="modal-title"
                className="text-base sm:text-lg font-semibold text-dark-950 dark:text-dark-50 truncate pr-2"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={cn(
                  'ml-auto p-2 rounded-md transition-colors flex-shrink-0 touch-manipulation',
                  'min-w-[44px] min-h-[44px] flex items-center justify-center', // Минимум 44x44px для touch targets
                  'text-light-600 dark:text-dark-400',
                  'hover:bg-light-200 dark:hover:bg-dark-700',
                  'hover:text-dark-950 dark:hover:text-dark-50'
                )}
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content - скроллируемый */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
