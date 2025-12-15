import { useLanguage } from '@/contexts/LanguageContext';
import { Container } from '@/components/layout/Container';

/**
 * Страница с графиками спреда
 */
export function ChartsPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900">
      <Container>
        <div className="max-w-7xl mx-auto py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-dark-950 dark:text-dark-50">
              {t('charts.title') || 'Charts'}
            </h1>
            <p className="text-sm sm:text-base text-light-600 dark:text-dark-400">
              {t('charts.description') ||
                'View spread charts and analyze trading opportunities'}
            </p>
          </div>

          {/* Placeholder для графиков */}
          <div className="bg-light-100 dark:bg-dark-800 rounded-xl p-6 sm:p-8 border border-light-200 dark:border-dark-700">
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 sm:w-20 sm:h-20 text-light-400 dark:text-dark-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2 text-dark-900 dark:text-dark-100">
                {t('charts.comingSoon') || 'Charts Coming Soon'}
              </h2>
              <p className="text-sm sm:text-base text-light-600 dark:text-dark-400 max-w-md">
                {t('charts.placeholder') ||
                  'Spread charts will be displayed here. Select tokens and timeframes to analyze trading opportunities.'}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
