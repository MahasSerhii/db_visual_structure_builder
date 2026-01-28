import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          viz: ['d3'],
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'], 
          office: ['xlsx']
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Increase limit to 1000kb to suppress warnings if they are close
  }
})
