import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * 内网接口：开发时走代理避免 CORS。
 * 若部署到与接口同域或接口已开 CORS，可改 .env 用完整 URL。
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/__api': {
        target: 'https://search-aladdin-lamp.hlgdata.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/__api/, ''),
      },
    },
  },
})
