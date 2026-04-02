/**
 * Server component: renders a mount div + inline script for the Compare Float bar.
 * Must be placed inside each store page.tsx (NOT layout.tsx) because
 * dangerouslySetInnerHTML scripts in RSC-streamed layouts don't execute.
 */
export function CompareFloatScript({ storeSlug }: { storeSlug: string }) {
  const script = `
(function(){
  var KEY='matjary-compare',SLUG=${JSON.stringify(storeSlug)};
  function items(){try{var r=localStorage.getItem(KEY);if(!r)return[];var p=JSON.parse(r);return(p.state&&p.state.items)||[]}catch(e){return[]}}
  function clear(){try{var r=localStorage.getItem(KEY);if(r){var p=JSON.parse(r);p.state.items=[];localStorage.setItem(KEY,JSON.stringify(p))}}catch(e){}render()}
  var m=document.getElementById('compare-float-mount');
  if(!m)return;
  function render(){
    var it=items();
    if(!it.length){m.innerHTML='';return}
    var h='/store/compare?store='+encodeURIComponent(SLUG);
    m.innerHTML='<div style="position:fixed;bottom:80px;inset-inline-start:16px;z-index:50;display:flex;align-items:center;gap:12px;border-radius:16px;border:1px solid var(--ds-divider,#e5e7eb);background:var(--surface-card,#fff);padding:12px 16px;box-shadow:0 4px 12px rgba(0,0,0,.1)">'
      +'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary,#000)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/></svg>'
      +'<span style="font-size:14px;font-weight:600;color:var(--ds-text,#1f2937)">'+it.length+' \\u0645\\u0646\\u062a\\u062c \\u0644\\u0644\\u0645\\u0642\\u0627\\u0631\\u0646\\u0629</span>'
      +'<a href="'+h+'" style="border-radius:9999px;padding:6px 16px;font-size:12px;font-weight:700;color:#fff;background:var(--color-primary,#111827);text-decoration:none">\\u0642\\u0627\\u0631\\u0646 \\u0627\\u0644\\u0622\\u0646</a>'
      +'<button id="cmp-clr" style="border-radius:9999px;padding:4px;color:var(--ds-text-muted,#6b7280);background:none;border:none;cursor:pointer" aria-label="\\u0645\\u0633\\u062d \\u0627\\u0644\\u0645\\u0642\\u0627\\u0631\\u0646\\u0629"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>'
      +'</div>';
    var b=document.getElementById('cmp-clr');if(b)b.onclick=clear;
  }
  render();
  window.addEventListener('storage',function(e){if(e.key===KEY)render()});
  var last=items().length;
  setInterval(function(){var c=items().length;if(c!==last){last=c;render()}},500);
})();
`

  return (
    <>
      <div id="compare-float-mount" />
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </>
  )
}

/**
 * Server component: exit intent popup script.
 */
export function ExitIntentScript({
  storeId,
  enabled,
  message,
  couponCode,
}: {
  storeId: string
  enabled: boolean
  message: string
  couponCode: string
}) {
  if (!enabled) return null

  const script = `
(function(){
  var ID=${JSON.stringify(storeId)},MSG=${JSON.stringify(message)},CPN=${JSON.stringify(couponCode)};
  var KEY='exit_intent_'+ID;
  if(sessionStorage.getItem(KEY))return;
  document.addEventListener('mouseleave',function h(e){
    if(e.clientY>0)return;
    sessionStorage.setItem(KEY,'1');
    document.removeEventListener('mouseleave',h);
    var o=document.createElement('div');
    o.className='exit-overlay';
    o.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);padding:16px';
    var b='<div style="position:relative;width:100%;max-width:384px;border-radius:16px;background:#fff;padding:24px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,.25)">';
    b+='<button class="ec" style="position:absolute;left:12px;top:12px;border-radius:9999px;padding:4px;color:#9ca3af;background:none;border:none;cursor:pointer">\\u2715</button>';
    b+='<div style="margin-bottom:16px;font-size:2rem">\\ud83c\\udf81</div>';
    b+='<p style="font-size:18px;font-weight:700;color:#1f2937">'+MSG+'</p>';
    if(CPN){b+='<div style="margin-top:16px"><p style="margin-bottom:8px;font-size:14px;color:#6b7280">\\u0627\\u0633\\u062a\\u062e\\u062f\\u0645 \\u0643\\u0648\\u062f \\u0627\\u0644\\u062e\\u0635\\u0645:</p><button class="ecp" style="display:inline-flex;align-items:center;gap:8px;border-radius:8px;border:2px dashed #fbbf24;background:#fffbeb;padding:12px 24px;font-family:monospace;font-size:18px;font-weight:700;color:#92400e;cursor:pointer">'+CPN+' <span style="font-size:14px;font-weight:400">\\ud83d\\udccb \\u0646\\u0633\\u062e</span></button></div>';}
    b+='<button class="ed" style="margin-top:20px;width:100%;border-radius:8px;background:#f3f4f6;padding:10px 16px;font-size:14px;font-weight:500;color:#4b5563;border:none;cursor:pointer">\\u0645\\u062a\\u0627\\u0628\\u0639\\u0629 \\u0627\\u0644\\u062a\\u0633\\u0648\\u0642</button>';
    b+='</div>';
    o.innerHTML=b;document.body.appendChild(o);
    o.querySelector('.ec').onclick=function(){o.remove()};
    o.querySelector('.ed').onclick=function(){o.remove()};
    var cp=o.querySelector('.ecp');
    if(cp)cp.onclick=function(){navigator.clipboard.writeText(CPN);var s=this.querySelector('span');if(s)s.textContent='\\u2705 \\u062a\\u0645 \\u0627\\u0644\\u0646\\u0633\\u062e'};
  });
})();
`

  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
