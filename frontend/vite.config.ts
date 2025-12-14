import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT || '3032', 10),
      host: true, // 모든 네트워크 인터페이스에서 접근 허용
      allowedHosts: [
        '.ngrok-free.app',
        '.ngrok.app',
        '.ngrok.io',
        'localhost',
      ],
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3033',
          changeOrigin: true,
        },
      },
    },
  }
})




