# 🎨 Руководство по состояниям UI

## Обзор

Этот документ описывает стандарты для состояний UI в Shark Spread Tracker: загрузка, ошибки, пустые состояния и успешные действия.

---

## 📋 Стандартные состояния

### 1. Loading State (Состояние загрузки)

**Когда использовать:**
- При загрузке данных из API
- При выполнении асинхронных операций
- При навигации между страницами

**Компоненты:**
- `LoadingSpinner` - для индикации загрузки
- `Skeleton` - для placeholder контента
- `TokenCardSkeleton` - для списка токенов

**Примеры:**

```tsx
// Простая загрузка
{isLoading && (
  <div className="flex items-center justify-center py-12">
    <LoadingSpinner size="md" />
    <span className="ml-3 text-light-600 dark:text-dark-400">
      {t('common.loading') || 'Loading...'}
    </span>
  </div>
)}

// Skeleton для списка
{isLoading && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(6)].map((_, i) => (
      <TokenCardSkeleton key={i} />
    ))}
  </div>
)}
```

**Стандарты:**
- ✅ Всегда показывать loading state при загрузке данных
- ✅ Использовать Skeleton для списков и карточек
- ✅ Показывать текст "Loading..." рядом со спиннером
- ✅ Использовать правильный размер спиннера (sm, md, lg)

---

### 2. Error State (Состояние ошибки)

**Когда использовать:**
- При ошибках API запросов
- При ошибках валидации
- При критических ошибках приложения

**Компоненты:**
- `ErrorDisplay` - для критических ошибок
- `EmptyState` с иконкой `alert-circle` - для ошибок загрузки данных
- `Toast` с типом `error` - для некритических ошибок

**Примеры:**

```tsx
// Критическая ошибка
{error && (
  <ErrorDisplay
    error={error}
    onReset={() => window.location.reload()}
    onGoHome={() => navigate('/')}
  />
)}

// Ошибка загрузки данных
{error && (
  <EmptyState
    icon="alert-circle"
    title={t('api.errors.unknown') || 'Error loading data'}
    description={error instanceof Error ? error.message : 'Please try again'}
    action={
      <Button onClick={handleRetry}>
        {t('common.retry') || 'Try Again'}
      </Button>
    }
  />
)}

// Toast для некритических ошибок
const { error: showError } = useToast();
showError('Failed to update token');
```

**Стандарты:**
- ✅ Всегда показывать понятное сообщение об ошибке
- ✅ Предлагать действие (retry, go home)
- ✅ Логировать ошибки в консоль для отладки
- ✅ Использовать Toast для некритических ошибок

---

### 3. Empty State (Пустое состояние)

**Когда использовать:**
- Когда нет данных для отображения
- Когда фильтры не дали результатов
- Когда список пуст

**Компоненты:**
- `EmptyState` - универсальный компонент для пустых состояний

**Примеры:**

```tsx
// Нет токенов
{!isLoading && !error && tokens.length === 0 && (
  <EmptyState
    icon="search"
    title={t('tokens.noTokens') || 'No tokens found'}
    description={t('tokens.noTokensDescription') || 'Try selecting a different chain'}
  />
)}

// Нет результатов поиска
{filteredTokens.length === 0 && searchTerm && (
  <EmptyState
    icon="search"
    title="No results found"
    description={`No tokens match "${searchTerm}"`}
  />
)}
```

**Стандарты:**
- ✅ Всегда показывать понятное сообщение
- ✅ Использовать подходящую иконку (search, inbox, etc.)
- ✅ Предлагать действия для исправления (изменить фильтры, etc.)

---

### 4. Success State (Состояние успеха)

**Когда использовать:**
- После успешного выполнения действия
- После сохранения данных
- После копирования в буфер обмена

**Компоненты:**
- `Toast` с типом `success` - для уведомлений об успехе

**Примеры:**

```tsx
import { useToast } from '@/contexts/ToastContext';

function MyComponent() {
  const { success } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    success('Copied to clipboard!');
  };

  const handleSave = async () => {
    await saveData();
    success('Data saved successfully!');
  };

  return (
    <Button onClick={handleCopy}>Copy</Button>
  );
}
```

**Стандарты:**
- ✅ Всегда показывать Toast для успешных действий
- ✅ Использовать понятные сообщения
- ✅ Toast автоматически исчезает через 5 секунд
- ✅ Не показывать Toast для автоматических действий (автосохранение)

---

## 🔄 Паттерны для состояний

### Паттерн 1: Загрузка → Данные → Ошибка

```tsx
{isLoading ? (
  <LoadingSpinner />
) : error ? (
  <ErrorDisplay error={error} />
) : data.length === 0 ? (
  <EmptyState icon="inbox" title="No data" />
) : (
  <DataList data={data} />
)}
```

### Паттерн 2: Skeleton → Данные

```tsx
{isLoading ? (
  <div className="grid gap-4">
    {[...Array(6)].map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
) : (
  <DataList data={data} />
)}
```

### Паттерн 3: Оптимистичное обновление

```tsx
const { success, error: showError } = useToast();

const handleUpdate = async () => {
  // Оптимистичное обновление UI
  setData(optimisticData);
  
  try {
    await updateData();
    success('Updated successfully!');
  } catch (err) {
    // Откат изменений
    setData(previousData);
    showError('Failed to update');
  }
};
```

---

## ✅ Чеклист для разработчиков

### При добавлении нового компонента:

- [ ] Добавлен loading state для асинхронных операций
- [ ] Добавлен error state с понятным сообщением
- [ ] Добавлен empty state для пустых данных
- [ ] Добавлены Toast notifications для успешных действий
- [ ] Использованы правильные компоненты (LoadingSpinner, Skeleton, EmptyState, Toast)
- [ ] Сообщения переведены (используется `useLanguage`)
- [ ] Ошибки логируются в консоль

### При работе с API:

- [ ] Все API вызовы обрабатывают ошибки
- [ ] Показывается loading state во время запроса
- [ ] Показывается error state при ошибке
- [ ] Показывается success Toast при успехе (если применимо)
- [ ] Используется React Query для кэширования и retry

---

## 📊 Progress Indicators (Индикаторы прогресса)

**Когда использовать:**
- При долгих операциях (загрузка большого количества данных)
- При постепенной загрузке данных (батчами)
- При обработке файлов
- При синхронизации данных

**Компоненты:**
- `Progress` - прогресс-бар с процентами

**Примеры:**

```tsx
import { Progress } from '@/components/ui/Progress';

// Простой прогресс-бар
<Progress value={75} max={100} />

// С процентами
<Progress value={50} max={100} showLabel />

// С кастомным текстом
<Progress 
  value={loadedCount} 
  max={totalCount} 
  label={`${loadedCount}/${totalCount} loaded`}
  variant="primary"
/>

// Разные размеры
<Progress value={60} size="sm" />
<Progress value={60} size="md" />
<Progress value={60} size="lg" />

// Разные варианты
<Progress value={80} variant="success" />
<Progress value={50} variant="warning" />
<Progress value={30} variant="error" />
```

**Пример использования в TokensPage:**

```tsx
{loadedCount > 0 && loadedCount < totalCount ? (
  <Progress
    value={loadedCount}
    max={totalCount}
    size="sm"
    showLabel
    label={`${loadedCount}/${totalCount} ${t('common.loaded')}`}
    variant="primary"
  />
) : (
  <div>{filteredTokens.length} {t('common.total')}</div>
)}
```

**Стандарты:**
- ✅ Использовать для операций > 2 секунд
- ✅ Показывать точный прогресс (X/Y или процент)
- ✅ Использовать подходящий размер (sm для компактных мест)
- ✅ Использовать подходящий вариант цвета

---

## 🚀 Оптимистичные обновления

**Когда использовать:**
- При быстрых действиях (клики, переключения)
- При сохранении настроек
- При обновлении данных

**Паттерн:**
1. Сразу обновить UI (оптимистично)
2. Выполнить запрос в фоне
3. При успехе - подтвердить изменения
4. При ошибке - откатить изменения и показать ошибку

**Примеры:**

```tsx
import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';

function ToggleComponent() {
  const [isEnabled, setIsEnabled] = useState(false);
  const { success, error: showError } = useToast();

  const handleToggle = async () => {
    // 1. Оптимистичное обновление
    const previousValue = isEnabled;
    setIsEnabled(!isEnabled);

    try {
      // 2. Выполнить запрос
      await updateSetting(!isEnabled);
      
      // 3. Подтвердить (уже обновлено)
      success('Setting updated');
    } catch (err) {
      // 4. Откатить при ошибке
      setIsEnabled(previousValue);
      showError('Failed to update setting');
    }
  };

  return <Toggle checked={isEnabled} onChange={handleToggle} />;
}
```

**Пример с формой:**

```tsx
function FormComponent() {
  const [data, setData] = useState(initialData);
  const { success, error: showError } = useToast();

  const handleSave = async () => {
    // Оптимистичное обновление
    const previousData = data;
    setData(optimisticData);

    try {
      await saveData(data);
      success('Saved successfully');
    } catch (err) {
      setData(previousData);
      showError('Failed to save');
    }
  };

  return <Form data={data} onSave={handleSave} />;
}
```

**Стандарты:**
- ✅ Использовать для быстрых действий (< 1 секунды)
- ✅ Всегда откатывать при ошибке
- ✅ Показывать Toast при успехе/ошибке
- ✅ Не использовать для критических операций

---

## 📚 Примеры использования

### Полный пример компонента с состояниями

```tsx
import { useTokens } from '@/api/hooks/useTokens';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { TokenCardSkeleton } from '@/components/features/tokens/TokenCardSkeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';

export function TokensList() {
  const { t } = useLanguage();
  const { success } = useToast();
  const { data: tokens = [], isLoading, error } = useTokens();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner size="md" />
          <span className="ml-3">{t('common.loading')}</span>
        </div>
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <TokenCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onReset={() => window.location.reload()}
      />
    );
  }

  // Empty state
  if (tokens.length === 0) {
    return (
      <EmptyState
        icon="inbox"
        title={t('tokens.noTokens')}
        description={t('tokens.noTokensDescription')}
      />
    );
  }

  // Success state (Toast при загрузке)
  useEffect(() => {
    if (tokens.length > 0) {
      success(`${tokens.length} tokens loaded`);
    }
  }, [tokens.length, success]);

  // Data state
  return (
    <div className="grid gap-4">
      {tokens.map(token => (
        <TokenCard key={`${token.symbol}-${token.chain}`} token={token} />
      ))}
    </div>
  );
}
```

---

## 🎯 Рекомендации

### Производительность

- Используйте Skeleton вместо LoadingSpinner для списков
- Используйте lazy loading для больших списков
- Оптимистичные обновления для лучшего UX

### Доступность

- Все состояния должны быть доступны для screen readers
- Используйте ARIA атрибуты для loading states
- Показывайте прогресс для долгих операций

### Локализация

- Все сообщения должны быть переведены
- Используйте `useLanguage` hook для переводов
- Проверяйте все языки (en, ru, tr)

---

**Последнее обновление:** 2024-12-20

