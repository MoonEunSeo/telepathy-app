// src/hooks/socketInstance.jsx
import { io } from 'socket.io-client';

const SOCKET_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://telepathy-app.onrender.com'
    : 'http://localhost:5000';

const socket = io(SOCKET_URL, { autoConnect: false });

export default socket;