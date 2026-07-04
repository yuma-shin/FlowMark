import { cloneElement, isValidElement, type ReactElement } from 'react'
import type React from 'react'
import {
  useFloating,
  useInteractions,
  useClick,
  useDismiss,
  useRole,
  offset,
  flip,
  shift,
  autoUpdate,
  FloatingPortal,
  FloatingFocusManager,
} from '@floating-ui/react'
import { cn } from 'renderer/lib/utils'

export interface PopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactElement
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
  className?: string
  children?: React.ReactNode
}

export function Popover({
  open,
  onOpenChange,
  trigger,
  placement = 'bottom-start',
  className,
  children,
}: PopoverProps) {
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange,
    placement,
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)
  const role = useRole(context)

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ])

  const setMergedReference = (node: HTMLElement | null) => {
    refs.setReference(node)

    if (!isValidElement(trigger)) return
    const childRef = (trigger.props as any).ref
    if (typeof childRef === 'function') {
      childRef(node)
    } else if (childRef && typeof childRef === 'object') {
      childRef.current = node
    }
  }

  const mergedTrigger = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<any>, {
        ...getReferenceProps(trigger.props as React.HTMLProps<Element>),
        ref: setMergedReference,
      })
    : trigger

  return (
    <>
      {mergedTrigger}
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className={cn(
                'z-50 rounded-lg border border-border bg-popover text-popover-foreground outline-none',
                className
              )}
              data-slot="popover-content"
            >
              {children}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  )
}
