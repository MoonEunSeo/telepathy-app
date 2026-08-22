import { runtimeConfig } from '../config/runtime';

const ABSOLUTE_HTTP_URL = /^https?:\/\//i;

function normalizeApiPath(input: string): string {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    throw new Error('API 요청 경로는 비어 있을 수 없습니다.');
  }

  if (ABSOLUTE_HTTP_URL.test(trimmedInput)) {
    return trimmedInput;
  }

  if (trimmedInput.startsWith('//')) {
    throw new Error('프로토콜 상대 URL은 API 요청에 사용할 수 없습니다.');
  }

  const path = trimmedInput.startsWith('/api/')
    ? trimmedInput.slice('/api'.length)
    : trimmedInput === '/api'
      ? ''
      : trimmedInput;

  return path ? `/${path.replace(/^\/+/, '')}` : '';
}

export function resolveApiUrl(input: string): string {
  const normalizedInput = normalizeApiPath(input);

  if (ABSOLUTE_HTTP_URL.test(normalizedInput)) {
    return normalizedInput;
  }

  return `${runtimeConfig.apiBaseUrl.replace(/\/$/, '')}${normalizedInput}`;
}

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(resolveApiUrl(input), {
    ...init,
    credentials: init?.credentials ?? 'include',
  });
}
