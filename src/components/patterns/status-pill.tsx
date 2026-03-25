import { Badge } from '@/components/ui/badge'
import type { StatusTone } from '@/lib/ui/types'

type StatusPillProps = {
  label: string
  tone?: StatusTone
}

export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  return <Badge tone={tone} className="backdrop-blur">{label}</Badge>
}
