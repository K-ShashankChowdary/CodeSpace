// frontend/src/utils/socket.js
import { io } from "socket.io-client";

const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "https://codespace-api.duckdns.org/api/v1";
  try {
    const url = new URL(apiUrl);
    return `${url.protocol}//${url.host}`;
  } catch (e) {
    return "https://codespace-api.duckdns.org";
  }
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