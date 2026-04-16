// CSS Module type declarations
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.module.css' {
  const content: Record<string, string>;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_PROXY_TARGET?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly DEV?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
