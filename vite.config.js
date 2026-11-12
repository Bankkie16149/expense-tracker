import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'

// Calculate dynamic auto-versioning
const baseVersion = '2.5'
let patchVersion = 0
let gitHash = ''

try {
  const commitCount = parseInt(execSync('git rev-list --count HEAD').toString().trim(), 10)
  // Offset 185 = v2.5.0. Each new commit increments .1, .2, etc.
  patchVersion = Math.max(0, commitCount - 185)
  gitHash = execSync('git rev-parse --short HEAD').toString().trim()
} catch {
  // Fallback to default
}

const appVersion = `v${baseVersion}.${patchVersion}`

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_TIME__: JSON.stringify(new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })),
    __GIT_HASH__: JSON.stringify(gitHash)
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fintrack-logo.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'FinTrack',
        short_name: 'FinTrack',
        description: 'FinTrack - Your Personal Finance App',
        theme_color: '#003366',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
