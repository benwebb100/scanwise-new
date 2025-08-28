import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { fileURLToPath } from 'url'
import { componentTagger } from 'lovable-tagger'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
  },
  preview: {
    allowedHosts: ['scan-wise.com', 'www.scan-wise.com', 'frontend-scanwise.onrender.com', 'scanwise-new-1.onrender.com']
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
