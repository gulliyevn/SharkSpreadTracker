/**
 * Экспорт всех источников API
 * Используется для регистрации и управления источниками
 */

export type { IApiSource } from './IApiSource';
export { BaseApiSource } from './BaseApiSource';
export { JupiterSource } from './JupiterSource';
export { PancakeSource } from './PancakeSource';
export { MexcSource } from './MexcSource';

/**
 * Регистр всех доступных источников
 * Новые источники должны быть добавлены сюда
 */
import { JupiterSource } from './JupiterSource';
import { PancakeSource } from './PancakeSource';
import { MexcSource } from './MexcSource';
import type { IApiSource } from './IApiSource';

/**
 * Создать экземпляры всех источников
 */
export function createSources(): IApiSource[] {
  return [
    new JupiterSource(),
    new PancakeSource(),
    new MexcSource(),
  ];
}

/**
 * Получить источник по ID
 */
export function getSourceById(id: string): IApiSource | undefined {
  const sources = createSources();
  return sources.find((source) => source.id === id);
}

/**
 * Получить источники для указанного блокчейна
 */
export function getSourcesForChain(chain: 'solana' | 'bsc'): IApiSource[] {
  const sources = createSources();
  return sources.filter((source) => source.supportsChain(chain));
}

