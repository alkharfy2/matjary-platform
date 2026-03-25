'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PageBlock } from '@/db/schema'

type SupportedBlockType = 'hero' | 'text' | 'image' | 'products' | 'cta'

type Props = {
  initialBlocks: PageBlock[]
}

const SUPPORTED_TYPES: SupportedBlockType[] = ['hero', 'text', 'image', 'cta', 'products']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeBlocks(value: unknown): PageBlock[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item) => isRecord(item) && typeof item.id === 'string' && typeof item.type === 'string')
    .map((item, index) => ({
      id: String(item.id),
      type: item.type as PageBlock['type'],
      content: isRecord(item.content) ? item.content : {},
      settings: isRecord(item.settings) ? item.settings : {},
      order: typeof item.order === 'number' && Number.isFinite(item.order) ? Math.max(0, Math.trunc(item.order)) : index,
    }))
    .sort((a, b) => a.order - b.order)
    .map((block, index) => ({ ...block, order: index }))
}

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

function createBlock(type: SupportedBlockType): PageBlock {
  if (type === 'hero') {
    return {
      id: makeId('hero'),
      type: 'hero',
      order: 0,
      settings: {},
      content: {
        title: '',
        subtitle: '',
        imageUrl: '',
        buttonText: '',
        buttonUrl: '',
        badgeText: '',
        featureCard1: '',
        featureCard2: '',
        featureCard3: '',
        pageLeadCardText: '',
      },
    }
  }

  if (type === 'text') {
    return {
      id: makeId('text'),
      type: 'text',
      order: 0,
      settings: {},
      content: {
        title: '',
        body: '',
      },
    }
  }

  if (type === 'image') {
    return {
      id: makeId('image'),
      type: 'image',
      order: 0,
      settings: {},
      content: {
        src: '',
        alt: '',
        caption: '',
      },
    }
  }

  if (type === 'cta') {
    return {
      id: makeId('cta'),
      type: 'cta',
      order: 0,
      settings: {},
      content: {
        title: '',
        description: '',
        buttonText: '',
        buttonUrl: '',
      },
    }
  }

  return {
    id: makeId('products'),
    type: 'products',
    order: 0,
    settings: {},
    content: {
      title: '',
      categoryId: '',
      limit: 8,
      featured: false,
    },
  }
}

function withNormalizedOrder(blocks: PageBlock[]): PageBlock[] {
  return blocks.map((block, index) => ({ ...block, order: index }))
}

function getBlockTitle(type: string) {
  if (type === 'hero') return '\u0647\u064a\u0631\u0648'
  if (type === 'text') return '\u0646\u0635'
  if (type === 'image') return '\u0635\u0648\u0631\u0629'
  if (type === 'cta') return 'CTA'
  if (type === 'products') return '\u0645\u0646\u062a\u062c\u0627\u062a'
  return `${'\u0628\u0644\u0648\u0643'}: ${type}`
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  dir,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-[var(--ds-text)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
      />
    </label>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  dir,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-[var(--ds-text)]">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        dir={dir}
        className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
      />
    </label>
  )
}

export function PageBlocksEditor({ initialBlocks }: Props) {
  const [blocks, setBlocks] = useState<PageBlock[]>(() => normalizeBlocks(initialBlocks))
  const [jsonDraft, setJsonDraft] = useState('')
  const [jsonDirty, setJsonDirty] = useState(false)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [jsonReloadedNotice, setJsonReloadedNotice] = useState(false)
  const [jsonAppliedNotice, setJsonAppliedNotice] = useState(false)
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  const contentJson = useMemo(() => JSON.stringify(withNormalizedOrder(blocks), null, 2), [blocks])

  useEffect(() => {
    if (!jsonDirty) setJsonDraft(contentJson)
  }, [contentJson, jsonDirty])

  const unsupportedBlocksCount = blocks.filter(
    (block) => !SUPPORTED_TYPES.includes(block.type as SupportedBlockType)
  ).length

  function updateBlock(index: number, next: PageBlock) {
    setBlocks((prev) => withNormalizedOrder(prev.map((block, i) => (i === index ? next : block))))
  }

  function updateContentField(index: number, key: string, value: unknown) {
    setBlocks((prev) =>
      withNormalizedOrder(
        prev.map((block, i) =>
          i === index
            ? { ...block, content: { ...(isRecord(block.content) ? block.content : {}), [key]: value } }
            : block
        )
      )
    )
  }

  function addBlock(type: SupportedBlockType) {
    setBlocks((prev) => withNormalizedOrder([...prev, createBlock(type)]))
  }

  function removeBlock(index: number) {
    setBlocks((prev) => withNormalizedOrder(prev.filter((_, i) => i !== index)))
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((prev) => {
      if (index < 0 || index >= prev.length) return prev
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const item = next[index]
      if (!item) return prev
      next.splice(index, 1)
      next.splice(target, 0, item)
      return withNormalizedOrder(next)
    })
  }

  function applyJsonDraft() {
    try {
      const parsed = JSON.parse(jsonDraft)
      const normalized = normalizeBlocks(parsed)
      setBlocks(normalized)
      setJsonDirty(false)
      setJsonError(null)
      setJsonReloadedNotice(false)
      setJsonAppliedNotice(true)
      window.setTimeout(() => setJsonAppliedNotice(false), 1200)
    } catch {
      setJsonAppliedNotice(false)
      setJsonError('\u0645\u062d\u062a\u0648\u0649 JSON \u063a\u064a\u0631 \u0635\u0627\u0644\u062d.')
    }
  }

  async function uploadBlockImage(index: number, field: 'imageUrl' | 'src', file: File) {
    const uploadKey = `${blocks[index]?.id ?? index}:${field}`
    setUploadingField(uploadKey)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'hero')

      const response = await fetch('/api/dashboard/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '\u062a\u0639\u0630\u0631 \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629')
      }

      const imageUrl = String(data.data?.url ?? '')
      if (!imageUrl) throw new Error('\u062a\u0639\u0630\u0631 \u0627\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u0631\u0627\u0628\u0637 \u0627\u0644\u0635\u0648\u0631\u0629 \u0628\u0639\u062f \u0627\u0644\u0631\u0641\u0639')

      updateContentField(index, field, imageUrl)
      setUploadSuccess('\u062a\u0645 \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629 \u0628\u0646\u062c\u0627\u062d')
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '\u062a\u0639\u0630\u0631 \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629')
    } finally {
      setUploadingField(null)
    }
  }

  return (
    <div className="space-y-4">
      <textarea name="contentJson" value={contentJson} readOnly hidden />

      <div className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">{'\u0645\u062d\u0631\u0631 \u0627\u0644\u0628\u0644\u0648\u0643\u0627\u062a'}</h3>
            <p className="text-xs text-[var(--ds-text-muted)]">
              {'\u0623\u0636\u0641 \u0628\u0644\u0648\u0643\u0627\u062a \u0648\u0631\u062a\u0628\u0647\u0627 \u0648\u0627\u0639\u062f\u0644 \u062d\u0642\u0648\u0644\u0647\u0627 \u0628\u0634\u0643\u0644 \u0645\u0628\u0633\u0637.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => addBlock('hero')} className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-1.5 text-sm hover:bg-[var(--ds-surface-muted)]">{'\u0625\u0636\u0627\u0641\u0629 Hero'}</button>
            <button type="button" onClick={() => addBlock('text')} className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-1.5 text-sm hover:bg-[var(--ds-surface-muted)]">{'\u0625\u0636\u0627\u0641\u0629 \u0646\u0635'}</button>
            <button type="button" onClick={() => addBlock('image')} className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-1.5 text-sm hover:bg-[var(--ds-surface-muted)]">{'\u0625\u0636\u0627\u0641\u0629 \u0635\u0648\u0631\u0629'}</button>
            <button type="button" onClick={() => addBlock('cta')} className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-1.5 text-sm hover:bg-[var(--ds-surface-muted)]">{'\u0625\u0636\u0627\u0641\u0629 CTA'}</button>
            <button type="button" onClick={() => addBlock('products')} className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-1.5 text-sm hover:bg-[var(--ds-surface-muted)]">{'\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062a\u062c\u0627\u062a'}</button>
          </div>
        </div>
      </div>

      {unsupportedBlocksCount > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {`\u064a\u0648\u062c\u062f ${unsupportedBlocksCount} \u0628\u0644\u0648\u0643 \u063a\u064a\u0631 \u0645\u062f\u0639\u0648\u0645 \u0641\u064a \u0627\u0644\u0645\u062d\u0631\u0631 \u0627\u0644\u0645\u0628\u0633\u0637. \u0633\u064a\u0638\u0644 \u0645\u062d\u0641\u0648\u0638\u064b\u0627 \u0643\u0645\u0627 \u0647\u0648\u060c \u0648\u064a\u0645\u0643\u0646 \u062a\u0639\u062f\u064a\u0644\u0647 \u0645\u0646 JSON \u0627\u0644\u0645\u062a\u0642\u062f\u0645.`}
        </div>
      ) : null}

      {uploadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {uploadError}
        </div>
      ) : null}

      {uploadSuccess ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {uploadSuccess}
        </div>
      ) : null}

      <div className="space-y-3">
        {blocks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--ds-border)] p-6 text-center text-[var(--ds-text-muted)]">
            {'\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u062d\u062a\u0648\u0649 \u0628\u0639\u062f. \u0627\u0636\u063a\u0637 \u0623\u062d\u062f \u0623\u0632\u0631\u0627\u0631 \u0625\u0636\u0627\u0641\u0629 \u0628\u0644\u0648\u0643 \u0623\u0639\u0644\u0627\u0647.'}
          </div>
        ) : (
          blocks.map((block, index) => {
            const content = isRecord(block.content) ? block.content : {}
            const isSupported = SUPPORTED_TYPES.includes(block.type as SupportedBlockType)
            const heroImageUploadKey = `${block.id}:imageUrl`
            const imageUploadKey = `${block.id}:src`

            return (
              <div key={block.id} className="card-surface p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {index + 1}. {getBlockTitle(block.type)}
                    </p>
                    <p className="text-xs text-[var(--ds-text-muted)]" dir="ltr">id: {block.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => moveBlock(index, -1)} className="rounded-lg border border-[var(--ds-border)] px-2 py-1 text-sm hover:bg-[var(--ds-surface-muted)]">{'\u0623\u0639\u0644\u0649'}</button>
                    <button type="button" onClick={() => moveBlock(index, 1)} className="rounded-lg border border-[var(--ds-border)] px-2 py-1 text-sm hover:bg-[var(--ds-surface-muted)]">{'\u0623\u0633\u0641\u0644'}</button>
                    <button type="button" onClick={() => removeBlock(index)} className="rounded-lg border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50">{'\u062d\u0630\u0641'}</button>
                  </div>
                </div>

                {!isSupported ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {'\u0647\u0630\u0627 \u0627\u0644\u0628\u0644\u0648\u0643 \u0644\u064a\u0633 \u0644\u0647 \u0648\u0627\u062c\u0647\u0629 \u0645\u0628\u0633\u0637\u0629 \u0628\u0639\u062f. \u0627\u0633\u062a\u062e\u062f\u0645 JSON \u0627\u0644\u0645\u062a\u0642\u062f\u0645 \u0644\u062a\u0639\u062f\u064a\u0644\u0647.'}
                  </div>
                ) : null}

                {block.type === 'hero' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField label={'\u0627\u0644\u0639\u0646\u0648\u0627\u0646'} value={String(content.title ?? '')} onChange={(v) => updateContentField(index, 'title', v)} />
                    <TextField label={'\u0627\u0644\u0646\u0635 \u0627\u0644\u0641\u0631\u0639\u064a'} value={String(content.subtitle ?? '')} onChange={(v) => updateContentField(index, 'subtitle', v)} />
                    <TextField label={'\u0646\u0635 \u0627\u0644\u0648\u0633\u0645 \u0627\u0644\u0639\u0644\u0648\u064a (Badge)'} value={String(content.badgeText ?? '')} onChange={(v) => updateContentField(index, 'badgeText', v)} />
                    <div className="md:col-span-2">
                      <TextAreaField label={'\u0646\u0635 \u0643\u0627\u0631\u062f \u0627\u0644\u0645\u0642\u062f\u0645\u0629 \u0623\u0639\u0644\u0649 \u0627\u0644\u0635\u0641\u062d\u0629 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)'} value={String(content.pageLeadCardText ?? '')} onChange={(v) => updateContentField(index, 'pageLeadCardText', v)} rows={3} />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <TextField label={'\u0631\u0627\u0628\u0637 \u0627\u0644\u0635\u0648\u0631\u0629'} value={String(content.imageUrl ?? '')} onChange={(v) => updateContentField(index, 'imageUrl', v)} dir="ltr" placeholder="https://..." />
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2 text-sm hover:bg-[var(--ds-surface-muted)]">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingField === heroImageUploadKey}
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (!file) return
                              void uploadBlockImage(index, 'imageUrl', file)
                              event.target.value = ''
                            }}
                          />
                          {uploadingField === heroImageUploadKey ? '\u062c\u0627\u0631\u064a \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629...' : '\u0631\u0641\u0639 \u0635\u0648\u0631\u0629'}
                        </label>
                        <span className="text-xs text-[var(--ds-text-muted)]">{'\u0623\u0648 \u0623\u062f\u062e\u0644 \u0627\u0644\u0631\u0627\u0628\u0637 \u0645\u0628\u0627\u0634\u0631\u0629'}</span>
                      </div>
                    </div>
                    <TextField label={'\u0646\u0635 \u0627\u0644\u0632\u0631'} value={String(content.buttonText ?? '')} onChange={(v) => updateContentField(index, 'buttonText', v)} />
                    <div className="md:col-span-2">
                      <TextField label={'\u0631\u0627\u0628\u0637 \u0627\u0644\u0632\u0631'} value={String(content.buttonUrl ?? '')} onChange={(v) => updateContentField(index, 'buttonUrl', v)} dir="ltr" placeholder="/offers" />
                    </div>
                    <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
                      <TextField label={'\u0646\u0635 \u0627\u0644\u0643\u0627\u0631\u062a 1'} value={String(content.featureCard1 ?? '')} onChange={(v) => updateContentField(index, 'featureCard1', v)} />
                      <TextField label={'\u0646\u0635 \u0627\u0644\u0643\u0627\u0631\u062a 2'} value={String(content.featureCard2 ?? '')} onChange={(v) => updateContentField(index, 'featureCard2', v)} />
                      <TextField label={'\u0646\u0635 \u0627\u0644\u0643\u0627\u0631\u062a 3'} value={String(content.featureCard3 ?? '')} onChange={(v) => updateContentField(index, 'featureCard3', v)} />
                    </div>
                  </div>
                ) : null}

                {block.type === 'text' ? (
                  <div className="space-y-4">
                    <TextField label={'\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0646\u0635'} value={String(content.title ?? '')} onChange={(v) => updateContentField(index, 'title', v)} />
                    <TextAreaField label={'\u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0646\u0635 (HTML \u0623\u0648 \u0646\u0635)'} value={String(content.body ?? '')} onChange={(v) => updateContentField(index, 'body', v)} rows={6} dir="ltr" />
                  </div>
                ) : null}

                {block.type === 'image' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2 space-y-2">
                      <TextField label={'\u0631\u0627\u0628\u0637 \u0627\u0644\u0635\u0648\u0631\u0629'} value={String(content.src ?? '')} onChange={(v) => updateContentField(index, 'src', v)} dir="ltr" placeholder="https://..." />
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2 text-sm hover:bg-[var(--ds-surface-muted)]">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingField === imageUploadKey}
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (!file) return
                              void uploadBlockImage(index, 'src', file)
                              event.target.value = ''
                            }}
                          />
                          {uploadingField === imageUploadKey ? '\u062c\u0627\u0631\u064a \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629...' : '\u0631\u0641\u0639 \u0635\u0648\u0631\u0629'}
                        </label>
                        <span className="text-xs text-[var(--ds-text-muted)]">{'\u0623\u0648 \u0623\u062f\u062e\u0644 \u0627\u0644\u0631\u0627\u0628\u0637 \u0645\u0628\u0627\u0634\u0631\u0629'}</span>
                      </div>
                    </div>
                    <TextField label={'Alt'} value={String(content.alt ?? '')} onChange={(v) => updateContentField(index, 'alt', v)} />
                    <div className="md:col-span-2">
                      <TextField label={'\u062a\u0639\u0644\u064a\u0642 \u0627\u0644\u0635\u0648\u0631\u0629'} value={String(content.caption ?? '')} onChange={(v) => updateContentField(index, 'caption', v)} />
                    </div>
                  </div>
                ) : null}

                {block.type === 'cta' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField label={'\u0627\u0644\u0639\u0646\u0648\u0627\u0646'} value={String(content.title ?? '')} onChange={(v) => updateContentField(index, 'title', v)} />
                    <TextField label={'\u0648\u0635\u0641 \u0645\u062e\u062a\u0635\u0631'} value={String(content.description ?? '')} onChange={(v) => updateContentField(index, 'description', v)} />
                    <TextField label={'\u0646\u0635 \u0627\u0644\u0632\u0631'} value={String(content.buttonText ?? '')} onChange={(v) => updateContentField(index, 'buttonText', v)} />
                    <TextField label={'\u0631\u0627\u0628\u0637 \u0627\u0644\u0632\u0631'} value={String(content.buttonUrl ?? '')} onChange={(v) => updateContentField(index, 'buttonUrl', v)} dir="ltr" placeholder="/contact" />
                  </div>
                ) : null}

                {block.type === 'products' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField label={'\u0639\u0646\u0648\u0627\u0646 \u0642\u0633\u0645 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a'} value={String(content.title ?? '')} onChange={(v) => updateContentField(index, 'title', v)} />
                    <TextField label={'Category ID (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)'} value={String(content.categoryId ?? '')} onChange={(v) => updateContentField(index, 'categoryId', v)} dir="ltr" />
                    <label className="block space-y-1">
                      <span className="text-sm text-[var(--ds-text)]">{'\u0639\u062f\u062f \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a'}</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={typeof content.limit === 'number' ? content.limit : Number(content.limit ?? 8) || 8}
                        onChange={(e) => updateContentField(index, 'limit', Math.max(1, Number(e.target.value) || 1))}
                        className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                      />
                    </label>
                    <label className="inline-flex items-center gap-2 self-end rounded-lg border border-[var(--ds-border)] px-3 py-2">
                      <input
                        type="checkbox"
                        checked={Boolean(content.featured)}
                        onChange={(e) => updateContentField(index, 'featured', e.target.checked)}
                      />
                      <span>{'\u0645\u0646\u062a\u062c\u0627\u062a \u0645\u0645\u064a\u0632\u0629 \u0641\u0642\u0637'}</span>
                    </label>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label={'Block ID'} value={block.id} onChange={(v) => updateBlock(index, { ...block, id: v || block.id })} dir="ltr" />
                  <label className="block space-y-1">
                    <span className="text-sm text-[var(--ds-text)]">Order</span>
                    <input value={index} readOnly className="w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-3 py-2 text-[var(--ds-text-muted)]" />
                  </label>
                </div>
              </div>
            )
          })
        )}
      </div>

      <details className="card-surface p-4">
        <summary className="cursor-pointer font-medium">{'\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0645\u062a\u0642\u062f\u0645 (JSON \u0627\u062e\u062a\u064a\u0627\u0631\u064a)'}</summary>
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-3 text-xs text-[var(--ds-text-muted)]">
            <p className="font-medium text-[var(--ds-text)]">JSON keys quick reference</p>
            <p dir="ltr" className="mt-1">block: id, type, order, settings, content</p>
            <p dir="ltr" className="mt-1">hero.content: title, subtitle, imageUrl, buttonText, buttonUrl, badgeText, featureCard1, featureCard2, featureCard3, pageLeadCardText</p>
            <p dir="ltr" className="mt-1">text.content: title, subtitle, body</p>
            <p dir="ltr" className="mt-1">image.content: src, alt, caption</p>
            <p dir="ltr" className="mt-1">cta.content: title, description, buttonText, buttonUrl</p>
            <p dir="ltr" className="mt-1">products.content: title, categoryId, limit, featured</p>
          </div>
          <textarea
            value={jsonDraft}
            onChange={(e) => {
              setJsonDraft(e.target.value)
              setJsonDirty(true)
              setJsonError(null)
              setJsonReloadedNotice(false)
              setJsonAppliedNotice(false)
            }}
            rows={14}
            dir="ltr"
            className={`w-full rounded-lg border px-3 py-2 font-mono text-sm transition-colors ${
              jsonReloadedNotice || jsonAppliedNotice
                ? 'border-green-400 bg-green-50/40'
                : 'border-[var(--ds-border)]'
            }`}
          />
          {jsonError ? (
            <p className="text-sm text-red-600">{jsonError}</p>
          ) : null}
          {jsonReloadedNotice ? (
            <p className="text-sm text-green-700">{'\u062a\u0645\u062a \u0645\u0632\u0627\u0645\u0646\u0629 JSON \u0645\u0639 \u0627\u0644\u0645\u062d\u0631\u0631 \u0628\u0646\u062c\u0627\u062d.'}</p>
          ) : null}
          {jsonAppliedNotice ? (
            <p className="text-sm text-green-700">{'\u062a\u0645 \u062a\u0637\u0628\u064a\u0642 JSON \u0628\u0646\u062c\u0627\u062d.'}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={applyJsonDraft} className="rounded-lg border border-[var(--ds-border)] px-3 py-2 text-sm hover:bg-[var(--ds-surface-muted)]">
              {'\u062a\u0637\u0628\u064a\u0642 JSON'}
            </button>
            <button
              type="button"
              onClick={() => {
                setJsonDraft(contentJson)
                setJsonDirty(false)
                setJsonError(null)
                setJsonAppliedNotice(false)
                setJsonReloadedNotice(true)
                window.setTimeout(() => setJsonReloadedNotice(false), 1200)
              }}
              className="rounded-lg border border-[var(--ds-border)] px-3 py-2 text-sm hover:bg-[var(--ds-surface-muted)]"
            >
              {'\u0625\u0639\u0627\u062f\u0629 \u062a\u062d\u0645\u064a\u0644 \u0645\u0646 \u0627\u0644\u0645\u062d\u0631\u0631'}
            </button>
          </div>
        </div>
      </details>
    </div>
  )
}




