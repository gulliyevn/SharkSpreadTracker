import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ViewProvider, useView } from './contexts/ViewContext';
import { TokensPage } from './pages/TokensPage';
import { ChartsPage } from './pages/ChartsPage';

/**
 * Главный компонент приложения
 */
function AppContent() {
  const { currentView } = useView();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-900 text-dark-950 dark:text-dark-50">
      <Header />
      <main className="flex-1">
        {currentView === 'tokens' ? <TokensPage /> : <ChartsPage />}
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ViewProvider>
      <AppContent />
    </ViewProvider>
  );
}

export default App;
