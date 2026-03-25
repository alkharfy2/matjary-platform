import type { ReactNode } from 'react'

export type ThemeTokens = {
  colorBg: string
  colorSurface: string
  colorSurfaceMuted: string
  colorText: string
  colorTextMuted: string
  colorPrimary: string
  colorPrimaryHover: string
  colorBorder: string
  colorSuccess: string
  colorWarning: string
  colorDanger: string
  radiusSm: string
  radiusMd: string
  radiusLg: string
  shadowSm: string
  shadowMd: string
  motionFast: string
  motionBase: string
}

export type DataTableColumn<T> = {
  id: string
  header: string
  className?: string
  cellClassName?: string
  render: (row: T) => ReactNode
}

export type FilterConfig = {
  id: string
  name: string
  label: string
  type: 'text' | 'select'
  placeholder?: string
  options?: Array<{ label: string; value: string }>
}

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

export type PageSectionProps = {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}
