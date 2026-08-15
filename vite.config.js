import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  build: {
    sourcemap: false,
    target: ['chrome80', 'safari13', 'firefox78', 'edge88'],
    rollupOptions: {
      output: { manualChunks: { react: ['react', 'react-dom'] } }
    }
  }
})
