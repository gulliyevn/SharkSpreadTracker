import type { SourceType } from '@/types';

export interface SourceConfig {
  id: SourceType;
  label: string;
  emoji: string;
  colorTailwind: string;
  colorHex: string;
  chains: ('solana' | 'bsc')[];
  priceField: string;
}

export const SOURCES: Record<SourceType, SourceConfig> = {
  mexc: {
    id: 'mexc',
    label: 'MEXC',
    emoji: '💱',
    colorTailwind: 'text-yellow-400',
    colorHex: '#fbbf24',
    chains: ['solana', 'bsc'],
    priceField: 'mexc_price',
  },
  jupiter: {
    id: 'jupiter',
    label: 'Jupiter',
    emoji: '🪐',
    colorTailwind: 'text-purple-400',
    colorHex: '#a78bfa',
    chains: ['solana'],
    priceField: 'jupiter_price',
  },
  pancakeswap: {
    id: 'pancakeswap',
    label: 'PancakeSwap',
    emoji: '🥞',
    colorTailwind: 'text-yellow-400',
    colorHex: '#facc15',
    chains: ['bsc'],
    priceField: 'pancakeswap_price',
  },
} as const;

/**
 * Получить конфигурацию источника по ID
 */
export const getSourceConfig = (sourceId: SourceType): SourceConfig => {
  return SOURCES[sourceId];
};

/**
 * Получить доступные источники для указанной цепи
 */
export const getSourcesForChain = (
  chain: 'solana' | 'bsc'
): SourceConfig[] => {
  return Object.values(SOURCES).filter((source) =>
    source.chains.includes(chain)
  );
};

