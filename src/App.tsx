import { lazy, Suspense } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ViewProvider, useView } from './contexts/ViewContext';
import { SearchProvider } from './contexts/SearchContext';
import { MinSpreadProvider } from './contexts/MinSpreadContext';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { ToastContainer } from './components/ui/Toast';

// Ленивая загрузка страниц для уменьшения bundle size
const TokensPage = lazy(() =>
  import('./pages/TokensPage').then((module) => ({
    default: module.TokensPage,
  }))
);
const ChartsPage = lazy(() =>
  import('./pages/ChartsPage').then((module) => ({
    default: module.ChartsPage,
  }))
);

/**
 * Главный компонент приложения
 */
function AppContent() {
  const { currentView } = useView();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-900 text-gray-900 dark:text-white">
      <Header />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          {currentView === 'tokens' ? <TokensPage /> : <ChartsPage />}
        </Suspense>
      </main>
      <Footer />
      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <ViewProvider>
      <SearchProvider>
        <MinSpreadProvider>
      <AppContent />
        </MinSpreadProvider>
      </SearchProvider>
    </ViewProvider>
  );
}

export default App;
