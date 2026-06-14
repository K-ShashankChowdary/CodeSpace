// frontend/src/utils/socket.js
import { io } from "socket.io-client";

const getSocketUrl = () => {
  // If VITE_SOCKET_URL is set, use it. Otherwise use empty string which defaults to window.location
  return import.meta.env.VITE_SOCKET_URL || "";
};

const SOCKET_URL = getSocketUrl();

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
  transports: ["polling", "websocket"],
  // 🚨 THIS IS THE KEY: It sends the token from your screenshot to the backend
  auth: (cb) => {
    cb({ token: localStorage.getItem("accessToken") });
  }
});

socket.on("connect", () => console.log(`[Socket] Connected: ${socket.id}`));
socket.on("connect_error", (err) => console.error(`[Socket] Error:`, err.message));