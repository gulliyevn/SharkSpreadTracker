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

  // Блокировка скролла body при открытом модальном окне
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
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-light-200 dark:border-dark-700">
            {title && (
              <h2
                id="modal-title"
                className="text-lg sm:text-xl font-semibold text-dark-950 dark:text-dark-50"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={cn(
                  'ml-auto p-1.5 rounded-md transition-colors',
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

        {/* Content */}
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

