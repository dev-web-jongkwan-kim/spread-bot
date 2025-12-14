import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'
  
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
    build: {
      target: 'esnext',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction, // Remove console.log in production
          drop_debugger: isProduction,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'chart-vendor': ['recharts'],
            'ui-vendor': ['lucide-react'],
            'utils-vendor': ['axios', 'date-fns'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      sourcemap: !isProduction, // Only generate sourcemaps in development
      cssCodeSplit: true,
      assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'axios', 'recharts'],
    },
  }
})




