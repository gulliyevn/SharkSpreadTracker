import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Утилита для объединения классов Tailwind
 * Объединяет clsx и tailwind-merge для правильной обработки конфликтующих классов
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
