import { io } from "socket.io-client";

// Centralized socket connection utility to ensure consistent configuration across the app.
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
  // Force WebSocket first, fallback to polling only if necessary
  transports: ["websocket", "polling"],
});

// Diagnostic connection logging for Vercel/Render
socket.on("connect", () => {
  console.log(`[Socket] Connected to ${SOCKET_URL} with ID: ${socket.id} via ${socket.io.engine.transport.name}`);
  
  socket.io.engine.on("upgrade", () => {
    console.log(`[Socket] Transport upgraded to: ${socket.io.engine.transport.name}`);
  });
});

socket.on("connect_error", (err) => {
  console.error(`[Socket] Connection Error:`, err.message);
});
