'use client'

import { Children, type ReactNode } from 'react'
import { Reveal, type RevealVariant } from './reveal'

type StaggerGroupProps = {
  children: ReactNode
  className?: string
  delay?: number
  stagger?: number
  once?: boolean
  variant?: RevealVariant
}

export function StaggerGroup({
  children,
  className,
  delay = 0,
  stagger = 90,
  once = true,
  variant = 'fade-up',
}: StaggerGroupProps) {
  return (
    <div className={className}>
      {Children.map(children, (child, index) =>
        child === null || child === undefined ? null : (
          <Reveal delay={delay + index * stagger} once={once} variant={variant}>
            {child}
          </Reveal>
        )
      )}
    </div>
  )
}
