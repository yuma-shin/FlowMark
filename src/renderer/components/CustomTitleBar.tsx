import { useEffect, useState } from 'react'
import {
  LuMinus,
  LuMaximize,
  LuMinimize,
  LuX,
  LuPanelLeft,
  LuList,
  LuSettings,
} from 'react-icons/lu'
import { ICON_SIZE } from '@/renderer/lib/iconConstants'
import { useTranslation } from 'react-i18next'
import { SimpleTooltip } from './ui/tooltip'
import { Button } from './ui/button'
import {
  RootFolderTabBar,
  type RootFolderTabBarProps,
} from './RootFolderTabBar'
import { NavigationButtons } from './NavigationButtons'
import { tauriApi as App } from '@/renderer/lib/tauriApi'

interface CustomTitleBarProps {
  tabBar?: RootFolderTabBarProps
  showSidebar?: boolean
  showNoteList?: boolean
  onToggleSidebar?: () => void
  onToggleNoteList?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
  onGoBack?: () => void
  onGoForward?: () => void
}

export function CustomTitleBar({
  tabBar,
  showSidebar,
  showNoteList,
  onToggleSidebar,
  onToggleNoteList,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
}: CustomTitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false)
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
        className="flex-1 min-w-0 h-full drag-region flex items-center"
        data-tauri-drag-region
      >
        <div
          className={`flex items-center h-full min-w-0 gap-3 ${isMac ? 'pl-[80px] pr-4' : 'px-4'}`}
          data-tauri-drag-region
        >
          <div
            className="flex items-center gap-2 flex-shrink-0"
            data-tauri-drag-region
          >
            <NotyraLogo />
          </div>
          {onGoBack && onGoForward && (
            <NavigationButtons
              canGoBack={canGoBack ?? false}
              canGoForward={canGoForward ?? false}
              onGoBack={onGoBack}
              onGoForward={onGoForward}
            />
          )}
          {tabBar && (
            <>
              <div
                className="w-px h-4 bg-border mx-0.5 flex-shrink-0"
                data-tauri-drag-region
              />
              <div
                className="min-w-0 flex-1 h-full"
                data-testid="titlebar-tab-container"
              >
                <RootFolderTabBar {...tabBar} />
              </div>
              {/* タブ領域はホイール操作を確実に届けるためno-dragにしているため、
                    タブ数に関わらず常時ウィンドウをドラッグできる余白を別途確保する */}
              <div
                className="w-5 h-full flex-shrink-0"
                data-tauri-drag-region
                data-testid="titlebar-drag-spacer"
              />
            </>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div
        className="flex items-center gap-0.5 mr-1.5 flex-shrink-0"
        data-testid="titlebar-secondary-controls"
      >
        {onToggleSidebar && (
          <SimpleTooltip content={t('titleBar.toggleSidebar')}>
            <Button
              aria-label={t('titleBar.toggleSidebar')}
              onClick={onToggleSidebar}
              size="icon"
              style={{ color: showSidebar ? 'var(--theme-accent)' : undefined }}
              variant="ghost"
            >
              <LuPanelLeft
                className={showSidebar ? '' : 'text-muted-foreground'}
                size={ICON_SIZE.TITLEBAR}
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
              <LuList
                className={showNoteList ? '' : 'text-muted-foreground'}
                size={ICON_SIZE.TITLEBAR}
              />
            </Button>
          </SimpleTooltip>
        )}
        <div className="w-px h-4 bg-border mx-0.5" />
        <SimpleTooltip content={t('settings.title')}>
          <Button
            aria-label={t('settings.title')}
            onClick={() => {
              App.window.openSettingsWindow()
            }}
            size="icon"
            variant="ghost"
          >
            <LuSettings size={ICON_SIZE.TITLEBAR} />
          </Button>
        </SimpleTooltip>
      </div>

      {/* ウィンドウ操作ボタン (Windows のみ) */}
      {!isMac && (
        <div
          className="flex items-center gap-0.5 mr-1.5 flex-shrink-0"
          data-testid="titlebar-window-controls"
        >
          <Button
            aria-label={t('titleBar.minimize')}
            onClick={handleMinimize}
            size="icon"
            variant="ghost"
          >
            <LuMinus
              className="text-muted-foreground"
              size={ICON_SIZE.TITLEBAR}
            />
          </Button>
          <Button
            aria-label={t('titleBar.maximize')}
            onClick={handleMaximize}
            size="icon"
            variant="ghost"
          >
            {isMaximized ? (
              <LuMinimize
                className="text-muted-foreground"
                size={ICON_SIZE.TITLEBAR}
              />
            ) : (
              <LuMaximize
                className="text-muted-foreground"
                size={ICON_SIZE.TITLEBAR}
              />
            )}
          </Button>
          <Button
            aria-label={t('titleBar.close')}
            className="hover:bg-red-500 group"
            onClick={handleClose}
            size="icon"
            variant="ghost"
          >
            <LuX
              className="text-muted-foreground group-hover:text-white"
              size={ICON_SIZE.TITLEBAR}
            />
          </Button>
        </div>
      )}
    </div>
  )
}
