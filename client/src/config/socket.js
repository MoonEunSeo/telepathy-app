import { io } from 'socket.io-client';

const socketURL =
  import.meta.env.MODE === 'development'
    ? `http://localhost:${import.meta.env.VITE_SERV_DEV}`
    : import.meta.env.VITE_REALSITE;

console.log("🌐 socketURL =", socketURL);

export const socket = io(socketURL, {
  withCredentials: true,
  transports: ['websocket'],
});