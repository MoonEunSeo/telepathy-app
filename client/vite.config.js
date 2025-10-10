import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5179,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Express 서버 주소
        changeOrigin: true,
        secure: false,
      },
    },
    configure: (proxy, options) => {
      proxy.on('error', (err, req, res) => {
        console.error('프록시 에러:', err);
      });
      proxy.on('proxyReq', (proxyReq, req, res) => {
        console.log('🔁 Proxy 요청 중:', req.url);
      });
      proxy.on('proxyRes', (proxyRes, req, res) => {
        console.log('✅ Proxy 응답 완료:', req.url);
      });
    }
  },
});

/*
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

dotenv.config(); // 환경변수 불러오기

const API_URL = process.env.VITE_API_BASE_URL;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5179,
    strictPort: true,
    proxy: {
      '/api': {
        target: API_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});*/