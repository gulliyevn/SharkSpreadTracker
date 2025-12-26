/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Backend configuration (required for production)
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_WEBSOCKET_URL?: string;

  // Optional: Mock data mode
  readonly VITE_USE_MOCK_DATA?: string; // 'true' для использования mock-данных

  // Optional: Sentry error tracking
  readonly VITE_SENTRY_DSN?: string;

  // Optional: Logging
  readonly VITE_ENABLE_LOGGING?: string;

  // Legacy (deprecated, not used)
  // readonly VITE_JUPITER_API_KEY?: string;
  // readonly VITE_API_MODE?: string;
  // readonly VITE_HEALTH_CHECK_INTERVAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
