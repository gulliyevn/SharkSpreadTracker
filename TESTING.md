# 🧪 Testing Guide

## Структура тестов

Проект использует **Vitest** для unit и integration тестов, и **Maestro** для E2E тестов.

### Типы тестов

#### 1. **Unit Tests** (Модульные тесты)
- Расположение: `src/**/__tests__/*.test.{ts,tsx}`
- Проверяют отдельные функции, компоненты, хуки
- Быстрые, изолированные тесты
- Примеры:
  - `src/utils/__tests__/validation.test.ts`
  - `src/hooks/__tests__/useDebounce.test.ts`
  - `src/components/ui/__tests__/Button.test.tsx`

#### 2. **Smoke Tests** (Дымовые тесты)
- Расположение: `src/test/smoke.test.tsx`
- Проверяют критически важные пути приложения
- Быстрые тесты для проверки базовой работоспособности
- Запуск: `npm run test:smoke`

**Что проверяют:**
- ✅ Приложение рендерится без ошибок
- ✅ Header и Footer отображаются
- ✅ Контексты (Theme, Language, View) работают
- ✅ Страницы загружаются
- ✅ API ошибки обрабатываются gracefully

#### 3. **Integration Tests** (Интеграционные тесты)
- Расположение: `src/test/integration.test.tsx`
- Проверяют взаимодействие компонентов
- Тестируют пользовательские сценарии
- Запуск: `npm run test:integration`

**Что проверяют:**
- ✅ Навигация между страницами
- ✅ Переключение темы и языка
- ✅ Фильтрация и поиск токенов
- ✅ Взаимодействие с формами

#### 4. **E2E Tests** (End-to-End тесты)
- Расположение: `.maestro/`
- Используют Maestro для тестирования реального браузера
- Запуск: `npm run test:e2e`

## Запуск тестов

### Все тесты
```bash
npm test              # Watch mode
npm run test:run      # Run once
```

### По категориям
```bash
npm run test:smoke        # Только smoke тесты
npm run test:integration  # Только integration тесты
npm run test:unit         # Только unit тесты (исключая smoke/integration)
```

### С покрытием
```bash
npm run test:coverage
```

### UI режим
```bash
npm run test:ui
```

## Test Suites

Тесты организованы в suites через `describe` блоки:

```typescript
describe('Component Name', () => {
  describe('Feature 1', () => {
    it('should do something', () => {});
  });
  
  describe('Feature 2', () => {
    it('should do something else', () => {});
  });
});
```

### Организация по категориям:

1. **Utils** - утилиты (validation, format, calculations)
2. **Hooks** - кастомные хуки (useDebounce, useLocalStorage, etc.)
3. **UI Components** - базовые компоненты (Button, Card, Input, etc.)
4. **API** - API endpoints и клиенты
5. **Smoke** - критически важные пути
6. **Integration** - взаимодействие компонентов

## Best Practices

### 1. Тестируйте поведение, а не реализацию
```typescript
// ❌ Плохо
expect(component.state.count).toBe(1);

// ✅ Хорошо
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

### 2. Используйте правильные queries
```typescript
// ✅ Приоритет
getByRole()      // Доступность
getByLabelText() // Формы
getByText()      // Текст
getByTestId()    // Последний вариант
```

### 3. Изолируйте тесты
```typescript
beforeEach(() => {
  // Очистка перед каждым тестом
});
```

### 4. Используйте моки для внешних зависимостей
```typescript
vi.mock('@/api/clients', () => ({
  jupiterClient: { get: vi.fn() }
}));
```

### 5. Тестируйте edge cases
```typescript
it('should handle null values', () => {});
it('should handle empty arrays', () => {});
it('should handle network errors', () => {});
```

## Coverage Goals

- **Unit Tests**: > 80% покрытие
- **Critical Paths**: 100% покрытие (smoke tests)
- **Integration**: Основные пользовательские сценарии

## CI/CD Integration

Тесты автоматически запускаются в CI/CD pipeline:

```yaml
# .github/workflows/ci.yml
- name: Run tests
  run: npm run test:run

- name: Run smoke tests
  run: npm run test:smoke
```

## Troubleshooting

### Тесты падают из-за таймаутов
Увеличьте `testTimeout` в `vitest.config.ts`:
```typescript
test: {
  testTimeout: 10000, // 10 секунд
}
```

### Проблемы с i18n
Убедитесь, что импортирован `@/lib/i18n` в setup файле.

### Проблемы с моками
Проверьте, что моки правильно настроены в `beforeEach`:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

