import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/features/shared'),
      '@student': path.resolve(__dirname, './src/features/student'),
      '@teacher': path.resolve(__dirname, './src/features/teacher'),
      '@auth': path.resolve(__dirname, './src/features/auth'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@config': path.resolve(__dirname, './src/config')
    }
  }
})
