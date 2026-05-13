import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_URL || 'https://localhost:8000'
  const tlsKeyPath = env.VITE_TLS_KEY_FILE || path.resolve('.certs/localhost+127.0.0.1-key.pem')
  const tlsCertPath = env.VITE_TLS_CERT_FILE || path.resolve('.certs/localhost+127.0.0.1.pem')
  const shouldUseHttps = env.VITE_DISABLE_TLS !== '1'

  const httpsConfig =
    shouldUseHttps && fs.existsSync(tlsKeyPath) && fs.existsSync(tlsCertPath)
      ? { key: fs.readFileSync(tlsKeyPath), cert: fs.readFileSync(tlsCertPath) }
      : undefined

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: '127.0.0.1',
      https: httpsConfig,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 3100,
      https: httpsConfig,
    },
  }
})
