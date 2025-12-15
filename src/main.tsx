import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import './lib/i18n'; // Инициализация i18n
import { checkUrlForLeaks } from './utils/data-leak-prevention';
import App from './App';
import './styles/tailwind.css';

// Проверка на утечки данных при загрузке
checkUrlForLeaks();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
