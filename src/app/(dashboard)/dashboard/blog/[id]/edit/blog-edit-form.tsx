'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type BlogPost = {
  id: string
  title: string
  slug: string
  content: string
  featuredImage: string | null
  excerpt: string | null
  author: string | null
  isPublished: boolean
  seoTitle: string | null
  seoDescription: string | null
}

export function BlogEditForm({ post }: { post: BlogPost }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [title, setTitle] = useState(post.title)
  const [slug, setSlug] = useState(post.slug)
  const [content, setContent] = useState(post.content)
  const [featuredImage, setFeaturedImage] = useState(post.featuredImage ?? '')
  const [excerpt, setExcerpt] = useState(post.excerpt ?? '')
  const [author, setAuthor] = useState(post.author ?? '')
  const [isPublished, setIsPublished] = useState(post.isPublished)
  const [seoTitle, setSeoTitle] = useState(post.seoTitle ?? '')
  const [seoDescription, setSeoDescription] = useState(post.seoDescription ?? '')

  const [aiKeywords, setAiKeywords] = useState('')
  const [aiTone, setAiTone] = useState<'professional' | 'friendly' | 'promotional' | 'educational'>('professional')

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch(`/api/dashboard/blog/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          content,
          featuredImage: featuredImage || null,
          excerpt: excerpt || null,
          author: author || null,
          isPublished,
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'فشل في حفظ المقالة')
        return
      }
      setSuccess(true)
      router.refresh()
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerate() {
    if (!title.trim()) {
      setError('أدخل عنوان المقالة أولاً')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, keywords: aiKeywords, tone: aiTone }),
      })
      const text = await res.text()
      const data = JSON.parse(text.trim())
      if (!data.success) {
        setError(data.error || 'فشل في توليد المحتوى')
        return
      }
      setContent(data.data.content)
      if (data.data.excerpt) setExcerpt(data.data.excerpt)
      if (data.data.seoTitle) setSeoTitle(data.data.seoTitle)
      if (data.data.seoDescription) setSeoDescription(data.data.seoDescription)
    } catch {
      setError('حدث خطأ أثناء توليد المحتوى')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">تعديل المقالة</h1>
        <Link href="/dashboard/blog" className="rounded-lg border border-[var(--ds-border)] px-4 py-2 text-sm hover:bg-[var(--ds-surface-muted)]">
          رجوع
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">تم حفظ المقالة بنجاح</div>
      ) : null}

      <div className="space-y-4 card-surface p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">العنوان</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">الرابط (slug)</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" dir="ltr" />
          </div>
        </div>

        {/* AI Generation section */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-800">✨ توليد بالذكاء الاصطناعي</p>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              placeholder="كلمات مفتاحية (اختياري)"
              value={aiKeywords}
              onChange={(e) => setAiKeywords(e.target.value)}
              className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
            />
            <select
              value={aiTone}
              onChange={(e) => setAiTone(e.target.value as typeof aiTone)}
              className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
            >
              <option value="professional">احترافي</option>
              <option value="friendly">ودي</option>
              <option value="promotional">تسويقي</option>
              <option value="educational">تعليمي</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? 'جاري التوليد...' : '✨ اكتب بالذكاء الاصطناعي'}
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">المحتوى (HTML)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={15}
            className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2 font-mono text-sm"
            dir="rtl"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">المقتطف</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            maxLength={500}
            className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">اسم الكاتب</label>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={100} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">رابط الصورة البارزة</label>
            <input value={featuredImage} onChange={(e) => setFeaturedImage(e.target.value)} type="url" className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" dir="ltr" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">SEO Title</label>
            <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={70} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">SEO Description</label>
            <input value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} maxLength={160} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
        </div>

        <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--ds-border)] px-3 py-2">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          <span>منشورة</span>
        </label>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Link href="/dashboard/blog" className="w-full rounded-lg border border-[var(--ds-border)] px-4 py-2 text-center hover:bg-[var(--ds-surface-muted)] sm:w-auto">إلغاء</Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-lg bg-[var(--ds-primary)] px-4 py-2 text-white hover:bg-[var(--ds-primary-hover)] disabled:opacity-50 sm:w-auto"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>
    </div>
  )
}
