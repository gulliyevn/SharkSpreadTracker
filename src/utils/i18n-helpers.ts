/**
 * Хелперы для получения переводов констант
 * Используются в компонентах через useTranslation
 */

import type { TimeframeOption } from '@/types';
import type { SourceType } from '@/types';
import type { ChainType } from '@/constants/chains';

/**
 * Получить переведенный лейбл таймфрейма
 */
export function getTimeframeLabel(timeframe: TimeframeOption, t: (key: string) => string): string {
  return t(`timeframes.${timeframe}`);
}

/**
 * Получить переведенный лейбл источника
 */
export function getSourceLabel(source: SourceType, t: (key: string) => string): string {
  return t(`sources.${source}`);
}

/**
 * Получить переведенный лейбл цепи
 */
export function getChainLabel(chain: ChainType, t: (key: string) => string): string {
  return t(`chains.${chain}`);
}

