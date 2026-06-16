import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000', 
        changeOrigin: true,
      },
      // Proxy for WebSockets
      '/socket.io': {
        target: 'http://127.0.0.1:5000', 
        ws: true,
        changeOrigin: true,
      },
      '/yjs': {
        target: 'http://127.0.0.1:5000',
        ws: true,
        changeOrigin: true,
      }
    }
  }
})