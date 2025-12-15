/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JUPITER_URL?: string;
  readonly VITE_PANCAKE_URL?: string;
  readonly VITE_MEXC_REST_URL?: string;
  readonly VITE_MEXC_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
