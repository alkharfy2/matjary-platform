'use client'

import Script from 'next/script'

type GoogleAnalyticsScriptProps = {
  measurementId: string
}

export function GoogleAnalyticsScript({ measurementId }: GoogleAnalyticsScriptProps) {
  const safeId = measurementId.replace(/[^a-zA-Z0-9_-]/g, '')
  if (!safeId) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${safeId}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${safeId}');
          `,
        }}
      />
    </>
  )
}
