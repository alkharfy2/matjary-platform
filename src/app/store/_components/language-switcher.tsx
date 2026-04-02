'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const LANGUAGES = [
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
] as const

export function LanguageSwitcher({ supportedLanguages }: { supportedLanguages: string[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentLang = searchParams.get('lang') || 'ar'

  const availableLanguages = LANGUAGES.filter((l) => supportedLanguages.includes(l.code))

  if (availableLanguages.length <= 1) return null

  const handleChange = (lang: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (lang === 'ar') {
      params.delete('lang')
    } else {
      params.set('lang', lang)
    }
    const query = params.toString()
    router.push(`?${query}`)
  }

  return (
    <div className="flex items-center gap-1">
      {availableLanguages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleChange(lang.code)}
          className={`px-2 py-1 text-xs rounded ${
            currentLang === lang.code
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
