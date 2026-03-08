import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://3.27.117.157:5000',
        changeOrigin: true,
      },
      // 🚨 ADD THIS: Proxy for WebSockets
      '/socket.io': {
        target: 'http://3.27.117.157:5000',
        ws: true, // Enables WebSocket proxying
        changeOrigin: true,
      }
    }
  }
})