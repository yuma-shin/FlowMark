import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiFolder, FiZap, FiFileText, FiHeart } from 'react-icons/fi'
import { tauriApi as App } from '@/renderer/lib/tauriApi'
import { Button } from './ui/button'

interface WelcomeScreenProps {
  onSelect: (path: string) => void
}

export function WelcomeScreen({ onSelect }: WelcomeScreenProps) {
  const { t } = useTranslation()
  const [isSelecting, setIsSelecting] = useState(false)

  const handleSelectFolder = async () => {
    setIsSelecting(true)
    try {
      const path = await App.markdown.selectRootFolder()
      if (path) {
        onSelect(path)
      }
    } catch (error) {
      console.error('Failed to select folder:', error)
    } finally {
      setIsSelecting(false)
    }
  }

  const features = [
    { icon: FiZap, label: t('welcome.features.speed') },
    { icon: FiFileText, label: t('welcome.features.preview') },
    { icon: FiHeart, label: t('welcome.features.ui') },
  ]

  // NotyraロゴSVG（大きめ）
  const NotyraLogo = () => (
    <svg
      fill="none"
      height="64"
      viewBox="0 0 80 80"
      width="64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="welcome-gradient"
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
      {/* 流れるようなドキュメントの形 */}
      <path
        d="M20 6C16.6863 6 14 8.68629 14 12V68C14 71.3137 16.6863 74 20 74H60C63.3137 74 66 71.3137 66 68V26L46 6H20Z"
        fill="url(#welcome-gradient)"
        opacity="0.9"
      />
      <path
        d="M46 6V20C46 23.3137 48.6863 26 52 26H66"
        fill="url(#welcome-gradient)"
        opacity="0.6"
      />
      {/* マークダウン記号 */}
      <path
        d="M24 36H38M24 46H44M24 56H34"
        stroke="white"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <circle cx="50" cy="46" fill="white" opacity="0.9" r="4" />
      <circle cx="56" cy="56" fill="white" opacity="0.7" r="3" />
    </svg>
  )

  return (
    <div className="flex-1 flex items-center justify-center overflow-auto bg-background">
      <div className="max-w-md w-full mx-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <NotyraLogo />
          </div>

          <h1 className="text-heading-lg text-foreground mb-2">
            {t('welcome.title')}
          </h1>
          <p className="text-body text-muted-foreground mb-8">
            {t('welcome.subtitle')}
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {features.map(({ icon: Icon, label }) => (
              <div
                className="rounded-lg border border-border bg-card p-4"
                key={label}
              >
                <Icon
                  className="mx-auto mb-2"
                  size={20}
                  style={{ color: 'var(--theme-accent)' }}
                />
                <p className="text-caption text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--elevation-md)]">
          <p className="text-sm text-foreground mb-4">
            {t('welcome.selectFolderText')}
          </p>
          <Button
            className="w-full"
            disabled={isSelecting}
            onClick={handleSelectFolder}
          >
            <FiFolder size={18} />
            {isSelecting
              ? t('welcome.selectButtonSelecting')
              : t('welcome.selectButtonText')}
          </Button>
          <p className="text-caption text-muted-foreground mt-3">
            {t('welcome.selectFolderHint')}
          </p>
        </div>
      </div>
    </div>
  )
}
