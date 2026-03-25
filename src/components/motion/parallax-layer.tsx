'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type ParallaxLayerProps = {
  children: ReactNode
  className?: string
  speed?: number
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function ParallaxLayer({
  children,
  className,
  speed = 0.12,
}: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion()) return

    function updateOffset() {
      const node = ref.current
      if (!node) return

      const rect = node.getBoundingClientRect()
      const viewportCenter = window.innerHeight / 2
      const delta = rect.top + rect.height / 2 - viewportCenter
      setOffset(delta * speed * -1)
    }

    let frame = 0

    function onScroll() {
      cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(updateOffset)
    }

    updateOffset()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [speed])

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{ transform: `translate3d(0, ${offset}px, 0)` } as CSSProperties}
    >
      {children}
    </div>
  )
}
