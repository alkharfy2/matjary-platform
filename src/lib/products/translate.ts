type TranslatableProduct = {
  name: string
  description?: string | null
  shortDescription?: string | null
  translations: Record<string, { name?: string; description?: string; shortDescription?: string }> | null
}

export function translateProduct<T extends TranslatableProduct>(
  product: T,
  lang: string,
): T {
  if (lang === 'ar' || !product.translations) return product

  const translation = product.translations[lang]
  if (!translation) return product

  return {
    ...product,
    name: translation.name || product.name,
    description: translation.description || product.description,
    shortDescription: translation.shortDescription || product.shortDescription,
  }
}

export function translateProducts<T extends TranslatableProduct>(
  products: T[],
  lang: string,
): T[] {
  if (lang === 'ar') return products
  return products.map((p) => translateProduct(p, lang))
}
