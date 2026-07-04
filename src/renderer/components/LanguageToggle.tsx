import { useTranslation } from 'react-i18next'
import { FiGlobe } from 'react-icons/fi'
import { useApp } from '../contexts/AppContext'
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
          <FiGlobe size={16} />
        </Button>
      }
      value={settings.language}
    />
  )
}
