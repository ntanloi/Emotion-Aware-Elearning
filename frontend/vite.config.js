import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/drive-proxy': {
        target: 'https://drive.usercontent.google.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/drive-proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            delete proxyRes.headers['cross-origin-resource-policy']
            delete proxyRes.headers['cross-origin-embedder-policy']
            proxyRes.headers['access-control-allow-origin'] = '*'
          })
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/features/shared'),
      '@student': path.resolve(__dirname, './src/features/student'),
      '@teacher': path.resolve(__dirname, './src/features/teacher'),
      '@admin': path.resolve(__dirname, './src/features/admin'),
      '@auth': path.resolve(__dirname, './src/features/auth'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@config': path.resolve(__dirname, './src/config')
    }
  }
})
