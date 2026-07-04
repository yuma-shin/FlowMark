import { useEffect, useState } from 'react'
import {
  FiMinus,
  FiMaximize,
  FiMinimize,
  FiX,
  FiFolder,
  FiSidebar,
  FiList,
} from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useApp } from '../contexts/AppContext'
import { SimpleTooltip } from './ui/tooltip'
import { Button } from './ui/button'
import { ThemeToggle } from './ThemeToggle'
import { LanguageToggle } from './LanguageToggle'
import { ColorThemeSelector } from './ColorThemeSelector'
import { tauriApi as App } from '@/renderer/lib/tauriApi'

interface CustomTitleBarProps {
  onChangeRootFolder?: () => void
  showSidebar?: boolean
  showNoteList?: boolean
  onToggleSidebar?: () => void
  onToggleNoteList?: () => void
}

export function CustomTitleBar({
  onChangeRootFolder,
  showSidebar,
  showNoteList,
  onToggleSidebar,
  onToggleNoteList,
}: CustomTitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const { settings } = useApp()
  const { t } = useTranslation()
  const isMac =
    App.platform === 'darwin' ||
    App.platform === 'macOS' ||
    App.platform.startsWith('Mac')

  useEffect(() => {
    App.window.isMaximized().then(setIsMaximized)
  }, [])

  const handleMinimize = async () => {
    await App.window.minimize()
  }

  const handleMaximize = async () => {
    await App.window.maximize()
    const maximized = await App.window.isMaximized()
    setIsMaximized(maximized)
  }

  const handleClose = async () => {
    await App.window.close()
  }

  // ルートフォルダ名を取得
  const getRootFolderName = () => {
    if (!settings.rootDir) return ''
    const parts = settings.rootDir.split(/[\\/]/)
    return parts[parts.length - 1]
  }

  // NotyraロゴSVG
  const NotyraLogo = () => (
    <svg
      fill="none"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="notyra-gradient"
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
        className="fill-gray-200 dark:fill-white"
        d="M6 2C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2H6Z"
        fillOpacity="0.95"
      />
      <path
        className="fill-gray-200 dark:fill-white"
        d="M14 2V6C14 7.10457 14.8954 8 16 8H20"
        fillOpacity="0.7"
      />
      {/* マークダウン記号 */}
      <path
        d="M7 11H11M7 14H13M7 17H10"
        stroke="url(#notyra-gradient)"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <circle cx="15" cy="14" fill="url(#notyra-gradient)" r="1.5" />
      <circle
        cx="17"
        cy="17"
        fill="url(#notyra-gradient)"
        fillOpacity="0.6"
        r="1"
      />
    </svg>
  )

  return (
    <div className="h-11 flex items-center justify-between border-b border-border select-none relative z-50 bg-background">
      {/* ドラッグ可能な領域 */}
      <div
        className="flex-1 h-full drag-region flex items-center"
        data-tauri-drag-region
      >
        <div
          className={`flex items-center h-full gap-3 ${isMac ? 'pl-[80px] pr-4' : 'px-4'}`}
          data-tauri-drag-region
        >
          <div className="flex items-center gap-2" data-tauri-drag-region>
            <NotyraLogo />
          </div>
          {settings.rootDir && (
            <>
              <div
                className="w-px h-4 bg-border mx-0.5"
                data-tauri-drag-region
              />
              <div className="flex items-center gap-1.5">
                <FiFolder className="text-muted-foreground" size={14} />
                <span className="text-sm text-foreground font-medium">
                  {getRootFolderName()}
                </span>
                {onChangeRootFolder && (
                  <SimpleTooltip content={t('titleBar.selectFolder')}>
                    <Button
                      aria-label={t('titleBar.selectFolder')}
                      className="px-2 py-0.5 h-auto text-xs font-medium"
                      onClick={onChangeRootFolder}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor =
                          'var(--theme-accent-subtle-hover)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor =
                          'var(--theme-accent-subtle)'
                      }}
                      style={{
                        color: 'var(--theme-accent)',
                        backgroundColor: 'var(--theme-accent-subtle)',
                      }}
                      variant="ghost"
                    >
                      {t('titleBar.selectFolder')}
                    </Button>
                  </SimpleTooltip>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-0.5 mr-1.5">
        {onToggleSidebar && (
          <SimpleTooltip content={t('titleBar.toggleSidebar')}>
            <Button
              aria-label={t('titleBar.toggleSidebar')}
              onClick={onToggleSidebar}
              size="icon"
              style={{ color: showSidebar ? 'var(--theme-accent)' : undefined }}
              variant="ghost"
            >
              <FiSidebar
                className={showSidebar ? '' : 'text-muted-foreground'}
                size={16}
              />
            </Button>
          </SimpleTooltip>
        )}
        {onToggleNoteList && (
          <SimpleTooltip content={t('titleBar.toggleNoteList')}>
            <Button
              aria-label={t('titleBar.toggleNoteList')}
              onClick={onToggleNoteList}
              size="icon"
              style={{
                color: showNoteList ? 'var(--theme-accent)' : undefined,
              }}
              variant="ghost"
            >
              <FiList
                className={showNoteList ? '' : 'text-muted-foreground'}
                size={16}
              />
            </Button>
          </SimpleTooltip>
        )}
        <div className="w-px h-4 bg-border mx-0.5" />
        <ColorThemeSelector />
        <div className="scale-90">
          <ThemeToggle />
        </div>
        <LanguageToggle />
      </div>

      {/* ウィンドウ操作ボタン (Windows のみ) */}
      {!isMac && (
        <div className="flex items-center gap-0.5 mr-1.5">
          <Button
            aria-label={t('titleBar.minimize')}
            onClick={handleMinimize}
            size="icon"
            variant="ghost"
          >
            <FiMinus className="text-muted-foreground" size={16} />
          </Button>
          <Button
            aria-label={t('titleBar.maximize')}
            onClick={handleMaximize}
            size="icon"
            variant="ghost"
          >
            {isMaximized ? (
              <FiMinimize className="text-muted-foreground" size={16} />
            ) : (
              <FiMaximize className="text-muted-foreground" size={16} />
            )}
          </Button>
          <Button
            aria-label={t('titleBar.close')}
            className="hover:bg-red-500 group"
            onClick={handleClose}
            size="icon"
            variant="ghost"
          >
            <FiX
              className="text-muted-foreground group-hover:text-white"
              size={16}
            />
          </Button>
        </div>
      )}
    </div>
  )
}
