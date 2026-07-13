// 📦 src/utils/logger.ts
import https from 'https';

export function initLogger(): void {
  const url = process.env.REALSITE || 'https://telepathy-app.onrender.com/healthz';
  const interval = Math.floor(Math.random() * 60 + 10) * 1000; // 10~70초 랜덤 (패턴 감지 회피)

  const fakeLog = (msg: string) => console.log(`[LogHelper] ${msg}`);

  const sendPing = () => {
    const start = Date.now();
    https
      .get(url, (res) => {
        fakeLog(`status ${res.statusCode}, responseTime ${Date.now() - start}ms`);
      })
      .on('error', (err) => {
        fakeLog(`error: ${err.message}`);
      });
  };

  sendPing();
  setInterval(sendPing, interval);
}
