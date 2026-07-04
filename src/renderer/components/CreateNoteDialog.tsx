import type React from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from './ui/dialog'
import { Button } from './ui/button'

interface CreateNoteDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (title: string) => void
}

export function CreateNoteDialog({
  isOpen,
  onClose,
  onSubmit,
}: CreateNoteDialogProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      onSubmit(title.trim())
      setTitle('')
      onClose()
    }
  }

  return (
    <Dialog
      onOpenChange={open => {
        if (!open) onClose()
      }}
      open={isOpen}
      title={t('dialog.createNote')}
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            aria-label={t('dialog.noteName')}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2"
            id="note-title"
            onChange={e => setTitle(e.target.value)}
            placeholder={t('dialog.noteName')}
            style={
              {
                '--tw-ring-color': 'var(--theme-accent)',
              } as React.CSSProperties
            }
            type="text"
            value={title}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button onClick={onClose} type="button" variant="secondary">
            {t('common.cancel')}
          </Button>
          <Button disabled={!title.trim()} type="submit">
            {t('common.create')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
