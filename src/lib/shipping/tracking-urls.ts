/**
 * روابط تتبع الشحنات لشركات الشحن المشهورة في مصر والمنطقة العربية
 */
const SHIPPING_TRACKING_URLS: Record<string, (trackingNumber: string) => string> = {
  // مصر
  'بوسطا': (tn) => `https://bosta.co/tracking-shipment/?tracking_key=${tn}`,
  'bosta': (tn) => `https://bosta.co/tracking-shipment/?tracking_key=${tn}`,
  'شيب بلو': (tn) => `https://www.shipblu.com/en/tracking/?tracking_no=${tn}`,
  'shipblu': (tn) => `https://www.shipblu.com/en/tracking/?tracking_no=${tn}`,
  'mylerz': (tn) => `https://track.mylerz.com/shipment/tracking?trackingNumbers=${tn}`,
  'ارامكس': (tn) => `https://www.aramex.com/track/results?ShipmentNumber=${tn}`,
  'aramex': (tn) => `https://www.aramex.com/track/results?ShipmentNumber=${tn}`,
  'dhl': (tn) => `https://www.dhl.com/eg-ar/home/tracking.html?tracking-id=${tn}`,
  'fedex': (tn) => `https://www.fedex.com/fedextrack/?trknbr=${tn}`,
  'j&t': (tn) => `https://www.jtexpress.eg/trajectoryQuery?billcodes=${tn}`,
  // السعودية
  'سمسا': (tn) => `https://www.smsaexpress.com/ar/trackingdetails?tracknumbers=${tn}`,
  'smsa': (tn) => `https://www.smsaexpress.com/ar/trackingdetails?tracknumbers=${tn}`,
  'ناقل': (tn) => `https://www.naqelexpress.com/en/tracking?waybill=${tn}`,
  'naqel': (tn) => `https://www.naqelexpress.com/en/tracking?waybill=${tn}`,
  'سبل': (tn) => `https://splonline.com.sa/ar/mtrack/?tracknumbers=${tn}`,
  'spl': (tn) => `https://splonline.com.sa/ar/mtrack/?tracknumbers=${tn}`,
  'زاجل': (tn) => `https://www.zajil.com/en/tracking?tracking_number=${tn}`,
  'zajil': (tn) => `https://www.zajil.com/en/tracking?tracking_number=${tn}`,
}

export function getTrackingUrl(shippingCompany: string, trackingNumber: string): string | null {
  const key = shippingCompany.trim().toLowerCase()
  const urlFn = SHIPPING_TRACKING_URLS[key]
  return urlFn ? urlFn(trackingNumber) : null
}

export function getKnownShippingCompanies(): string[] {
  return [...new Set(Object.keys(SHIPPING_TRACKING_URLS))]
}
