/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JUPITER_URL?: string;
  readonly VITE_JUPITER_API_KEY?: string;
  readonly VITE_PANCAKE_URL?: string;
  readonly VITE_MEXC_REST_URL?: string;
  readonly VITE_MEXC_API_KEY?: string;
  readonly VITE_USE_MOCK_DATA?: string; // 'true' для использования mock-данных
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
