import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// public/ 下的内容文件（manifest.json、history.json、wiki-graph.json 等）每次同步都沿用同一路径，
// GitHub Pages 按路径缓存（max-age=600），新版本代码会读到旧内容。用同步时间做版本号，拼到每个内容请求的查询串上。
const manifest = JSON.parse(readFileSync(new URL('./public/content/manifest.json', import.meta.url), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/mindforge/wiki/',
  define: {
    __CONTENT_VERSION__: JSON.stringify(String(manifest.generatedAt ?? '')),
  },
})
