import { useEffect, useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { tauriApi as App } from '@/renderer/lib/tauriApi'
import type { RootFolderEntry } from '@/shared/types'

export interface UseRootFoldersResult {
  rootFolders: RootFolderEntry[]
  activeRootFolder: RootFolderEntry | undefined
  rootStatus: Record<string, 'ok' | 'missing'>
  addRootFolder: (path: string) => void
  removeRootFolder: (path: string) => void
  setActiveRootFolder: (path: string) => void
  reorderRootFolders: (sourcePath: string, targetPath: string) => void
  updateRootMeta: (
    path: string,
    meta: Partial<
      Pick<RootFolderEntry, 'lastSelectedFolder' | 'lastOpenedNotePath'>
    >
  ) => void
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
}

export function useRootFolders(): UseRootFoldersResult {
  const { settings, updateSettings } = useApp()
  const rootFolders = settings.rootFolders
  const [rootStatus, setRootStatus] = useState<
    Record<string, 'ok' | 'missing'>
  >({})

  const pathsKey = rootFolders.map(f => f.path).join('|')

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      const entries = await Promise.all(
        rootFolders.map(async folder => {
          try {
            const exists = await App.markdown.checkRootExists(folder.path)
            return [folder.path, exists ? 'ok' : 'missing'] as const
          } catch {
            return [folder.path, 'missing'] as const
          }
        })
      )
      if (!cancelled) {
        setRootStatus(Object.fromEntries(entries))
      }
    }

    if (rootFolders.length > 0) {
      check()
    } else {
      setRootStatus({})
    }

    return () => {
      cancelled = true
    }
  }, [pathsKey])

  const activeRootFolder = rootFolders.find(
    f => f.path === settings.activeRootFolder
  )

  const addRootFolder = (path: string) => {
    const normalized = normalizePath(path)
    const existing = rootFolders.find(f => normalizePath(f.path) === normalized)
    if (existing) {
      updateSettings({ activeRootFolder: existing.path })
      return
    }
    const newEntry: RootFolderEntry = { path }
    updateSettings({
      rootFolders: [...rootFolders, newEntry],
      activeRootFolder: path,
    })
  }

  const removeRootFolder = (path: string) => {
    const index = rootFolders.findIndex(f => f.path === path)
    if (index === -1) return

    const newList = rootFolders.filter(f => f.path !== path)
    let newActive = settings.activeRootFolder
    if (settings.activeRootFolder === path) {
      const adjacent = newList[index] ?? newList[index - 1]
      newActive = adjacent?.path
    }
    updateSettings({ rootFolders: newList, activeRootFolder: newActive })
  }

  const setActiveRootFolder = (path: string) => {
    updateSettings({ activeRootFolder: path })
  }

  // ドラッグしたタブ(sourcePath)を、ドロップ先タブ(targetPath)の直前に移動する
  const reorderRootFolders = (sourcePath: string, targetPath: string) => {
    if (sourcePath === targetPath) return
    const sourceIndex = rootFolders.findIndex(f => f.path === sourcePath)
    const targetIndex = rootFolders.findIndex(f => f.path === targetPath)
    if (sourceIndex === -1 || targetIndex === -1) return

    const newList = [...rootFolders]
    const [moved] = newList.splice(sourceIndex, 1)
    const insertIndex =
      sourceIndex < targetIndex ? targetIndex - 1 : targetIndex
    newList.splice(insertIndex, 0, moved)
    updateSettings({ rootFolders: newList })
  }

  const updateRootMeta = (
    path: string,
    meta: Partial<
      Pick<RootFolderEntry, 'lastSelectedFolder' | 'lastOpenedNotePath'>
    >
  ) => {
    const newList = rootFolders.map(f =>
      f.path === path ? { ...f, ...meta } : f
    )
    updateSettings({ rootFolders: newList })
  }

  return {
    rootFolders,
    activeRootFolder,
    rootStatus,
    addRootFolder,
    removeRootFolder,
    setActiveRootFolder,
    reorderRootFolders,
    updateRootMeta,
  }
}
