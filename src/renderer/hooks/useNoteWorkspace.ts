import { useEffect, useState, useRef } from 'react'
import { useApp } from '../contexts/AppContext'
import { tauriApi as App } from '@/renderer/lib/tauriApi'
import type { MarkdownNoteMeta, FolderNode, AppSettings } from '@/shared/types'

const EXTERNAL_CHANGE_COOLDOWN_MS = 5000

export interface UseNoteWorkspaceResult {
  // ロード・初期化状態
  isLoading: boolean
  showRootDialog: boolean
  // データ
  folderTree: FolderNode | null
  allNotes: MarkdownNoteMeta[]
  filteredNotes: MarkdownNoteMeta[]
  folderFilteredNotes: MarkdownNoteMeta[]
  selectedFolder: string
  selectedTag: string | null
  selectedNote: MarkdownNoteMeta | null
  noteContent: string
  isSaving: boolean
  saveError: string | null
  showSidebar: boolean
  showNoteList: boolean
  isNoteTransitioning: boolean
  showAllNotes: boolean
  // 操作
  onRootFolderSelect: (path: string) => void
  onChangeRootFolder: () => void
  onShowAllNotes: () => void
  onSelectFolder: (relativePath: string) => void
  onSelectTag: (tag: string | null) => void
  onSelectNote: (note: MarkdownNoteMeta) => Promise<void>
  onContentChange: (content: string) => void
  onCreateNote: (title: string) => Promise<void>
  onCreateFolder: (folderName: string) => Promise<void>
  onDeleteNote: (note: MarkdownNoteMeta) => Promise<void>
  onDeleteFolder: (folderPath: string) => Promise<void>
  onMetadataChange: (title: string, tags: string[]) => Promise<void>
  onNoteMove: (targetFolder: string) => Promise<void>
  onToggleSidebar: () => void
  onToggleNoteList: () => void
  onSaveErrorDismiss: () => void
  onLayoutModeChange: (mode: AppSettings['editorLayoutMode']) => void
}

export function useNoteWorkspace(): UseNoteWorkspaceResult {
  const { settings, updateSettings, isLoading: settingsLoading } = useApp()
  const [showRootDialog, setShowRootDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [folderTree, setFolderTree] = useState<FolderNode | null>(null)
  const [allNotes, setAllNotes] = useState<MarkdownNoteMeta[]>([])
  const [filteredNotes, setFilteredNotes] = useState<MarkdownNoteMeta[]>([])
  const [folderFilteredNotes, setFolderFilteredNotes] = useState<
    MarkdownNoteMeta[]
  >([])
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedNote, setSelectedNote] = useState<MarkdownNoteMeta | null>(
    null
  )
  const [noteContent, setNoteContent] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(settings.showSidebar ?? true)
  const [showNoteList, setShowNoteList] = useState(
    settings.showNoteList ?? true
  )
  const [isNoteTransitioning, setIsNoteTransitioning] = useState(false)
  const [_noteAnimationDirection, setNoteAnimationDirection] = useState<
    'forward' | 'backward'
  >('forward')
  const [showAllNotes, setShowAllNotes] = useState(false)
  const lastSaveTimeRef = useRef<number>(0)
  const lastLocalEditTimeRef = useRef<number>(0)
  const lastLocalWriteTimeRef = useRef<number>(0)
  const reloadTimeoutRef = useRef<number | undefined>(undefined)
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const rootDirRef = useRef<string | undefined>(settings.rootDir)

  // rootDir の最新値を ref に反映（onCloseRequested クロージャーから参照）
  useEffect(() => {
    rootDirRef.current = settings.rootDir
  }, [settings.rootDir])

  // ウィンドウ終了時に未使用画像をクリーンアップする
  useEffect(() => {
    let unlisten: (() => void) | null = null
    let isClosing = false

    const setup = async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const win = getCurrentWindow()
      unlisten = await win.onCloseRequested(async event => {
        if (isClosing) return
        event.preventDefault()
        isClosing = true

        if (rootDirRef.current) {
          try {
            await App.image.cleanupAll(rootDirRef.current)
          } catch (error) {
            console.error('Failed to cleanup images on close:', error)
          }
        }

        await win.destroy()
      })
    }

    setup()

    return () => {
      unlisten?.()
    }
  }, [])

  // 初期化
  useEffect(() => {
    const initialize = async () => {
      if (settingsLoading) {
        return
      }

      if (!settings.rootDir) {
        setShowRootDialog(true)
        setIsLoading(false)
        return
      }

      const exists = await App.markdown.checkRootExists(settings.rootDir)
      if (!exists) {
        setShowRootDialog(true)
        setIsLoading(false)
        return
      }

      // サイドバー・ノートリストの表示状態を復元
      setShowSidebar(settings.showSidebar ?? true)
      setShowNoteList(settings.showNoteList ?? true)

      // 前回選択していたフォルダを復元
      const lastFolder = settings.lastSelectedFolder ?? ''
      setSelectedFolder(lastFolder)

      await loadNotes(lastFolder)
      setIsLoading(false)
    }

    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.rootDir, settingsLoading])

  // ノートを読み込む
  const loadNotes = async (folderPath?: string) => {
    if (!settings.rootDir || !App) return

    try {
      const { notes, tree } = await App.markdown.scanNotesAndBuildFolderTree(
        settings.rootDir
      )
      setAllNotes(notes)
      setFolderTree(tree)
      const targetFolder =
        folderPath !== undefined ? folderPath : selectedFolder

      // 指定されたフォルダまたはselectedFolderに基づいてフィルタリング
      // ただし現在の表示が「すべてのノート」の場合はそのまま全件を表示する
      if (showAllNotes && folderPath === undefined) {
        setFilteredNotes(notes)
        setFolderFilteredNotes(notes)
      } else {
        const filtered = notes.filter(note => {
          if (targetFolder === '') {
            // ルートフォルダの場合は直下のノートのみ
            const dir =
              note.relativePath.includes('/') ||
              note.relativePath.includes('\\')
                ? note.relativePath.substring(
                    0,
                    Math.max(
                      note.relativePath.lastIndexOf('/'),
                      note.relativePath.lastIndexOf('\\')
                    )
                  )
                : ''
            return dir === ''
          }
          // 選択されたフォルダ直下のノートのみ
          const dir =
            note.relativePath.includes('/') || note.relativePath.includes('\\')
              ? note.relativePath.substring(
                  0,
                  Math.max(
                    note.relativePath.lastIndexOf('/'),
                    note.relativePath.lastIndexOf('\\')
                  )
                )
              : ''
          // パス区切り文字を統一して比較
          const normalizedDir = dir.replace(/\\/g, '/')
          const normalizedTargetFolder = targetFolder.replace(/\\/g, '/')
          return normalizedDir === normalizedTargetFolder
        })
        setFilteredNotes(filtered)
        setFolderFilteredNotes(filtered)
      }

      // 前回開いていたノートを開く（現在のフォルダ内にある場合のみ）
      if (settings.lastOpenedNotePath) {
        const lastNote = notes.find(
          n => n.filePath === settings.lastOpenedNotePath
        )
        if (lastNote) {
          // ノートが現在選択されているフォルダ内にあるかチェック
          const noteDir =
            lastNote.relativePath.includes('/') ||
            lastNote.relativePath.includes('\\')
              ? lastNote.relativePath.substring(
                  0,
                  Math.max(
                    lastNote.relativePath.lastIndexOf('/'),
                    lastNote.relativePath.lastIndexOf('\\')
                  )
                )
              : ''
          const normalizedNoteDir = noteDir.replace(/\\/g, '/')
          const normalizedTargetFolder = targetFolder.replace(/\\/g, '/')

          // 同じフォルダ内にある場合のみ開く
          if (normalizedNoteDir === normalizedTargetFolder) {
            onSelectNote(lastNote)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load notes:', error)
    }
  }

  // ルートフォルダ選択
  const onRootFolderSelect = (path: string) => {
    // 即座にエディタと各リストをリセット（クリーンな切り替え）
    setSelectedNote(null)
    setNoteContent('')
    setAllNotes([])
    setFilteredNotes([])
    setFolderFilteredNotes([])
    setFolderTree(null)
    setSelectedFolder('')
    setShowAllNotes(false)
    setShowRootDialog(false)
    setIsLoading(true)

    if (path === settings.rootDir) {
      // 同じフォルダが選択された場合、settings.rootDir は変わらないため
      // useEffect が発火しない。直接ロードする（この時点でクロージャー内の
      // settings.rootDir は既に正しい値なので stale closure の問題はない）。
      loadNotes('').finally(() => setIsLoading(false))
      return
    }

    // settings.rootDir の変更が useEffect [settings.rootDir, settingsLoading] を
    // トリガーし、新しい rootDir で loadNotes() が正しく呼ばれる。
    updateSettings({
      rootDir: path,
      lastSelectedFolder: '',
      lastOpenedNotePath: undefined,
    })
  }

  // ルートフォルダ再選択
  const onChangeRootFolder = () => {
    setShowRootDialog(true)
  }

  // すべてのノートを表示
  const onShowAllNotes = () => {
    setShowAllNotes(true)
    setSelectedFolder('')
    setSelectedTag(null)
    setFilteredNotes(allNotes)
    setFolderFilteredNotes(allNotes)
  }

  // フォルダ選択
  const onSelectFolder = (relativePath: string) => {
    setSelectedFolder(relativePath)
    updateSettings({ lastSelectedFolder: relativePath })
    setSelectedTag(null) // タグフィルターをクリア
    setShowAllNotes(false)

    // 選択したフォルダ直下のノートのみをフィルタ（サブフォルダ内を除く）
    const filtered = allNotes.filter(note => {
      if (relativePath === '') {
        // ルートフォルダの場合は直下のノートのみ
        const dir =
          note.relativePath.includes('/') || note.relativePath.includes('\\')
            ? note.relativePath.substring(
                0,
                Math.max(
                  note.relativePath.lastIndexOf('/'),
                  note.relativePath.lastIndexOf('\\')
                )
              )
            : ''
        return dir === ''
      }
      // 選択されたフォルダ直下のノートのみ
      const dir =
        note.relativePath.includes('/') || note.relativePath.includes('\\')
          ? note.relativePath.substring(
              0,
              Math.max(
                note.relativePath.lastIndexOf('/'),
                note.relativePath.lastIndexOf('\\')
              )
            )
          : ''
      // パス区切り文字を統一して比較
      const normalizedDir = dir.replace(/\\/g, '/')
      const normalizedSelectedFolder = relativePath.replace(/\\/g, '/')
      return normalizedDir === normalizedSelectedFolder
    })
    setFilteredNotes(filtered)
  }

  // タグ選択
  const onSelectTag = (tag: string | null) => {
    setSelectedTag(tag)
    // showAllNotesの状態は保持する

    if (tag === null) {
      // タグフィルターをクリア - 現在の表示状態に戻る
      if (showAllNotes) {
        // すべてのノートを表示
        setFilteredNotes(allNotes)
      } else {
        // 現在のフォルダの表示に戻る
        const filtered = allNotes.filter(note => {
          if (selectedFolder === '') {
            const dir =
              note.relativePath.includes('/') ||
              note.relativePath.includes('\\')
                ? note.relativePath.substring(
                    0,
                    Math.max(
                      note.relativePath.lastIndexOf('/'),
                      note.relativePath.lastIndexOf('\\')
                    )
                  )
                : ''
            return dir === ''
          }
          const dir =
            note.relativePath.includes('/') || note.relativePath.includes('\\')
              ? note.relativePath.substring(
                  0,
                  Math.max(
                    note.relativePath.lastIndexOf('/'),
                    note.relativePath.lastIndexOf('\\')
                  )
                )
              : ''
          const normalizedDir = dir.replace(/\\/g, '/')
          const normalizedSelectedFolder = selectedFolder.replace(/\\/g, '/')
          return normalizedDir === normalizedSelectedFolder
        })
        setFilteredNotes(filtered)
      }
    } else {
      // 選択したタグを持つノートをフィルタリング
      let notesInScope = allNotes

      if (showAllNotes) {
        // すべてのノートからタグフィルタリング
        notesInScope = allNotes
      } else {
        // 現在のフォルダ内からタグフィルタリング
        notesInScope = allNotes.filter(note => {
          if (selectedFolder === '') {
            const dir =
              note.relativePath.includes('/') ||
              note.relativePath.includes('\\')
                ? note.relativePath.substring(
                    0,
                    Math.max(
                      note.relativePath.lastIndexOf('/'),
                      note.relativePath.lastIndexOf('\\')
                    )
                  )
                : ''
            return dir === ''
          }
          const dir =
            note.relativePath.includes('/') || note.relativePath.includes('\\')
              ? note.relativePath.substring(
                  0,
                  Math.max(
                    note.relativePath.lastIndexOf('/'),
                    note.relativePath.lastIndexOf('\\')
                  )
                )
              : ''
          const normalizedDir = dir.replace(/\\/g, '/')
          const normalizedSelectedFolder = selectedFolder.replace(/\\/g, '/')
          return normalizedDir === normalizedSelectedFolder
        })
      }

      const filtered = notesInScope.filter(
        note => note.tags && Array.isArray(note.tags) && note.tags.includes(tag)
      )
      setFilteredNotes(filtered)
    }
  }

  // ノート選択
  const onSelectNote = async (note: MarkdownNoteMeta) => {
    if (selectedNote?.id === note.id) return

    // 直前に選択中のノートがある場合のみ、切替のフェードアウト演出を行う
    // （ノート作成直後の初回選択等、フェードアウトすべき対象が無い場合は待機を省略する）
    const isSwitchingNote = selectedNote !== null

    if (isSwitchingNote) {
      // アニメーション方向を決定（現在のノートのインデックスと比較）
      const currentIndex = filteredNotes.findIndex(
        n => n.id === selectedNote.id
      )
      const newIndex = filteredNotes.findIndex(n => n.id === note.id)
      setNoteAnimationDirection(
        newIndex > currentIndex ? 'forward' : 'backward'
      )

      setIsNoteTransitioning(true)

      // フェードアウト完了を待つ
      await new Promise(resolve => setTimeout(resolve, 150))
    }

    setSelectedNote(note)
    updateSettings({ lastOpenedNotePath: note.filePath })

    try {
      const content = await App.markdown.getNoteContent(note.filePath)
      if (content) {
        setNoteContent(content.content)
      }
    } catch (error) {
      console.error('Failed to load note content:', error)
    }

    if (isSwitchingNote) {
      // フェードイン開始
      setTimeout(() => {
        setIsNoteTransitioning(false)
      }, 50)
    }
  }

  // ファイル監視のセットアップ
  useEffect(() => {
    if (!selectedNote || !App) return

    // ファイルの監視を開始
    App.markdown.watchFile(selectedNote.filePath)

    // ファイル変更イベントのリスナーを設定
    const unsubscribe = App.markdown.onFileChanged(async changedPath => {
      if (changedPath === selectedNote.filePath) {
        if (saveTimeoutRef.current) {
          return
        }

        const timeSinceLastEdit = Date.now() - lastLocalEditTimeRef.current
        if (timeSinceLastEdit < 2000) {
          return
        }

        const timeSinceLastLocalWrite =
          Date.now() - lastLocalWriteTimeRef.current
        if (timeSinceLastLocalWrite < EXTERNAL_CHANGE_COOLDOWN_MS) {
          return
        }

        const timeSinceLastSave = Date.now() - lastSaveTimeRef.current
        if (timeSinceLastSave < 1000) {
          return
        }

        if (reloadTimeoutRef.current) {
          clearTimeout(reloadTimeoutRef.current)
        }

        reloadTimeoutRef.current = window.setTimeout(async () => {
          try {
            const content = await App.markdown.getNoteContent(
              selectedNote.filePath
            )
            if (content) {
              setNoteContent(content.content)
            }
          } catch (error) {
            console.error('Failed to reload note:', error)
          }
        }, 300)
      }
    })

    // クリーンアップ
    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current)
      }
      App.markdown.unwatchFile(selectedNote.filePath)
      unsubscribe()
    }
  }, [selectedNote?.filePath])

  // ノート内容の変更
  const onContentChange = (content: string) => {
    lastLocalEditTimeRef.current = Date.now()
    setNoteContent(content)
    debouncedSave(content)
  }

  // 自動保存（デバウンス付き）
  const debouncedSave = (() => {
    return (content: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(async () => {
        if (!selectedNote) return
        setIsSaving(true)
        try {
          // コンテンツにfront matterが含まれているかチェック
          // front matterがない場合は、メタデータを保持したまま保存
          if (!content.startsWith('---\n')) {
            // 現在のノートからfront matterを取得
            const currentContent = await App.markdown.getNoteContent(
              selectedNote.filePath
            )
            if (currentContent?.rawContent) {
              // 生のファイル内容からfront matterを抽出
              const rawContent = currentContent.rawContent
              if (rawContent.startsWith('---\n')) {
                const endIndex = rawContent.indexOf('\n---\n', 4)
                if (endIndex !== -1) {
                  // front matterセクション全体（最後の改行を含む）
                  const frontMatterSection = rawContent.substring(
                    0,
                    endIndex + 5
                  )
                  // contentの先頭の改行を削除してから結合
                  const trimmedContent = content.replace(/^\n+/, '')
                  // front matterと新しいコンテンツを結合（front matterは既に改行で終わっているので追加不要）
                  const contentToSave = frontMatterSection + trimmedContent
                  await App.markdown.saveNote(
                    selectedNote.filePath,
                    contentToSave
                  )
                  lastSaveTimeRef.current = Date.now()
                  lastLocalWriteTimeRef.current = Date.now()
                  setSaveError(null)
                  setIsSaving(false)
                  saveTimeoutRef.current = undefined

                  return
                }
              }
            }
          }

          // front matterが既に含まれている場合はそのまま保存
          await App.markdown.saveNote(selectedNote.filePath, content)
          lastSaveTimeRef.current = Date.now()
          lastLocalWriteTimeRef.current = Date.now()
          setSaveError(null)
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          console.error('Failed to save note:', msg)
          setSaveError(msg)
        } finally {
          setIsSaving(false)
          saveTimeoutRef.current = undefined
        }
      }, 1000)
    }
  })()

  // レイアウトモード変更
  const onLayoutModeChange = (mode: AppSettings['editorLayoutMode']) => {
    updateSettings({ editorLayoutMode: mode })
  }

  // サイドバー・ノートリストのトグル
  const onToggleSidebar = () => {
    const newValue = !showSidebar
    setShowSidebar(newValue)
    updateSettings({ showSidebar: newValue })
  }

  const onToggleNoteList = () => {
    const newValue = !showNoteList
    setShowNoteList(newValue)
    updateSettings({ showNoteList: newValue })
  }

  // ノート作成
  const onCreateNote = async (title: string) => {
    if (!settings.rootDir) return

    try {
      const filePath = await App.markdown.createNote(
        settings.rootDir,
        selectedFolder,
        title
      )
      if (filePath) {
        // ノートリストを再読み込み
        const { notes, tree } = await App.markdown.scanNotesAndBuildFolderTree(
          settings.rootDir
        )
        setAllNotes(notes)
        setFolderTree(tree)

        // フィルタリングされたノートリストを更新
        const filtered = notes.filter(note => {
          if (selectedFolder === '') {
            const dir =
              note.relativePath.includes('/') ||
              note.relativePath.includes('\\')
                ? note.relativePath.substring(
                    0,
                    Math.max(
                      note.relativePath.lastIndexOf('/'),
                      note.relativePath.lastIndexOf('\\')
                    )
                  )
                : ''
            return dir === ''
          }
          const dir =
            note.relativePath.includes('/') || note.relativePath.includes('\\')
              ? note.relativePath.substring(
                  0,
                  Math.max(
                    note.relativePath.lastIndexOf('/'),
                    note.relativePath.lastIndexOf('\\')
                  )
                )
              : ''
          // パス区切り文字を統一して比較
          const normalizedDir = dir.replace(/\\/g, '/')
          const normalizedSelectedFolder = selectedFolder.replace(/\\/g, '/')
          return normalizedDir === normalizedSelectedFolder
        })
        setFilteredNotes(filtered)

        // 新しく作成したノートを開く
        const newNote = notes.find(n => n.filePath === filePath)
        if (newNote) {
          onSelectNote(newNote)
        }
      }
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  // フォルダ作成
  const onCreateFolder = async (folderName: string) => {
    if (!settings.rootDir) return

    try {
      const newPath = selectedFolder
        ? `${selectedFolder}/${folderName}`
        : folderName
      const success = await App.markdown.createFolder(settings.rootDir, newPath)
      if (success) {
        await loadNotes()
      }
    } catch (error) {
      console.error('Failed to create folder:', error)
    }
  }

  // メタデータ変更
  const onMetadataChange = async (title: string, tags: string[]) => {
    if (!selectedNote) return

    // 保留中の保存をキャンセル
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = undefined
    }

    try {
      // 手動でfrontmatterをパース（gray-matterはRenderer processでBufferエラーになるため）
      const frontmatter: Record<string, any> = {}
      let content = noteContent

      // frontmatterの抽出
      if (noteContent.startsWith('---\n')) {
        const endIndex = noteContent.indexOf('\n---\n', 4)
        if (endIndex !== -1) {
          const frontmatterText = noteContent.substring(4, endIndex)
          content = noteContent.substring(endIndex + 5)

          // 簡易的なYAMLパース
          frontmatterText.split('\n').forEach(line => {
            if (line.trim().startsWith('-')) {
              // 配列の要素
              return
            }
            const colonIndex = line.indexOf(':')
            if (colonIndex !== -1) {
              const key = line.substring(0, colonIndex).trim()
              const value = line.substring(colonIndex + 1).trim()

              // 配列の場合
              if (value === '') {
                frontmatter[key] = []
                return
              }

              frontmatter[key] = value
            }
          })

          // 配列要素を処理
          let currentKey = ''
          frontmatterText.split('\n').forEach(line => {
            const colonIndex = line.indexOf(':')
            if (
              colonIndex !== -1 &&
              line.substring(colonIndex + 1).trim() === ''
            ) {
              currentKey = line.substring(0, colonIndex).trim()
              frontmatter[currentKey] = []
            } else if (line.trim().startsWith('-') && currentKey) {
              frontmatter[currentKey].push(line.trim().substring(1).trim())
            }
          })
        }
      }

      // フロントマターを更新
      frontmatter.title = title
      frontmatter.tags = tags
      frontmatter.updatedAt = new Date().toISOString()

      // 新しいfrontmatterを生成
      const frontmatterLines = ['---']
      for (const [key, value] of Object.entries(frontmatter)) {
        if (Array.isArray(value)) {
          frontmatterLines.push(`${key}:`)
          value.forEach(item => {
            frontmatterLines.push(`  - ${item}`)
          })
        } else {
          frontmatterLines.push(`${key}: ${value}`)
        }
      }
      frontmatterLines.push('---')
      frontmatterLines.push('')

      const newContent = frontmatterLines.join('\n') + content

      // 保存
      await App.markdown.saveNote(selectedNote.filePath, newContent)

      // UI上のコンテンツは本文のみを保持（front matterは含めない）
      // contentは既にfront matterが除外された本文のみ
      // setNoteContent(content) は不要（既に現在の状態）

      // ノート一覧を再読み込み
      await loadNotes()

      // 選択中のノートを更新
      setSelectedNote({
        ...selectedNote,
        title,
        tags,
        updatedAt: frontmatter.updatedAt,
      })
    } catch (error) {
      console.error('Failed to update metadata:', error)
    }
  }

  // ノート移動
  const onNoteMove = async (targetFolder: string) => {
    if (!selectedNote || !settings.rootDir) return

    try {
      const newFilePath = await App.markdown.moveNote(
        settings.rootDir,
        selectedNote.filePath,
        targetFolder
      )

      if (newFilePath) {
        // ノートリストを再読み込み
        const { notes, tree } = await App.markdown.scanNotesAndBuildFolderTree(
          settings.rootDir
        )
        setAllNotes(notes)
        setFolderTree(tree)

        // 移動先のフォルダを選択
        setSelectedFolder(targetFolder)
        setShowAllNotes(false)
        setSelectedTag(null)

        // 移動先フォルダでフィルタリング
        const filtered = notes.filter(note => {
          if (targetFolder === '') {
            // ルートフォルダの場合は直下のノートのみ
            const dir =
              note.relativePath.includes('/') ||
              note.relativePath.includes('\\')
                ? note.relativePath.substring(
                    0,
                    Math.max(
                      note.relativePath.lastIndexOf('/'),
                      note.relativePath.lastIndexOf('\\')
                    )
                  )
                : ''
            return dir === ''
          }
          // 選択されたフォルダ直下のノートのみ
          const dir =
            note.relativePath.includes('/') || note.relativePath.includes('\\')
              ? note.relativePath.substring(
                  0,
                  Math.max(
                    note.relativePath.lastIndexOf('/'),
                    note.relativePath.lastIndexOf('\\')
                  )
                )
              : ''
          // パス区切り文字を統一して比較
          const normalizedDir = dir.replace(/\\/g, '/')
          const normalizedTargetFolder = targetFolder.replace(/\\/g, '/')
          return normalizedDir === normalizedTargetFolder
        })
        setFilteredNotes(filtered)
        setFolderFilteredNotes(filtered)

        // 移動後のノートを選択
        const movedNote = notes.find(n => n.filePath === newFilePath)
        if (movedNote) {
          await onSelectNote(movedNote)
        }
      }
    } catch (error) {
      console.error('Failed to move note:', error)
    }
  }

  // ノート削除（実際の削除処理。確認ダイアログの表示制御は呼び出し側が担当する）
  const onDeleteNote = async (note: MarkdownNoteMeta) => {
    if (!settings.rootDir) return

    try {
      const success = await App.markdown.deleteNote(note.filePath)
      if (success) {
        // ノートに紐づく画像を削除
        const noteBaseName =
          note.filePath.replace(/\.md$/i, '').split(/[/\\]/).pop() || ''
        if (noteBaseName) {
          App.image
            .deleteNoteImages(settings.rootDir, noteBaseName)
            .catch((err: unknown) =>
              console.error('Failed to delete note images:', err)
            )
        }
        // 削除されたノートが選択中の場合はクリア
        if (selectedNote?.filePath === note.filePath) {
          setSelectedNote(null)
          setNoteContent('')
        }
        await loadNotes()
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  // フォルダ削除（実際の削除処理。確認ダイアログの表示制御は呼び出し側が担当する）
  const onDeleteFolder = async (folderPath: string) => {
    if (!settings.rootDir) return

    try {
      const success = await App.markdown.deleteFolder(
        settings.rootDir,
        folderPath
      )
      if (success) {
        // 削除されたフォルダが選択中の場合はルートに戻す
        if (
          selectedFolder === folderPath ||
          selectedFolder.startsWith(`${folderPath}/`) ||
          selectedFolder.startsWith(`${folderPath}\\`)
        ) {
          setSelectedFolder('')
        }
        // 削除されたフォルダ内のノートが選択中の場合はクリア
        if (
          selectedNote &&
          (selectedNote.relativePath.startsWith(`${folderPath}/`) ||
            selectedNote.relativePath.startsWith(`${folderPath}\\`))
        ) {
          setSelectedNote(null)
          setNoteContent('')
        }
        await loadNotes()
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const onSaveErrorDismiss = () => {
    setSaveError(null)
  }

  return {
    isLoading,
    showRootDialog,
    folderTree,
    allNotes,
    filteredNotes,
    folderFilteredNotes,
    selectedFolder,
    selectedTag,
    selectedNote,
    noteContent,
    isSaving,
    saveError,
    showSidebar,
    showNoteList,
    isNoteTransitioning,
    showAllNotes,
    onRootFolderSelect,
    onChangeRootFolder,
    onShowAllNotes,
    onSelectFolder,
    onSelectTag,
    onSelectNote,
    onContentChange,
    onCreateNote,
    onCreateFolder,
    onDeleteNote,
    onDeleteFolder,
    onMetadataChange,
    onNoteMove,
    onToggleSidebar,
    onToggleNoteList,
    onSaveErrorDismiss,
    onLayoutModeChange,
  }
}
