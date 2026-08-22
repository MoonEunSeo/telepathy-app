import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/http/createApp';

const allowedOrigin = 'https://telepathy.my';

describe('서버 HTTP 경계', () => {
  const app = createApp({
    allowedOrigins: [allowedOrigin],
    serveWebStatic: false,
  });

  it('생존 및 준비 상태를 구분해 제공한다', async () => {
    const healthResponse = await request(app).get('/healthz');
    const readyResponse = await request(app).get('/readyz');

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.text).toBe('OK');
    expect(readyResponse.status).toBe(200);
    expect(readyResponse.body).toEqual({ status: 'ready' });
  });

  it('허용된 웹 출처에만 credential CORS 헤더를 제공한다', async () => {
    const allowedResponse = await request(app).get('/api/missing').set('Origin', allowedOrigin);
    const blockedResponse = await request(app)
      .get('/api/missing')
      .set('Origin', 'https://malicious.example');

    expect(allowedResponse.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(allowedResponse.headers['access-control-allow-credentials']).toBe('true');
    expect(blockedResponse.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('정적 제공이 꺼지면 API와 웹 미등록 경로를 JSON 404로 종료한다', async () => {
    const apiResponse = await request(app).get('/api');
    const webResponse = await request(app).get('/');

    expect(apiResponse.status).toBe(404);
    expect(apiResponse.type).toMatch(/json/);
    expect(webResponse.status).toBe(404);
    expect(webResponse.type).toMatch(/json/);
  });
});
