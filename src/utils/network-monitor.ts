/**
 * Network Monitor - отслеживание состояния сети
 * Используется для адаптации поведения приложения на медленных сетях
 */

export type NetworkConnectionType = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';

export interface NetworkInfo {
  effectiveType: NetworkConnectionType;
  downlink: number; // Mbps
  rtt: number; // Round-trip time в миллисекундах
  saveData: boolean; // Режим экономии данных
}

class NetworkMonitor {
  private networkInfo: NetworkInfo | null = null;
  private listeners: Set<(info: NetworkInfo) => void> = new Set();

  constructor() {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      // Network Information API
      interface NetworkConnection {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
        addEventListener?: (event: string, handler: () => void) => void;
      }
      
      const connection = ((navigator as unknown as { connection?: NetworkConnection }).connection ||
        (navigator as unknown as { mozConnection?: NetworkConnection }).mozConnection ||
        (navigator as unknown as { webkitConnection?: NetworkConnection }).webkitConnection) as NetworkConnection | undefined;
      
      if (connection) {
        this.updateNetworkInfo(connection);
        
        // Слушаем изменения состояния сети
        if (connection.addEventListener) {
          connection.addEventListener('change', () => {
            this.updateNetworkInfo(connection);
          });
        }
      }
    }
  }

  private updateNetworkInfo(connection: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  }): void {
    const effectiveType = (connection.effectiveType || 'unknown') as NetworkConnectionType;
    const downlink = connection.downlink || 0;
    const rtt = connection.rtt || 0;
    const saveData = connection.saveData || false;

    this.networkInfo = {
      effectiveType,
      downlink,
      rtt,
      saveData,
    };

    // Уведомляем всех подписчиков
    this.notifyListeners();
  }

  /**
   * Получить текущую информацию о сети
   */
  getNetworkInfo(): NetworkInfo | null {
    return this.networkInfo;
  }

  /**
   * Проверить, является ли сеть медленной
   */
  isSlowNetwork(): boolean {
    if (!this.networkInfo) return false;
    return (
      this.networkInfo.effectiveType === 'slow-2g' ||
      this.networkInfo.effectiveType === '2g' ||
      this.networkInfo.downlink < 1.5 || // Меньше 1.5 Mbps
      this.networkInfo.rtt > 1000 || // RTT больше 1 секунды
      this.networkInfo.saveData
    );
  }

  /**
   * Получить рекомендуемый интервал обновления для медленных сетей
   */
  getRecommendedRefreshInterval(baseInterval: number): number {
    if (this.isSlowNetwork()) {
      // Увеличиваем интервал в 3 раза для медленных сетей
      return baseInterval * 3;
    }
    return baseInterval;
  }

  /**
   * Подписаться на изменения состояния сети
   */
  subscribe(callback: (info: NetworkInfo) => void): () => void {
    this.listeners.add(callback);
    
    // Сразу вызываем callback с текущим состоянием
    if (this.networkInfo) {
      callback(this.networkInfo);
    }

    // Возвращаем функцию отписки
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    if (!this.networkInfo) return;
    
    this.listeners.forEach((callback) => {
      try {
        callback(this.networkInfo!);
      } catch (error) {
        console.error('[NetworkMonitor] Error in listener callback:', error);
      }
    });
  }
}

// Singleton экземпляр
export const networkMonitor = new NetworkMonitor();

