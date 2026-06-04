import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    // Target modern browsers — smaller output
    target: 'es2020',
    // Compress output
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Better code splitting
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        }
      }
    },
    // Increase chunk size warning threshold
    chunkSizeWarningLimit: 800,
  }
})
