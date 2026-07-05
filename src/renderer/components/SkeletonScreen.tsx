import { useTranslation } from 'react-i18next'
import { CustomTitleBar } from './CustomTitleBar'
import { Skeleton } from './ui/skeleton'
import type { RootFolderTabBarProps } from './RootFolderTabBar'

const SIDEBAR_PLACEHOLDER_WIDTHS = [
  'w-3/4',
  'w-1/2',
  'w-5/6',
  'w-2/3',
  'w-1/2',
  'w-3/4',
  'w-1/3',
  'w-2/3',
  'w-1/2',
  'w-5/6',
  'w-3/4',
  'w-1/2',
  'w-2/3',
  'w-1/2',
  'w-3/4',
]
const SIDEBAR_PLACEHOLDER_ITEMS = SIDEBAR_PLACEHOLDER_WIDTHS.map(
  (width, i) => ({ key: `sidebar-placeholder-${i}`, width })
)

const NOTE_PLACEHOLDER_KEYS = Array.from(
  { length: 14 },
  (_, i) => `note-placeholder-${i}`
)

const EDITOR_PARAGRAPH_KEYS = Array.from(
  { length: 8 },
  (_, i) => `editor-paragraph-${i}`
)

export interface SkeletonScreenProps {
  tabBar: RootFolderTabBarProps
  showSidebar: boolean
  showNoteList: boolean
  sidebarWidth: number
  noteListWidth: number
}

export function SkeletonScreen({
  tabBar,
  showSidebar,
  showNoteList,
  sidebarWidth,
  noteListWidth,
}: SkeletonScreenProps) {
  const { t } = useTranslation()

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <CustomTitleBar tabBar={tabBar} />
      <div
        aria-busy="true"
        aria-label={t('common.loading')}
        className="flex-1 flex overflow-hidden"
        role="status"
      >
        {showSidebar && (
          <div
            className="p-4 flex flex-col gap-3 border-r border-border flex-shrink-0 overflow-hidden"
            data-testid="skeleton-sidebar"
            style={{ width: sidebarWidth }}
          >
            {SIDEBAR_PLACEHOLDER_ITEMS.map(item => (
              <Skeleton className={`h-4 ${item.width}`} key={item.key} />
            ))}
          </div>
        )}
        {showNoteList && (
          <div
            className="p-4 flex flex-col gap-4 border-r border-border flex-shrink-0 overflow-hidden"
            data-testid="skeleton-notelist"
            style={{ width: noteListWidth }}
          >
            {NOTE_PLACEHOLDER_KEYS.map(key => (
              <div className="flex flex-col gap-2" key={key}>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        )}
        <div
          className="flex-1 p-8 flex flex-col gap-4 overflow-hidden"
          data-testid="skeleton-editor"
        >
          <Skeleton className="h-6 w-1/3" />
          {EDITOR_PARAGRAPH_KEYS.map(key => (
            <Skeleton className="h-4 w-full" key={key} />
          ))}
        </div>
      </div>
    </div>
  )
}
