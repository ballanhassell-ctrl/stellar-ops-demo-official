import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React vendor chunk
          'vendor-react': ['react', 'react-dom'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // Charting library (only used in ARAgingChart)
          'vendor-recharts': ['recharts'],
          // OCR engine (only used in InsuranceCheckStation)
          'vendor-tesseract': ['tesseract.js'],
          // Icons library (used across many components)
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
})
