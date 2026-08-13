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
    // Transpile for Android Chrome 80+ and iOS Safari 13+
    // This converts ?. ?? etc to compatible syntax for older devices
    target: ['chrome80', 'safari13', 'firefox78', 'edge88'],
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        }
      }
    }
  }
})
