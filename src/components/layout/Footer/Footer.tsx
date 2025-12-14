import { useLanguage } from '@/contexts/LanguageContext';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer
      role="contentinfo"
      className="border-t bg-white dark:bg-dark-900 border-light-200 dark:border-dark-800"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="text-xs sm:text-sm text-light-600 dark:text-dark-400 text-center sm:text-left">
            © {new Date().getFullYear()} {t('app.title')}. All rights reserved.
          </div>
          <div className="text-xs sm:text-sm text-light-500 dark:text-dark-500 text-center sm:text-right">
            {t('app.description')}
          </div>
        </div>
      </div>
    </footer>
  );
}

