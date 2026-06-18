import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_URL || 'http://100.67.25.118:9001'
  const tlsKeyPath = env.VITE_TLS_KEY_FILE || path.resolve('.certs/localhost+127.0.0.1-key.pem')
  const tlsCertPath = env.VITE_TLS_CERT_FILE || path.resolve('.certs/localhost+127.0.0.1.pem')
  const shouldUseHttps = env.VITE_DISABLE_TLS !== '1'

  const httpsConfig =
    shouldUseHttps && fs.existsSync(tlsKeyPath) && fs.existsSync(tlsCertPath)
      ? { key: fs.readFileSync(tlsKeyPath), cert: fs.readFileSync(tlsCertPath) }
      : undefined

  // Shared proxy table: /api -> vaultwares-api. The API owns auth, DB access,
  // queueing, and runtime orchestration.
  // Used by both `vite dev` and `vite preview` so the NSSM service can also
  // reach the backend without a separate nginx.
  const proxyConfig = {
    '/api': {
      target: apiTarget,
      changeOrigin: true,
      secure: false,
      rewrite: (p: string) => p.replace(/^\/api/, ''),
    },
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: '127.0.0.1',
      https: httpsConfig,
      proxy: proxyConfig,
    },
    preview: {
      host: '0.0.0.0',
      port: 3100,
      https: httpsConfig,
      proxy: proxyConfig,
    },
    /*
     * Fix: e2e test globbing issue
     * Issue: vitest attempting to run playwright e2e tests
     * Solution: Explicitly exclude e2e test directory from vitest
     */
    test: {
      exclude: ['tests/e2e/**', 'node_modules/**']
    },
  }
})
