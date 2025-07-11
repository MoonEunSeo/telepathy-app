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