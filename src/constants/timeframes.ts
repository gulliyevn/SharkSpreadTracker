import type { TimeframeOption } from '@/types';

export interface TimeframeConfig {
  value: TimeframeOption;
  label: string;
  minutes: number;
}

export const TIMEFRAMES: Record<TimeframeOption, TimeframeConfig> = {
  '1m': {
    value: '1m',
    label: '1 минута',
    minutes: 1,
  },
  '5m': {
    value: '5m',
    label: '5 минут',
    minutes: 5,
  },
  '15m': {
    value: '15m',
    label: '15 минут',
    minutes: 15,
  },
  '1h': {
    value: '1h',
    label: '1 час',
    minutes: 60,
  },
  '4h': {
    value: '4h',
    label: '4 часа',
    minutes: 240,
  },
  '1d': {
    value: '1d',
    label: '1 день',
    minutes: 1440,
  },
} as const;

export const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  '1m',
  '5m',
  '15m',
  '1h',
  '4h',
  '1d',
];

/**
 * Получить конфигурацию таймфрейма
 */
export const getTimeframeConfig = (
  timeframe: TimeframeOption
): TimeframeConfig => {
  return TIMEFRAMES[timeframe];
};

