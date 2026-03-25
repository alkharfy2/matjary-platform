import { FacebookPixelScript } from './facebook-pixel-script'
import { TikTokPixelScript } from './tiktok-pixel-script'
import { GoogleAnalyticsScript } from './google-analytics-script'

type TrackingScriptsProps = {
  facebookPixelId?: string | null
  tiktokPixelId?: string | null
  googleAnalyticsId?: string | null
}

/**
 * مكون يجمع كل سكربتات التتبع — يُحقن في store/layout.tsx
 * يعرض فقط السكربتات اللي التاجر فعّلها (حطّ ID)
 */
export function TrackingScripts({
  facebookPixelId,
  tiktokPixelId,
  googleAnalyticsId,
}: TrackingScriptsProps) {
  return (
    <>
      {facebookPixelId && <FacebookPixelScript pixelId={facebookPixelId} />}
      {tiktokPixelId && <TikTokPixelScript pixelId={tiktokPixelId} />}
      {googleAnalyticsId && <GoogleAnalyticsScript measurementId={googleAnalyticsId} />}
    </>
  )
}
