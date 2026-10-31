import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import eslintPlugin from 'vite-plugin-eslint';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    eslintPlugin({
      cache: false,
      include: ['./src/**/*.tsx']
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
