import React, { createContext, useContext, useState, useCallback } from 'react';

export type ViewType = 'tokens' | 'charts';

interface ViewContextType {
  currentView: ViewType;
  setView: (view: ViewType) => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

interface ViewProviderProps {
  children: React.ReactNode;
}

export function ViewProvider({ children }: ViewProviderProps) {
  const [currentView, setCurrentView] = useState<ViewType>('tokens');

  const setView = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  return (
    <ViewContext.Provider value={{ currentView, setView }}>
      {children}
    </ViewContext.Provider>
  );
}

/**
 * Хук для использования текущего вида
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useView() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}

