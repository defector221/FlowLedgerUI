import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const allowedHosts = ['localhost', '127.0.0.1', 'flowledger.valiantxgroup.com', '.valiantxgroup.com']

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: '0.0.0.0',
    allowedHosts,
  },

  preview: {
    host: '0.0.0.0',
    allowedHosts,
  },
})
