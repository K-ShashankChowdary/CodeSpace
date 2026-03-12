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
  transports: ["polling", "websocket"],
});
