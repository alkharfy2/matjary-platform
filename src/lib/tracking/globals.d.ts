/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Global Window interface augmentation for third-party tracking pixels.
 * These properties are injected by external scripts (Facebook Pixel, TikTok, GA4).
 */
declare global {
  interface Window {
    fbq: ((...args: any[]) => void) | undefined
    ttq: Record<string, (...args: any[]) => void> | undefined
    gtag: ((...args: any[]) => void) | undefined
  }
}

export {}
