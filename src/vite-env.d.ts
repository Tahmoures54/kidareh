/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_DESCRIPTION: string;
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_GA_ID: string;
  readonly VITE_ENABLE_MAPS: string;
  readonly VITE_ENABLE_PWA: string;
  // Add more env variables here...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global constants defined in vite.config.ts
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
declare const __DEV__: boolean;
declare const __PROD__: boolean;