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
  autoConnect: false, // 🚨 Prevent connecting before login
  transports: ["websocket", "polling"] // Good fallback to have
});

socket.on("connect", () => {
  console.log(`[Socket] Connected to ${SOCKET_URL} with ID: ${socket.id}`);
});

socket.on("connect_error", (err) => {
  console.error(`[Socket] Connection Error:`, err.message);
});