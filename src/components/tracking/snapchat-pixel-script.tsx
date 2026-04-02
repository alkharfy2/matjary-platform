'use client'

import Script from 'next/script'

type SnapchatPixelScriptProps = {
  pixelId: string
}

export function SnapchatPixelScript({ pixelId }: SnapchatPixelScriptProps) {
  const safeId = pixelId.replace(/[^a-zA-Z0-9_-]/g, '')
  if (!safeId) return null

  return (
    <Script
      id="snapchat-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
          {a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
          a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;
          r.src=n;var u=t.getElementsByTagName(s)[0];
          u.parentNode.insertBefore(r,u);})(window,document,
          'https://sc-static.net/scevent.min.js');
          snaptr('init', '${safeId}', {});
          snaptr('track', 'PAGE_VIEW');
        `,
      }}
    />
  )
}
