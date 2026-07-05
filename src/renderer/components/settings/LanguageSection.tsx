import { useTranslation } from 'react-i18next'
import { LuCheck } from 'react-icons/lu'
import { useApp } from '../../contexts/AppContext'
import { cn } from '../../lib/utils'

const LANGUAGES: Array<{ value: 'en' | 'ja'; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
]

export function LanguageSection() {
  const { settings, changeLanguage } = useApp()
  const { t } = useTranslation()

  return (
    <section aria-labelledby="settings-language-heading">
      <h3 className="mb-3 text-sm font-medium" id="settings-language-heading">
        {t('settings.language')}
      </h3>
      <div aria-label={t('settings.language')} role="listbox">
        {LANGUAGES.map(({ value, label }) => {
          const isActive = settings.language === value
          return (
            <div
              aria-selected={isActive}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
              )}
              key={value}
              onClick={() => changeLanguage(value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  changeLanguage(value)
                }
              }}
              role="option"
              tabIndex={0}
            >
              <span>{label}</span>
              {isActive && <LuCheck size={16} />}
            </div>
          )
        })}
      </div>
    </section>
  )
}
