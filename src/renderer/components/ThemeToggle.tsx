import { LuSun, LuMoon, LuMonitor } from 'react-icons/lu'
import { useTranslation } from 'react-i18next'
import { useApp } from '../contexts/AppContext'
import { SimpleTooltip } from './ui/tooltip'
import { Button } from './ui/button'
import type { AppSettings } from '@/shared/types'

export function ThemeToggle() {
  const { settings, updateSettings } = useApp()
  const { t } = useTranslation()

  const cycleTheme = () => {
    const themes: AppSettings['theme'][] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(settings.theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    updateSettings({ theme: nextTheme })
  }

  const getIcon = () => {
    switch (settings.theme) {
      case 'light':
        return <LuSun size={16} />
      case 'dark':
        return <LuMoon size={16} />
      case 'system':
        return <LuMonitor size={16} />
    }
  }

  const getLabel = () => {
    switch (settings.theme) {
      case 'light':
        return t('theme.light')
      case 'dark':
        return t('theme.dark')
      case 'system':
        return t('theme.system')
    }
  }

  return (
    <SimpleTooltip content={getLabel()}>
      <Button
        aria-label={getLabel()}
        onClick={cycleTheme}
        size="icon"
        variant="ghost"
      >
        {getIcon()}
      </Button>
    </SimpleTooltip>
  )
}
