export type ChainType = 'solana' | 'bsc';

export interface ChainConfig {
  id: ChainType;
  label: string;
  emoji: string;
}

export const CHAINS: Record<ChainType, ChainConfig> = {
  solana: {
    id: 'solana',
    label: 'Solana',
    emoji: '🟣',
  },
  bsc: {
    id: 'bsc',
    label: 'BSC',
    emoji: '🟡',
  },
} as const;

/**
 * Chain IDs для различных API (DexScreener и др.)
 */
export const CHAIN_IDS = {
  BSC: ['bsc', '56'] as const,
  SOLANA: ['solana', 'sol'] as const,
} as const;

/**
 * Получить конфигурацию цепи
 */
export const getChainConfig = (chain: ChainType): ChainConfig => {
  return CHAINS[chain];
};
