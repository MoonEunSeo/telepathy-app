import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // woff2는 절대 인라인하지 않는다. 4 kb 미만 서브셋이 3개 있는데,
    // base64로 박히면 33% 부풀고 렌더 차단 CSS 안으로 들어간다.
    // 별도 파일이어야 브라우저가 필요한 조각만 받는 unicode-range 분할이 의미를 갖는다.
    assetsInlineLimit: (filePath) => (filePath.endsWith('.woff2') ? false : undefined),
  },
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  server: {
    port: 5179,
    fs: {
      allow: ['..'], // repo 루트 shared/ 접근 허용
    },
    proxy: {
      // 원본 client의 프록시 이관: /api 요청을 Express 백엔드로 전달
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
