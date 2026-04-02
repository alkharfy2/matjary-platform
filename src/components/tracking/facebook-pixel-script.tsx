'use client'

/**
 * Facebook Pixel Base Code Script
 *
 * يُحقن في store/layout.tsx لو التاجر حاطط Pixel ID.
 * يُحمّل الـ fbevents.js ويعمل init + أول PageView.
 */

import { useEffect } from 'react'
import Script from 'next/script'

type FacebookPixelScriptProps = {
  pixelId: string
}

export function FacebookPixelScript({ pixelId }: FacebookPixelScriptProps) {
  const safeId = pixelId.replace(/[^a-zA-Z0-9_-]/g, '')

  useEffect(() => {
    if (safeId && typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView')
    }
  }, [safeId])

  if (!safeId) return null

  return (
    <>
      <Script
        id="facebook-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${safeId}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${safeId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}
