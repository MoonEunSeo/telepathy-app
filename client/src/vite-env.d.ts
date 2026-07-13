/// <reference types="vite/client" />

// Vite 커스텀 환경변수(VITE_*) 타입 선언 — import.meta.env.* 자동완성 & 타입체크
interface ImportMetaEnv {
  readonly VITE_SERV_DEV: string;
  readonly VITE_REALSITE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
