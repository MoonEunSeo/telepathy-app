import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiFetch, resolveApiUrl } from './apiClient';

describe('resolveApiUrl', () => {
  it('기존 /api 경로를 기본 API 주소와 중복 없이 결합한다', () => {
    expect(resolveApiUrl('/api/auth/check')).toBe('/api/auth/check');
    expect(resolveApiUrl('/comments')).toBe('/api/comments');
  });

  it('절대 HTTP(S) URL은 그대로 유지하고 프로토콜 상대 URL은 거부한다', () => {
    expect(resolveApiUrl('https://example.com/api/health')).toBe('https://example.com/api/health');
    expect(() => resolveApiUrl('//example.com/api/health')).toThrow(
      '프로토콜 상대 URL은 API 요청에 사용할 수 없습니다.',
    );
  });
});

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('별도 지정이 없으면 쿠키 인증을 포함한다', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/auth/check');

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/check', { credentials: 'include' });
  });

  it('호출자가 지정한 credentials 정책을 보존한다', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/server-time', { credentials: 'omit' });

    expect(fetchMock).toHaveBeenCalledWith('/api/server-time', { credentials: 'omit' });
  });
});
