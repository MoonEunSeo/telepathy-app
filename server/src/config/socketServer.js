/*// 📦 backend/socketServer.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const registerChatHandlers = require('./chat.socket'); // 2단계에서 만들 예정

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS 설정 (프론트 주소에 맞게 수정)
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5179',
    credentials: true,
  },
});

// 기본 미들웨어
app.use(cors({ origin: 'http://localhost:5179', credentials: true }));
app.use(express.json());

// 소켓 연결
io.on('connection', (socket) => {
  console.log(`✅ 사용자 연결됨 [socket.id: ${socket.id}]`);

  // 👉 실제 채팅 로직은 이 함수에서 위임 처리
  registerChatHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log(`❌ 연결 종료 [socket.id: ${socket.id}]`);
  });
});

// 서버 시작
const PORT = process.env.SOCKET_PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO 서버 실행 중: http://localhost:${PORT}`);
});
*/

// 📦 backend/socketServer.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import registerChatHandlers from './chat.socket.js'; // 경로는 네 구조에 맞춰 수정

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const path = require('path');

const CLIENT_ORIGIN = process.env.REALSITE;

// CORS 설정
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
});
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

// ✅ Vite 빌드 결과 정적 파일 서빙
app.use(express.static(path.join( __dirname, '../../../client/dist')));

// ✅ SPA 지원을 위해 나머지 경로는 index.html로 리디렉션
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../client/dist/index.html'));
});

// 소켓 연결
io.on('connection', (socket) => {
  console.log(`✅ 사용자 연결됨 [socket.id: ${socket.id}]`);
  registerChatHandlers(io, socket);
  socket.on('disconnect', () => console.log(`❌ 연결 종료 [socket.id: ${socket.id}]`));
});

const PORT = process.env.SERV_DEV || 5000;
server.listen(PORT, () => {
  console.log(`🚀 통합 서버 실행 중: http://localhost:${PORT}`);
});