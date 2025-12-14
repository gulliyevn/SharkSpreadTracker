import { Moon, Sun, BarChart3, Coins } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useView } from '@/contexts/ViewContext';
import { cn } from '@/utils/cn';

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t, currentLanguage, changeLanguage } = useLanguage();
  const { currentView, setView } = useView();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-dark-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-dark-900/80 border-light-200 dark:border-dark-800">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <img
              src="/assets/SharkLogo.png"
              alt="Shark Spread Tracker Logo"
              className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 object-contain flex-shrink-0"
              loading="eager"
            />
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-dark-950 dark:text-dark-50 hidden sm:block">
              {t('app.title')}
            </h1>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* View Switcher - кнопка для графиков */}
            <button
              onClick={() => setView(currentView === 'charts' ? 'tokens' : 'charts')}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border transition-colors',
                'bg-light-200 dark:bg-dark-800 border-light-300 dark:border-dark-800',
                'hover:bg-light-300 dark:hover:bg-dark-700 active:scale-95',
                currentView === 'charts'
                  ? 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700'
                  : 'text-light-700 dark:text-dark-300 hover:text-light-900 dark:hover:text-dark-100',
                'touch-manipulation'
              )}
              title={currentView === 'charts' ? 'Switch to tokens' : 'Open charts'}
              aria-label={currentView === 'charts' ? 'Switch to tokens' : 'Open charts'}
            >
              {currentView === 'charts' ? (
                <>
                  <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                    {t('header.tokens') || 'Tokens'}
                  </span>
                </>
              ) : (
                <>
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                    {t('header.charts') || 'Charts'}
                  </span>
                </>
              )}
            </button>

            {/* Language Switcher - адаптивный */}
            <div className="flex items-center gap-0.5 sm:gap-1 rounded-lg border bg-light-200 dark:bg-dark-800 border-light-300 dark:border-dark-800 p-0.5 sm:p-1">
              <button
                onClick={() => changeLanguage('en')}
                className={cn(
                  'px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded transition-colors min-w-[28px] sm:min-w-[32px]',
                  currentLanguage === 'en'
                    ? 'bg-primary-600 text-white'
                    : 'text-light-600 dark:text-dark-400 hover:text-light-800 dark:hover:text-dark-200 hover:bg-light-300 dark:hover:bg-dark-700'
                )}
                title="English"
                aria-label="Switch to English"
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage('ru')}
                className={cn(
                  'px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded transition-colors min-w-[28px] sm:min-w-[32px]',
                  currentLanguage === 'ru'
                    ? 'bg-primary-600 text-white'
                    : 'text-light-600 dark:text-dark-400 hover:text-light-800 dark:hover:text-dark-200 hover:bg-light-300 dark:hover:bg-dark-700'
                )}
                title="Русский"
                aria-label="Переключить на русский"
              >
                RU
              </button>
              <button
                onClick={() => changeLanguage('tr')}
                className={cn(
                  'px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded transition-colors min-w-[28px] sm:min-w-[32px]',
                  currentLanguage === 'tr'
                    ? 'bg-primary-600 text-white'
                    : 'text-light-600 dark:text-dark-400 hover:text-light-800 dark:hover:text-dark-200 hover:bg-light-300 dark:hover:bg-dark-700'
                )}
                title="Türkçe"
                aria-label="Türkçe'ye geç"
              >
                TR
              </button>
            </div>

            {/* Theme Switcher - адаптивный */}
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className={cn(
                'p-1 sm:p-1.5 md:p-2 rounded-lg border bg-light-200 dark:bg-dark-800 border-light-300 dark:border-dark-800 transition-colors',
                'hover:bg-light-300 dark:hover:bg-dark-700 active:scale-95',
                'touch-manipulation' // Оптимизация для touch-устройств
              )}
              title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-light-800 dark:text-dark-200" />
              ) : (
                <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-light-800 dark:text-dark-200" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

