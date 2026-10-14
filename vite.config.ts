import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  base: './',
  build: { rollupOptions: { input: [fileURLToPath(new URL('./index.html', import.meta.url)), fileURLToPath(new URL('./eat.html', import.meta.url))] } },
})
