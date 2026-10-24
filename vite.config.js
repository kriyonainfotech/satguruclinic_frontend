import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// `npm run dev:mobile` = https wala server (port 5174). Mobile browser camera sirf https pe chalne deta hai.
export default defineConfig(({ mode }) => {
  const isMobile = mode === 'mobile'
  return {
    plugins: isMobile ? [react(), basicSsl()] : [react()],
    server: {
      host: '0.0.0.0',
      port: isMobile ? 5174 : 5173,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5001',
          changeOrigin: true
        }
      }
    }
  }
})
