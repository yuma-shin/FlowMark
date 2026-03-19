import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss(), tsconfigPaths()],

  // フロントエンドのルートを指定（index.html の場所）
  root: 'src/renderer',

  // Tauri では cleartext を使うため、https は不要
  // ホストは Tauri CLI が設定する
  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Tauri が監視するファイルを Vite が重複して監視しないようにする
      ignored: ['**/src-tauri/**'],
    },
  },

  // Tauri コマンド呼び出しで必要な環境変数を公開
  envPrefix: ['VITE_', 'TAURI_'],

  build: {
    // 出力先をプロジェクトルートの dist/ に設定（tauri.conf.json の frontendDist と合わせる）
    outDir: '../../dist',
    emptyOutDir: true,
    // Tauri は Chromium ベースなので ES2021 を対象にできる
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // 本番ビルドではソースマップを無効化
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    // バンドルサイズ制限を緩和（Electron に比べて配布サイズ制約が少ない）
    chunkSizeWarningLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('mermaid')) return 'mermaid'
          if (
            id.includes('@codemirror/view') ||
            id.includes('@codemirror/state') ||
            id.includes('@uiw/react-codemirror')
          )
            return 'editor'
          if (
            id.includes('remark') ||
            id.includes('remark-gfm') ||
            id.includes('remark-rehype') ||
            id.includes('rehype-highlight') ||
            id.includes('rehype-stringify')
          )
            return 'markdown'
        },
      },
    },
  },
}))
