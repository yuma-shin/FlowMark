/**
 * Tauri ビルド後に成果物を Electron-builder と同様の構造へコピーする
 *   src-tauri/target/release/bundle/**  →  dist/v{version}/
 */
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises'
import { join, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..')

const { version } = JSON.parse(
  await (await import('node:fs/promises')).readFile(join(ROOT, 'package.json'), 'utf8'),
)

const BUNDLE_DIR = join(ROOT, 'src-tauri', 'target', 'release', 'bundle')
const OUT_DIR = join(ROOT, 'dist', `v${version}`)

/** 収集対象の拡張子 */
const TARGET_EXTS = new Set(['.exe', '.msi', '.dmg', '.zip', '.AppImage', '.deb', '.rpm', '.app'])

async function collectFiles(dir, results = []) {
  let entries
  try {
    entries = await readdir(dir)
  } catch {
    return results
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    const info = await stat(full)
    if (info.isDirectory()) {
      await collectFiles(full, results)
    } else if (TARGET_EXTS.has(extname(entry).toLowerCase())) {
      results.push(full)
    }
  }
  return results
}

const files = await collectFiles(BUNDLE_DIR)
if (files.length === 0) {
  console.warn('No bundle artifacts found. Run `pnpm build` first.')
  process.exit(0)
}

await mkdir(OUT_DIR, { recursive: true })

for (const src of files) {
  const dest = join(OUT_DIR, basename(src))
  await copyFile(src, dest)
  console.log(`Copied: ${basename(src)} → dist/v${version}/`)
}

console.log(`\nArtifacts collected in dist/v${version}/`)
