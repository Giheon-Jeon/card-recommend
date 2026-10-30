/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'

const rootDir = import.meta.dirname

/**
 * 프로덕션 빌드 시 생성된 정적 애셋 및 카탈로그 번들(cards-catalog-*.js) 목록을
 * 서비스 워커(dist/sw.js)의 프리캐시 매니페스트에 자동 주입하는 내장 PWA 플러그인입니다.
 */
function cardTrackerPwaPlugin(): Plugin {
  let outDir = path.resolve(rootDir, 'dist')

  return {
    name: 'card-tracker-pwa',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const swPath = path.join(outDir, 'sw.js')
      if (!fs.existsSync(swPath)) return

      const assetsDir = path.join(outDir, 'assets')
      const precacheUrls = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg']

      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir)
        for (const file of files) {
          if (/\.(js|css|json|svg|png|woff2?)$/i.test(file)) {
            precacheUrls.push(`/assets/${file}`)
          }
        }
      }

      const swContent = fs.readFileSync(swPath, 'utf-8')
      const injected = swContent.replace(
        'self.__PRECACHE_MANIFEST__ || []',
        JSON.stringify(precacheUrls),
      )
      fs.writeFileSync(swPath, injected, 'utf-8')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cardTrackerPwaPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
      '@data': path.resolve(rootDir, './data'),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('cards-catalog.json')) {
            return 'cards-catalog'
          }
          if (id.includes('@google/generative-ai')) {
            return 'gemini-ai'
          }
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        'data/**',
        '**/*.d.ts',
        'vite.config.ts',
      ],
    },
  },
})
