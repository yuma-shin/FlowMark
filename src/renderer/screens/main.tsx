import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../contexts/AppContext'
import { CustomTitleBar } from '../components/CustomTitleBar'
import { WelcomeScreen } from '../components/WelcomeScreen'
import { CreateNoteDialog } from '../components/CreateNoteDialog'
import { CreateFolderDialog } from '../components/CreateFolderDialog'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { AppShell } from '../components/AppShell'
import { useNoteWorkspace } from '../hooks/useNoteWorkspace'
import type { MarkdownNoteMeta } from '@/shared/types'

export function MainScreen() {
  const { t } = useTranslation()
  const { settings, updateSettings, isLoading: settingsLoading } = useApp()
  const workspace = useNoteWorkspace()
  const [showCreateNoteDialog, setShowCreateNoteDialog] = useState(false)
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'note' | 'folder'
    data: any
  } | null>(null)

  // ノート削除の確認
  const handleDeleteNoteConfirm = (note: MarkdownNoteMeta) => {
    setDeleteTarget({ type: 'note', data: note })
    setShowDeleteConfirm(true)
  }

  // フォルダ削除の確認
  const handleDeleteFolderConfirm = (folderPath: string) => {
    setDeleteTarget({ type: 'folder', data: folderPath })
    setShowDeleteConfirm(true)
  }

  // 削除実行
  // 削除処理（IPC呼び出し＋一覧再読込）の完了を待たず、ダイアログは
  // ユーザー操作に対して即座に閉じる。削除自体はバックグラウンドで継続する。
  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    const target = deleteTarget

    setShowDeleteConfirm(false)
    setDeleteTarget(null)

    if (target.type === 'note') {
      void workspace.onDeleteNote(target.data as MarkdownNoteMeta)
    } else {
      void workspace.onDeleteFolder(target.data as string)
    }
  }

  if (workspace.isLoading || settingsLoading) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        <CustomTitleBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center gap-6">
            {/* Notyra Logo with pulse animation */}
            <div className="relative flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-2xl blur-xl opacity-50 animate-pulse"
                style={{
                  background:
                    'linear-gradient(to bottom right, var(--theme-gradient-from), var(--theme-gradient-to))',
                }}
              ></div>
              <svg
                className="relative drop-shadow-2xl"
                height="80"
                viewBox="0 0 24 24"
                width="80"
              >
                <defs>
                  <linearGradient
                    id="logoGradient"
                    x1="0%"
                    x2="100%"
                    y1="0%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      style={{ stopColor: 'var(--theme-gradient-from)' }}
                    />
                    <stop
                      offset="100%"
                      style={{ stopColor: 'var(--theme-gradient-to)' }}
                    />
                  </linearGradient>
                </defs>
                <path
                  d="M6 2h12l6 6v14a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
                  fill="url(#logoGradient)"
                />
                <line
                  stroke="white"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                  x1="8"
                  x2="16"
                  y1="10"
                  y2="10"
                />
                <line
                  stroke="white"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                  x1="8"
                  x2="16"
                  y1="14"
                  y2="14"
                />
                <circle cx="8" cy="18" fill="white" r="1" />
                <circle cx="12" cy="18" fill="white" r="1" />
                <circle cx="16" cy="18" fill="white" r="1" />
              </svg>
            </div>

            {/* Spinning loader */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
              <div
                className="absolute inset-0 border-4 border-transparent rounded-full animate-spin"
                style={{ borderTopColor: 'var(--theme-accent)' }}
              ></div>
            </div>

            {/* Loading text */}
            <div className="flex flex-col items-center justify-center gap-2">
              <h2
                className="text-xl font-semibold bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, var(--theme-gradient-from), var(--theme-gradient-to))',
                }}
              >
                Notyra
              </h2>
              <p className="text-sm text-muted-foreground animate-pulse">
                読み込み中...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!settings.rootDir || workspace.showRootDialog) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <CustomTitleBar />
        <WelcomeScreen onSelect={workspace.onRootFolderSelect} />
      </div>
    )
  }

  return (
    <>
      <AppShell
        onChangeRootFolder={workspace.onChangeRootFolder}
        onCreateFolder={() => setShowCreateFolderDialog(true)}
        onCreateNote={() => setShowCreateNoteDialog(true)}
        onDeleteFolder={handleDeleteFolderConfirm}
        onDeleteNote={handleDeleteNoteConfirm}
        onNoteListWidthCommit={width =>
          updateSettings({ noteListWidth: width })
        }
        onSidebarWidthCommit={width => updateSettings({ sidebarWidth: width })}
        settings={settings}
        workspace={workspace}
      />

      {/* ダイアログ */}
      <CreateNoteDialog
        isOpen={showCreateNoteDialog}
        onClose={() => setShowCreateNoteDialog(false)}
        onSubmit={workspace.onCreateNote}
      />
      <CreateFolderDialog
        currentPath={workspace.selectedFolder || t('metadata.root')}
        isOpen={showCreateFolderDialog}
        onClose={() => setShowCreateFolderDialog(false)}
        onSubmit={workspace.onCreateFolder}
      />
      <ConfirmDialog
        confirmText={t('common.delete')}
        isDanger={true}
        isOpen={showDeleteConfirm}
        message={
          deleteTarget?.type === 'note'
            ? `「${(deleteTarget.data as MarkdownNoteMeta).title}」${t('dialog.deleteNoteMessage')}`
            : `「${deleteTarget?.data}」${t('dialog.deleteFolderMessage')}`
        }
        onCancel={() => {
          setShowDeleteConfirm(false)
          setDeleteTarget(null)
        }}
        onConfirm={handleDeleteConfirm}
        title={
          deleteTarget?.type === 'note'
            ? t('dialog.deleteNote')
            : t('dialog.deleteFolder')
        }
      />
    </>
  )
}
