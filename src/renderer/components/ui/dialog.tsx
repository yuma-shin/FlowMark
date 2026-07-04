import type React from 'react'
import {
  useFloating,
  useInteractions,
  useDismiss,
  useRole,
  useId,
  useTransitionStatus,
  FloatingPortal,
  FloatingFocusManager,
  FloatingOverlay,
} from '@floating-ui/react'
import { cn } from 'renderer/lib/utils'

const TRANSITION_DURATION_MS = 150

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  className?: string
  children?: React.ReactNode
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  className,
  children,
}: DialogProps) {
  const { refs, context } = useFloating({
    open,
    onOpenChange,
  })

  const { isMounted, status } = useTransitionStatus(context, {
    duration: TRANSITION_DURATION_MS,
  })

  const dismiss = useDismiss(context, { outsidePressEvent: 'mousedown' })
  const role = useRole(context)
  const { getFloatingProps } = useInteractions([dismiss, role])

  const titleId = useId()
  const descriptionId = useId()

  if (!isMounted) return null

  const isOpenState = status === 'open'

  return (
    <FloatingPortal>
      <FloatingOverlay
        className={cn(
          'z-50 flex items-center justify-center bg-black/40 transition-opacity',
          isOpenState ? 'opacity-100' : 'opacity-0'
        )}
        lockScroll
        style={{ transitionDuration: `${TRANSITION_DURATION_MS}ms` }}
      >
        <FloatingFocusManager context={context}>
          <div
            aria-describedby={description ? descriptionId : undefined}
            aria-labelledby={titleId}
            aria-modal="true"
            className={cn(
              'w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground outline-none transition-all',
              isOpenState ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
              className
            )}
            data-slot="dialog-content"
            data-status={status}
            ref={refs.setFloating}
            role="dialog"
            style={{
              boxShadow: 'var(--elevation-lg)',
              transitionDuration: `${TRANSITION_DURATION_MS}ms`,
            }}
            {...getFloatingProps()}
          >
            <h2 className="text-heading-sm mb-1" id={titleId}>
              {title}
            </h2>
            {description && (
              <p
                className="text-caption text-muted-foreground mb-4"
                id={descriptionId}
              >
                {description}
              </p>
            )}
            {children}
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  )
}
