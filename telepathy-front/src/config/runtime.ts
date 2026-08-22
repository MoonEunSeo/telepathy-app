import { runtimeTarget, type RuntimeTarget } from './target';

export type RuntimeConfig = Readonly<{
  apiBaseUrl: string;
  socketUrl: string;
  target: RuntimeTarget;
}>;

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

function normalizeAbsoluteHttpUrl(value: string, variableName: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName}은(는) 유효한 HTTP(S) URL이어야 합니다.`);
  }

  if (!HTTP_PROTOCOLS.has(url.protocol)) {
    throw new Error(`${variableName}은(는) HTTP(S) 프로토콜만 사용할 수 있습니다.`);
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error(`${variableName}에는 인증 정보, 쿼리 또는 해시를 포함할 수 없습니다.`);
  }

  return url.toString().replace(/\/$/, '');
}

function normalizeApiBaseUrl(value: string, target: RuntimeTarget): string {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return normalizeAbsoluteHttpUrl(value, 'VITE_API_BASE_URL');
  }

  if (target === 'native') {
    throw new Error('네이티브 앱의 VITE_API_BASE_URL은 절대 HTTP(S) URL이어야 합니다.');
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    throw new Error('VITE_API_BASE_URL은 절대 HTTP(S) URL 또는 /로 시작하는 경로여야 합니다.');
  }

  return value.replace(/\/$/, '') || '/';
}

function resolveRequiredValue(
  value: string | undefined,
  variableName: string,
  developmentDefault: string,
): string {
  const normalizedValue = value?.trim();

  if (normalizedValue) {
    return normalizedValue;
  }

  if (import.meta.env.PROD) {
    throw new Error(`운영 빌드에는 ${variableName} 환경변수가 필요합니다.`);
  }

  return developmentDefault;
}

function createRuntimeConfig(): RuntimeConfig {
  const developmentSocketUrl = `http://localhost:${import.meta.env.VITE_SERV_DEV?.trim() || '5000'}`;
  const apiBaseUrl = resolveRequiredValue(
    import.meta.env.VITE_API_BASE_URL,
    'VITE_API_BASE_URL',
    '/api',
  );
  const socketUrl = resolveRequiredValue(
    import.meta.env.VITE_SOCKET_URL,
    'VITE_SOCKET_URL',
    developmentSocketUrl,
  );

  return Object.freeze({
    apiBaseUrl: normalizeApiBaseUrl(apiBaseUrl, runtimeTarget),
    socketUrl: normalizeAbsoluteHttpUrl(socketUrl, 'VITE_SOCKET_URL'),
    target: runtimeTarget,
  });
}

export const runtimeConfig = createRuntimeConfig();
