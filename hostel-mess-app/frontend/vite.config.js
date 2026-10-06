import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During development the React app runs on :5173 and forwards /api calls
// to the Flask backend on :5000, so both work as one website.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: { '/api': 'http://localhost:5000' },
  },
})
