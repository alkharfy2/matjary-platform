'use client'

/**
 * Order Notification Listener
 * 
 * يُحقن في layout الداشبورد.
 * يعمل polling كل 30 ثانية لعدد الطلبات الجديدة.
 * عند وصول طلب جديد:
 *   1. يشغل صوت تنبيه
 *   2. يعرض Browser Notification (لو التاجر سمح)
 *   3. يحدث عداد في الـ UI
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import Link from 'next/link'

const POLL_INTERVAL = 30_000 // 30 ثانية
const NOTIFICATION_SOUND_URL = '/sounds/new-order.mp3'

export function OrderNotificationListener() {
  const lastChecked = useRef<string>(new Date().toISOString())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [newCount, setNewCount] = useState(0)

  // طلب إذن الإشعارات عند أول تحميل
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    // تحضير الصوت
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL)
    audioRef.current.volume = 0.5
  }, [])

  const checkNewOrders = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/dashboard/notifications/new-orders?since=${encodeURIComponent(lastChecked.current)}`,
      )
      if (!res.ok) return

      const json = await res.json()
      const count = json.data?.newOrdersCount ?? 0

      if (count > 0) {
        setNewCount(prev => prev + count)

        // صوت تنبيه
        audioRef.current?.play().catch(() => {})

        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🛒 طلب جديد!', {
            body: `وصل ${count} طلب جديد`,
            icon: '/favicon.ico',
          })
        }
      }

      lastChecked.current = json.data?.checkedAt ?? new Date().toISOString()
    } catch {
      // صامت — لا نزعج التاجر بأخطاء الـ polling
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(checkNewOrders, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [checkNewOrders])

  // عرض عداد الطلبات الجديدة (لو أكتر من 0)
  if (newCount === 0) return null

  return (
    <div className="fixed top-4 end-4 z-50 animate-in fade-in slide-in-from-top-2">
      <Link
        href="/dashboard/orders"
        className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-3 text-sm font-medium text-white shadow-lg"
        onClick={() => setNewCount(0)}
      >
        🛒 {newCount} طلب جديد
      </Link>
    </div>
  )
}
