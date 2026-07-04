import type React from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from './ui/dialog'
import { Button } from './ui/button'

interface CreateFolderDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (folderName: string) => void
  currentPath: string
}

export function CreateFolderDialog({
  isOpen,
  onClose,
  onSubmit,
  currentPath,
}: CreateFolderDialogProps) {
  const { t } = useTranslation()
  const [folderName, setFolderName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (folderName.trim()) {
      onSubmit(folderName.trim())
      setFolderName('')
      onClose()
    }
  }

  return (
    <Dialog
      onOpenChange={open => {
        if (!open) onClose()
      }}
      open={isOpen}
      title={t('dialog.createFolder')}
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <p className="block text-sm font-medium mb-2">
            {t('dialog.location')}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {currentPath || t('metadata.root')}
          </p>
        </div>
        <div className="mb-4">
          <input
            aria-label={t('dialog.folderName')}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2"
            id="folder-name"
            onChange={e => setFolderName(e.target.value)}
            placeholder={t('dialog.folderName')}
            style={
              {
                '--tw-ring-color': 'var(--theme-accent)',
              } as React.CSSProperties
            }
            type="text"
            value={folderName}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button onClick={onClose} type="button" variant="secondary">
            {t('common.cancel')}
          </Button>
          <Button disabled={!folderName.trim()} type="submit">
            {t('common.create')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
