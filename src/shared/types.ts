// Markdown Editor Types

export interface MarkdownNoteMeta {
  id: string
  title: string
  filePath: string // 絶対パス
  relativePath: string // ルートからの相対パス
  tags?: string[]
  createdAt?: string // ISO形式
  updatedAt?: string // ISO形式
  excerpt?: string // 本文の一部
}

export interface FolderNode {
  name: string
  relativePath: string
  children: FolderNode[]
  notes: MarkdownNoteMeta[]
}

export interface AppSettings {
  rootDir?: string
  editorLayoutMode: 'editor' | 'preview' | 'split'
  theme: 'light' | 'dark' | 'system'
  colorTheme: string
  language: 'en' | 'ja'
  lastOpenedNotePath?: string
  lastSelectedFolder?: string
  showSidebar?: boolean
  showNoteList?: boolean
  sidebarWidth?: number
  noteListWidth?: number
}

export interface NoteContent {
  meta: MarkdownNoteMeta
  content: string
  rawContent: string // front matterを含む生のファイル内容
}

// Image Service Types

export interface ImageSaveResult {
  success: boolean
  relativePath: string | null
  error?: string
}

export interface CleanupResult {
  success: boolean
  deletedFiles: string[]
  errors: string[]
}
