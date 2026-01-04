import React, { createContext, useContext, useState, useCallback } from 'react';

interface MinSpreadContextType {
  minSpread: number;
  setMinSpread: (value: number) => void;
}

const MinSpreadContext = createContext<MinSpreadContextType | undefined>(
  undefined
);

interface MinSpreadProviderProps {
  children: React.ReactNode;
}

export function MinSpreadProvider({ children }: MinSpreadProviderProps) {
  const [minSpread, setMinSpreadState] = useState(() => {
    const saved = localStorage.getItem('min-spread');
    if (saved && saved !== '') {
      const parsed = parseFloat(saved);
      // Проверяем на NaN, Infinity и валидность числа
      if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0 && parsed <= 1000) {
        return parsed;
      }
    }
    return 0;
  });

  const setMinSpread = useCallback((value: number) => {
    setMinSpreadState(value);
    // Сохраняем в localStorage только если значение больше 0
    if (value > 0) {
      localStorage.setItem('min-spread', value.toString());
    } else {
      // Если 0, удаляем из localStorage, чтобы при следующей загрузке поле было пустым
      localStorage.removeItem('min-spread');
    }
  }, []);

  return (
    <MinSpreadContext.Provider value={{ minSpread, setMinSpread }}>
      {children}
    </MinSpreadContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMinSpread() {
  const context = useContext(MinSpreadContext);
  if (context === undefined) {
    throw new Error('useMinSpread must be used within a MinSpreadProvider');
  }
  return context;
}
