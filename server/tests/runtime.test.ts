import { describe, expect, it } from 'vitest';
import { parseServerRuntimeConfig } from '../src/config/runtime';

describe('서버 런타임 설정', () => {
  it('웹 출처의 공백과 중복을 정규화한다', () => {
    const config = parseServerRuntimeConfig({
      PORT: '5001',
      SERVE_WEB_STATIC: 'false',
      TRUST_PROXY_HOPS: '1',
      WEB_ORIGINS: ' https://telepathy.my/, http://localhost:5179,https://telepathy.my ',
    });

    expect(config).toEqual({
      port: 5001,
      serveWebStatic: false,
      trustProxyHops: 1,
      webOrigins: ['https://telepathy.my', 'http://localhost:5179'],
    });
  });

  it('잘못된 포트와 경로가 포함된 출처를 거부한다', () => {
    expect(() => parseServerRuntimeConfig({ PORT: '0' })).toThrow('PORT');
    expect(() => parseServerRuntimeConfig({ TRUST_PROXY_HOPS: '-1' })).toThrow();
    expect(() => parseServerRuntimeConfig({ WEB_ORIGINS: 'https://telepathy.my/path' })).toThrow(
      '경로',
    );
  });
});
