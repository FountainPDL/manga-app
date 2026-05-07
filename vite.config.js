import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@store':      path.resolve(__dirname, './src/store/index.js'),
      '@sources':    path.resolve(__dirname, './src/sources/index.js'),
      '@utils':      path.resolve(__dirname, './src/utils'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages':      path.resolve(__dirname, './src/pages'),
    },
  },
  server: { port: 5173, host: true },
  build:  { outDir: 'dist', sourcemap: false },
})
