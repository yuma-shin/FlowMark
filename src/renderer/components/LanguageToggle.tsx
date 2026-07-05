import { useTranslation } from 'react-i18next'
import { LuGlobe } from 'react-icons/lu'
import { useApp } from '../contexts/AppContext'
import { ICON_SIZE } from '../lib/iconConstants'
import { Button } from './ui/button'
import { DropdownMenu } from './ui/dropdown-menu'

const LANGUAGES: Array<{ value: 'en' | 'ja'; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
]

export function LanguageToggle() {
  const { settings, changeLanguage } = useApp()
  const { t } = useTranslation()

  return (
    <DropdownMenu
      items={LANGUAGES}
      onChange={changeLanguage}
      trigger={
        <Button aria-label={t('common.language')} size="icon" variant="ghost">
          <LuGlobe size={ICON_SIZE.TITLEBAR} />
        </Button>
      }
      value={settings.language}
    />
  )
}
