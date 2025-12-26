import { Moon, Sun, BarChart3, Coins } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useView } from '@/contexts/ViewContext';
import { useSearch } from '@/contexts/SearchContext';
import { TokenSearch } from '@/components/features/tokens/TokenSearch';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { cn } from '@/utils/cn';

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t, currentLanguage, changeLanguage } = useLanguage();
  const { currentView, setView } = useView();
  const { searchTerm, setSearchTerm } = useSearch();

  return (
    <header
      role="banner"
      className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-dark-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-dark-900/80 border-light-200 dark:border-dark-800"
    >
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row h-auto sm:h-[68px] md:h-[72px] items-stretch sm:items-center justify-between gap-2 sm:gap-0">
          {/* Logo and Title */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <img
              src="/assets/SharkLogo.png"
              alt="Shark Spread Tracker Logo"
              className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 object-contain flex-shrink-0"
              loading="eager"
              width="40"
              height="40"
              decoding="async"
            />
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
              {t('app.title')}
            </h1>
          </div>

          {/* Поиск */}
          <div className="flex-1 max-w-full sm:max-w-md mx-0 sm:mx-4 order-3 sm:order-2">
            <TokenSearch
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={
                t('tokens.searchPlaceholder') || 'Search token (BTC, SOL)...'
              }
            />
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-1 sm:gap-2 order-2 sm:order-3">
            {/* Connection Status */}
            <ConnectionStatus showLabel={false} className="hidden sm:flex" />

            {/* View Switcher - кнопка для графиков */}
            <button
              onClick={() =>
                setView(currentView === 'charts' ? 'tokens' : 'charts')
              }
              className={cn(
                'flex items-center justify-center p-2 sm:p-1.5 md:p-2 rounded-lg border transition-colors touch-manipulation',
                'min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto',
                'bg-primary-600 border-primary-600 text-white hover:bg-primary-700 active:scale-95'
              )}
              title={
                currentView === 'charts' ? 'Switch to tokens' : 'Open charts'
              }
              aria-label={
                currentView === 'charts' ? 'Switch to tokens' : 'Open charts'
              }
            >
              {currentView === 'charts' ? (
                <Coins className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>

            {/* Language Switcher - циклическая кнопка: EN → RU → TR → EN */}
            <button
              onClick={() => {
                if (currentLanguage === 'en') {
                  changeLanguage('ru');
                } else if (currentLanguage === 'ru') {
                  changeLanguage('tr');
                } else {
                  changeLanguage('en');
                }
              }}
              className={cn(
                'px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors border',
                'bg-primary-600 border-primary-600 text-white hover:bg-primary-700',
                'min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto flex items-center justify-center touch-manipulation'
              )}
              title={
                currentLanguage === 'en'
                  ? 'English (click to switch to Russian)'
                  : currentLanguage === 'ru'
                    ? 'Русский (нажмите для переключения на турецкий)'
                    : "Türkçe (İngilizce'ye geçmek için tıklayın)"
              }
              aria-label={`Current language: ${currentLanguage.toUpperCase()}, click to switch`}
            >
              {currentLanguage.toUpperCase()}
            </button>

            {/* Theme Switcher - циклическая кнопка */}
            <button
              onClick={() =>
                setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
              }
              className={cn(
                'p-2 sm:p-1.5 md:p-2 rounded-lg border transition-colors',
                'bg-primary-600 border-primary-600 text-white hover:bg-primary-700',
                'touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center',
                'sm:min-w-auto sm:min-h-auto active:scale-95'
              )}
              title={
                resolvedTheme === 'dark'
                  ? 'Dark mode (click to switch to light)'
                  : 'Light mode (click to switch to dark)'
              }
              aria-label={
                resolvedTheme === 'dark'
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
            >
              {resolvedTheme === 'dark' ? (
                <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
