import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

/** Node.js built-in modules — always external in the main process. */
const NODE_BUILTINS = [
  'fs', 'fs/promises', 'path', 'os', 'crypto', 'stream', 'events',
  'child_process', 'http', 'https', 'net', 'url', 'util', 'zlib',
  'buffer', 'assert', 'readline', 'process', 'module', 'worker_threads',
  'tty', 'constants', 'string_decoder', 'querystring', 'punycode',
]

/**
 * All ids that must NOT be bundled into the main process.
 * The main bundle is output as CJS, but externalising these avoids
 * Rolldown trying to re-wrap their own CJS require() calls.
 */
function isMainExternal(id: string): boolean {
  if (id === 'electron') return true
  if (id.startsWith('node:')) return true
  if (NODE_BUILTINS.includes(id)) return true

  // CJS deps used in src/main
  if (id === 'electron-log'     || id.startsWith('electron-log/'))     return true
  if (id === 'electron-updater' || id.startsWith('electron-updater/')) return true
  if (id === 'fs-extra'         || id.startsWith('fs-extra/'))         return true

  // Google / Firebase SDKs
  if (id === '@google/genai'         || id.startsWith('@google/genai/'))         return true
  if (id === '@google/generative-ai' || id.startsWith('@google/generative-ai/')) return true
  if (id === 'firebase'              || id.startsWith('firebase/'))              return true

  return false
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        onstart(options) {
          options.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: isMainExternal,
              output: {
                // Force CJS so that externalized CJS packages (electron-updater,
                // electron-log, fs-extra) can be required at runtime without
                // Node throwing "named export not found" ESM/CJS interop errors.
                format: 'cjs',
                entryFileNames: '[name].js',
              },
            },
          },
        },
      },
      {
        entry: 'src/preload/index.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            lib: {
              entry: 'src/preload/index.ts',
              formats: ['cjs'],
              fileName: () => 'index.js',
            },
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@':         path.resolve(__dirname, './src'),
      '@main':     path.resolve(__dirname, './src/main'),
      '@preload':  path.resolve(__dirname, './src/preload'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@shared':   path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    port: 5173,
  },
})