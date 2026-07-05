import type * as React from 'react'
import { cn } from 'renderer/lib/utils'

export function Skeleton({
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-md bg-[image:linear-gradient(90deg,var(--muted)_25%,var(--theme-accent-subtle)_50%,var(--muted)_75%)] bg-[length:200%_100%]',
        'animate-[skeleton-shimmer_1.8s_ease-in-out_infinite] motion-reduce:animate-none',
        className
      )}
      data-slot="skeleton"
      style={style}
      {...props}
    />
  )
}
