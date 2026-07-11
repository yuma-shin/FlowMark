export const DEFAULT_CACHE_CAPACITY = 20

export interface CacheEntry {
  /** EditorState.toJSON({ history: historyField }) の結果 */
  json: unknown
  /** 整合性検証用のドキュメント内容（state.doc.toString()） */
  documentContent: string
}

/**
 * ノートのファイルパスをキーとしたLRUキャッシュ。
 * Map の insertion order を利用し、末尾が最新、先頭が最古（LRU）。
 */
export class EditorStateCache {
  private capacity: number
  private cache: Map<string, CacheEntry>

  constructor(capacity: number = DEFAULT_CACHE_CAPACITY) {
    this.capacity = capacity
    this.cache = new Map()
  }

  /**
   * キャッシュにエントリを保存する。
   * 既存キーは削除→再挿入で順序を最新に更新。
   * 容量超過時はLRU（最古）エントリを削除。
   */
  set(filePath: string, entry: CacheEntry): void {
    if (this.cache.has(filePath)) {
      this.cache.delete(filePath)
    }

    if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(filePath, entry)
  }

  /**
   * キャッシュからエントリを取得する。
   * アクセス順序を最新に更新（delete → re-insert）。
   */
  get(filePath: string): CacheEntry | undefined {
    const entry = this.cache.get(filePath)
    if (entry === undefined) {
      return undefined
    }

    // LRU更新: delete → re-insert で末尾（最新）に移動
    this.cache.delete(filePath)
    this.cache.set(filePath, entry)
    return entry
  }

  /**
   * 指定キーのエントリを削除する。
   */
  delete(filePath: string): boolean {
    return this.cache.delete(filePath)
  }

  /**
   * 全エントリを削除する。
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 現在のキャッシュサイズを取得する。
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * 指定キーが存在するか確認する。
   */
  has(filePath: string): boolean {
    return this.cache.has(filePath)
  }
}
