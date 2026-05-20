import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {readFileSync} from 'fs'
import {resolve} from 'path'
import {parse as parseYaml} from 'yaml'

const config = parseYaml(readFileSync('../config.yml', 'utf-8')) as {
  ui?: { port?: number }
  api?: { host?: string; port?: number }
}

const uiPort = config.ui?.port ?? 3000
const apiPort = config.api?.port ?? 8000
const apiHost = config.api?.host ?? '127.0.0.1'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: uiPort,
    proxy: {
      '/api': {
        target: `http://${apiHost}:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
})
