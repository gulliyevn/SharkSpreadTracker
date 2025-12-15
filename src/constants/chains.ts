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
 * Получить конфигурацию цепи
 */
export const getChainConfig = (chain: ChainType): ChainConfig => {
  return CHAINS[chain];
};
