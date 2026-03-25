'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'

export function ForbiddenBackButton() {
  const router = useRouter()

  return (
    <Button type="button" variant="secondary" onClick={() => router.back()}>
      الرجوع
    </Button>
  )
}
