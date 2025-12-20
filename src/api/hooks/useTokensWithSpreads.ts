import { useState, useEffect, useCallback } from 'react';
import { useTokens } from './useTokens';
import { getSpreadsForTokens } from '../endpoints/spreads.api';
import type { TokenWithData } from '../endpoints/tokens.api';
import { logger } from '@/utils/logger';
import { networkMonitor } from '@/utils/network-monitor';

const INITIAL_BATCH_SIZE = 50; // Первая порция токенов для загрузки данных
const BATCH_SIZE = 25; // Размер последующих батчей

/**
 * Хук для получения токенов с ценами и спредами
 * Загружает данные постепенно, начиная с первых N токенов
 */
export function useTokensWithSpreads() {
  const { data: tokens = [], isLoading, error, refetch } = useTokens();
  const [tokensWithData, setTokensWithData] = useState<TokenWithData[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);

  // Загружаем данные для токенов постепенно
  const loadSpreadsForTokens = useCallback(
    async (tokensToLoad: TokenWithData[], startIndex: number = 0) => {
      if (tokensToLoad.length === 0) return;

      try {
        const batch = tokensToLoad.slice(startIndex, startIndex + BATCH_SIZE);
        if (batch.length === 0) {
          return;
        }

        logger.debug(
          `Loading spreads for tokens ${startIndex + 1}-${startIndex + batch.length} of ${tokensToLoad.length}`
        );

        const tokensWithSpreads = await getSpreadsForTokens(batch, undefined, batch.length);

        setTokensWithData((prev) => {
          const updated = [...prev];
          tokensWithSpreads.forEach((tokenWithSpread) => {
            const index = tokensToLoad.findIndex(
              (t) => t.symbol === tokenWithSpread.symbol && t.chain === tokenWithSpread.chain
            );
            if (index !== -1 && tokenWithSpread.symbol && tokenWithSpread.chain) {
              updated[index] = {
                ...tokensToLoad[index],
                symbol: tokenWithSpread.symbol,
                chain: tokenWithSpread.chain,
                price: tokenWithSpread.price,
                directSpread: tokenWithSpread.directSpread,
                reverseSpread: tokenWithSpread.reverseSpread,
              };
            }
          });
          return updated;
        });

        setLoadedCount(startIndex + batch.length);

        // Загружаем следующий батч через адаптивную задержку
        // На медленных сетях увеличиваем задержку
        if (startIndex + batch.length < tokensToLoad.length) {
          const delay = networkMonitor.isSlowNetwork() ? 1500 : 500; // 1.5s для медленных сетей, 500ms для быстрых
          setTimeout(() => {
            loadSpreadsForTokens(tokensToLoad, startIndex + batch.length);
          }, delay);
        } else {
          logger.info(`Finished loading spreads for all ${tokensToLoad.length} tokens`);
        }
      } catch (error) {
        logger.error('Error loading spreads for tokens', error);
      }
    },
    []
  );

  // Когда токены загружены, начинаем загружать данные для первых N токенов
  useEffect(() => {
    if (tokens.length > 0 && tokensWithData.length === 0) {
      // Инициализируем массив токенов без данных
      setTokensWithData(tokens);
      setLoadedCount(0);

      // Загружаем данные для первых INITIAL_BATCH_SIZE токенов
      const initialBatch = tokens.slice(0, INITIAL_BATCH_SIZE);
      if (initialBatch.length > 0) {
        loadSpreadsForTokens(tokens, 0);
      }
    } else if (tokens.length !== tokensWithData.length) {
      // Если список токенов изменился, обновляем
      setTokensWithData(tokens);
      setLoadedCount(0);
      const initialBatch = tokens.slice(0, INITIAL_BATCH_SIZE);
      if (initialBatch.length > 0) {
        loadSpreadsForTokens(tokens, 0);
      }
    }
  }, [tokens, loadSpreadsForTokens, tokensWithData.length]);

  return {
    data: tokensWithData.length > 0 ? tokensWithData : tokens, // Показываем токены сразу, даже если спреды еще загружаются
    isLoading: isLoading, // isLoading только для первоначальной загрузки токенов, не для спредов
    error,
    loadedCount,
    totalCount: tokens.length,
    refetch, // Добавляем refetch для retry механизма
  };
}
