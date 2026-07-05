import { useCallback, useEffect, useRef, useState } from 'react'
import { LuTriangleAlert, LuFolder, LuPlus, LuX } from 'react-icons/lu'
import { useTranslation } from 'react-i18next'
import { cn } from '@/renderer/lib/utils'

export interface RootFolderTab {
  path: string
  name: string
  status: 'ok' | 'missing'
}

export interface RootFolderTabBarProps {
  tabs: RootFolderTab[]
  activePath: string | undefined
  onSelect: (path: string) => void
  onClose: (path: string) => void
  onAdd: () => void
  onReorder: (sourcePath: string, targetPath: string) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function RootFolderTabBar({
  tabs,
  activePath,
  onSelect,
  onClose,
  onAdd,
  onReorder,
}: RootFolderTabBarProps) {
  const { t } = useTranslation()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const scrollLeftRef = useRef(0)
  const [draggingPath, setDraggingPath] = useState<string | null>(null)
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)

  // VS Codeのタブバーと同様、ブラウザのネイティブスクロール(overflow-x-auto +
  // scrollLeft)には依存しない。ネイティブスクロールに任せると、トラックパッドの
  // 慣性/rubber-bandスクロールとJSによるscrollLeft操作が競合し、スクロールが
  // 不安定になる(1回目は効くが以降効かなくなる等)。ここではスクロール位置を
  // JS側で完全に管理し、コンテンツをtransform: translateXで動かす。
  const applyScroll = useCallback((rawValue: number) => {
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return

    const viewportWidth = viewport.clientWidth
    const contentWidth = content.scrollWidth
    const maxScroll = Math.max(0, contentWidth - viewportWidth)
    const clamped = clamp(rawValue, 0, maxScroll)

    scrollLeftRef.current = clamped
    content.style.transform = `translateX(${-clamped}px)`

    const thumbEl = thumbRef.current
    if (!thumbEl) return

    const hasOverflow = contentWidth > viewportWidth
    if (!hasOverflow) {
      thumbEl.style.display = 'none'
      return
    }
    const thumbWidth = (viewportWidth / contentWidth) * viewportWidth
    const maxThumbLeft = viewportWidth - thumbWidth
    const thumbLeft = maxScroll > 0 ? (clamped / maxScroll) * maxThumbLeft : 0
    thumbEl.style.display = ''
    thumbEl.style.width = `${thumbWidth}px`
    thumbEl.style.left = `${thumbLeft}px`
  }, [])

  useEffect(() => {
    applyScroll(scrollLeftRef.current)
    if (typeof ResizeObserver === 'undefined') return
    const resizeObserver = new ResizeObserver(() =>
      applyScroll(scrollLeftRef.current)
    )
    if (viewportRef.current) resizeObserver.observe(viewportRef.current)
    if (contentRef.current) resizeObserver.observe(contentRef.current)
    return () => resizeObserver.disconnect()
  }, [applyScroll, tabs.length])

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const handleWheelNative = (e: WheelEvent) => {
      const viewport = viewportRef.current
      const content = contentRef.current
      if (!viewport || !content) return
      if (content.scrollWidth <= viewport.clientWidth) return
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (delta === 0) return
      // 非passiveリスナーなのでpreventDefaultが有効に働き、親へのスクロール
      // チェイニングを止められる(JSXのonWheelはpassive登録のため効かない)。
      e.preventDefault()
      applyScroll(scrollLeftRef.current + delta)
    }

    wrapper.addEventListener('wheel', handleWheelNative, { passive: false })
    return () => wrapper.removeEventListener('wheel', handleWheelNative)
  }, [applyScroll])

  const handleThumbMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return
    const startX = e.clientX
    const startScrollLeft = scrollLeftRef.current
    const viewportWidth = viewport.clientWidth
    const contentWidth = content.scrollWidth
    const scrollRatio = viewportWidth > 0 ? contentWidth / viewportWidth : 1

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      applyScroll(startScrollLeft + deltaX * scrollRatio)
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleTabDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    path: string
  ) => {
    setDraggingPath(path)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', path)
  }

  const handleTabDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    path: string
  ) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (path !== draggingPath) {
      setDragOverPath(path)
    }
  }

  const handleTabDragLeave = (path: string) => {
    setDragOverPath(prev => (prev === path ? null : prev))
  }

  const handleTabDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetPath: string
  ) => {
    e.preventDefault()
    const sourcePath = e.dataTransfer.getData('text/plain') || draggingPath
    if (sourcePath && sourcePath !== targetPath) {
      onReorder(sourcePath, targetPath)
    }
    setDraggingPath(null)
    setDragOverPath(null)
  }

  const handleTabDragEnd = () => {
    setDraggingPath(null)
    setDragOverPath(null)
  }

  return (
    <div
      className="group/tabs no-drag relative h-full flex items-center gap-1 min-w-0"
      ref={wrapperRef}
    >
      <div
        className="flex items-center h-7 min-w-0 flex-1 overflow-hidden"
        data-testid="tab-scroll-viewport"
        ref={viewportRef}
      >
        <div
          className="flex items-center gap-1"
          ref={contentRef}
          role="tablist"
        >
          {tabs.map(tab => {
            const isActive = tab.path === activePath
            return (
              <div
                aria-selected={isActive}
                className={cn(
                  'group flex items-center gap-1.5 h-7 px-2 rounded-md text-sm cursor-pointer select-none grow-0 shrink basis-40 min-w-[84px]',
                  isActive
                    ? ''
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  draggingPath === tab.path && 'opacity-40',
                  dragOverPath === tab.path &&
                    draggingPath !== tab.path &&
                    'bg-accent/60'
                )}
                data-status={tab.status}
                draggable
                key={tab.path}
                onClick={() => onSelect(tab.path)}
                onDragEnd={handleTabDragEnd}
                onDragLeave={() => handleTabDragLeave(tab.path)}
                onDragOver={e => handleTabDragOver(e, tab.path)}
                onDragStart={e => handleTabDragStart(e, tab.path)}
                onDrop={e => handleTabDrop(e, tab.path)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(tab.path)
                  }
                }}
                role="tab"
                style={
                  isActive
                    ? {
                        color: 'var(--theme-accent)',
                        backgroundColor: 'var(--theme-accent-subtle)',
                      }
                    : undefined
                }
                tabIndex={0}
                title={
                  tab.status === 'missing'
                    ? t('titleBar.rootFolderMissing')
                    : tab.name
                }
              >
                {tab.status === 'missing' ? (
                  <LuTriangleAlert className="text-amber-500" size={12} />
                ) : (
                  <LuFolder size={12} />
                )}
                <span className="flex-1 truncate min-w-0">{tab.name}</span>
                <button
                  aria-label={`${t('titleBar.closeRootFolder')} ${tab.name}`}
                  className="opacity-0 group-hover:opacity-100 rounded hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
                  draggable={false}
                  onClick={e => {
                    e.stopPropagation()
                    onClose(tab.path)
                  }}
                  type="button"
                >
                  <LuX size={12} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="no-drag absolute bottom-0 h-[3px] rounded-full bg-foreground/30 opacity-0 transition-all duration-150 cursor-pointer group-hover/tabs:opacity-100 hover:h-[5px] hover:bg-foreground/60"
        data-testid="tab-scrollbar-thumb"
        onMouseDown={handleThumbMouseDown}
        ref={thumbRef}
        style={{ display: 'none', left: 0, width: 0 }}
      />
      <button
        aria-label={t('titleBar.addRootFolder')}
        className="flex items-center justify-center h-7 w-7 rounded-md flex-shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground"
        onClick={onAdd}
        type="button"
      >
        <LuPlus size={14} />
      </button>
    </div>
  )
}
