import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://codespace-api.duckdns.org', 
        changeOrigin: true,
      },
      // Proxy for WebSockets
      '/socket.io': {
        target: 'https://codespace-api.duckdns.org', 
        ws: true,
        changeOrigin: true,
      }
    }
  }
})