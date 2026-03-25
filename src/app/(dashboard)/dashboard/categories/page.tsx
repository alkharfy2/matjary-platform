'use client'

import { useEffect, useMemo, useState } from 'react'

type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  sortOrder: number
  isActive: boolean
}

type FormMode = 'create' | 'edit'

type CategoryFormState = {
  name: string
  description: string
  imageUrl: string
  sortOrder: string
  isActive: boolean
}

const emptyFormState: CategoryFormState = {
  name: '',
  description: '',
  imageUrl: '',
  sortOrder: '0',
  isActive: true,
}

function sortCategories(list: Category[]) {
  return [...list].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.name.localeCompare(b.name, 'ar')
  })
}

function buildReorderedCategories(
  list: Category[],
  sourceId: string,
  targetId: string
) {
  const sourceIndex = list.findIndex((category) => category.id === sourceId)
  const targetIndex = list.findIndex((category) => category.id === targetId)
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return list
  }

  const reordered = [...list]
  const [moved] = reordered.splice(sourceIndex, 1)
  if (!moved) return list
  reordered.splice(targetIndex, 0, moved)

  return reordered.map((category, index) => ({
    ...category,
    sortOrder: index,
  }))
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [savingReorder, setSavingReorder] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [form, setForm] = useState<CategoryFormState>(emptyFormState)

  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null)
  const [dropTargetCategoryId, setDropTargetCategoryId] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return Boolean(form.name.trim())
  }, [form.name])

  useEffect(() => {
    void loadCategories()
  }, [])

  async function loadCategories() {
    try {
      setLoading(true)
      setErrorMessage(null)

      const response = await fetch('/api/dashboard/categories')
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر تحميل التصنيفات')
      }

      setCategories(sortCategories(data.data as Category[]))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحميل التصنيفات')
    } finally {
      setLoading(false)
    }
  }

  function openCreateForm() {
    setFormMode('create')
    setEditingCategoryId(null)
    setForm({
      ...emptyFormState,
      sortOrder: String(categories.length),
    })
    setShowForm(true)
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  function openEditForm(category: Category) {
    setFormMode('edit')
    setEditingCategoryId(category.id)
    setForm({
      name: category.name,
      description: category.description ?? '',
      imageUrl: category.imageUrl ?? '',
      sortOrder: String(category.sortOrder),
      isActive: category.isActive,
    })
    setShowForm(true)
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditingCategoryId(null)
    setFormMode('create')
    setForm(emptyFormState)
  }

  function updateForm<K extends keyof CategoryFormState>(key: K, value: CategoryFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleNameChange(value: string) {
    updateForm('name', value)
  }

  async function handleUploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'categories')

      const response = await fetch('/api/dashboard/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'فشل رفع الصورة')
      }

      updateForm('imageUrl', String(data.data.url))
      setSuccessMessage('تم رفع الصورة بنجاح')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'فشل رفع الصورة')
    } finally {
      setUploadingImage(false)
      event.target.value = ''
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    setSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        sortOrder: Number.parseInt(form.sortOrder || '0', 10) || 0,
        isActive: form.isActive,
        parentId: null,
      }

      const isEdit = formMode === 'edit' && Boolean(editingCategoryId)
      const path = isEdit
        ? `/api/dashboard/categories/${editingCategoryId}`
        : '/api/dashboard/categories'
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر حفظ التصنيف')
      }

      await loadCategories()
      closeForm()
      setSuccessMessage(isEdit ? 'تم تحديث التصنيف بنجاح' : 'تم إنشاء التصنيف بنجاح')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر حفظ التصنيف')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(categoryId: string) {
    const confirmed = confirm('هل أنت متأكد من حذف هذا التصنيف؟')
    if (!confirmed) return

    setDeletingId(categoryId)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/dashboard/categories/${categoryId}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر حذف التصنيف')
      }

      await loadCategories()
      setSuccessMessage('تم حذف التصنيف بنجاح')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر حذف التصنيف')
    } finally {
      setDeletingId(null)
    }
  }

  async function saveReorder(previous: Category[], next: Category[]) {
    const previousSortMap = new Map(previous.map((category) => [category.id, category.sortOrder]))
    const changed = next.filter(
      (category) => previousSortMap.get(category.id) !== category.sortOrder
    )

    if (!changed.length) return

    setSavingReorder(true)
    setErrorMessage(null)

    try {
      const requests = changed.map(async (category) => {
        const response = await fetch(`/api/dashboard/categories/${category.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: category.sortOrder }),
        })
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'تعذر حفظ ترتيب التصنيفات')
        }
      })

      await Promise.all(requests)
      setSuccessMessage('تم حفظ ترتيب التصنيفات')
    } catch (error) {
      setCategories(previous)
      setErrorMessage(
        error instanceof Error ? error.message : 'تعذر حفظ ترتيب التصنيفات'
      )
    } finally {
      setSavingReorder(false)
    }
  }

  async function handleDrop(targetCategoryId: string) {
    const sourceId = draggingCategoryId
    if (!sourceId || sourceId === targetCategoryId) return

    const previous = categories
    const next = buildReorderedCategories(previous, sourceId, targetCategoryId)
    setCategories(next)
    setDraggingCategoryId(null)
    setDropTargetCategoryId(null)
    await saveReorder(previous, next)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">التصنيفات</h1>
        <button
          onClick={openCreateForm}
          className="rounded-lg bg-[var(--ds-primary)] px-4 py-2 text-white hover:bg-[var(--ds-primary-hover)]"
        >
          + إضافة تصنيف
        </button>
      </div>

      <p className="text-sm text-[var(--ds-text-muted)]">
        يمكنك سحب الصفوف لتغيير الترتيب وحفظه مباشرة.
        {savingReorder ? ' جاري حفظ الترتيب...' : ''}
      </p>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      ) : null}

      {showForm ? (
        <form onSubmit={handleSubmit} className="card-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">
            {formMode === 'edit' ? 'تعديل التصنيف' : 'تصنيف جديد'}
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">الاسم</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => handleNameChange(event.target.value)}
                className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الترتيب</label>
              <input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(event) => updateForm('sortOrder', event.target.value)}
                className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">حالة التصنيف</label>
              <select
                value={form.isActive ? 'active' : 'inactive'}
                onChange={(event) => updateForm('isActive', event.target.value === 'active')}
                className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium">الوصف (اختياري)</label>
            <textarea
              value={form.description}
              onChange={(event) => updateForm('description', event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium">صورة التصنيف (اختياري)</label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                dir="ltr"
                value={form.imageUrl}
                onChange={(event) => updateForm('imageUrl', event.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2 sm:min-w-[260px] sm:flex-1"
              />
              <label className="cursor-pointer rounded-lg border border-[var(--ds-border)] px-4 py-2 hover:bg-[var(--ds-surface-muted)]">
                {uploadingImage ? 'جاري الرفع...' : 'رفع صورة'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImage}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>
            </div>
            {form.imageUrl ? (
              <div className="mt-3 h-24 w-24 overflow-hidden rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.imageUrl}
                  alt="معاينة صورة التصنيف"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="submit"
              disabled={!canSubmit || saving || uploadingImage}
              className="rounded-lg bg-[var(--ds-primary)] px-4 py-2 text-white hover:bg-[var(--ds-primary-hover)] disabled:opacity-60"
            >
              {saving
                ? 'جاري الحفظ...'
                : formMode === 'edit'
                  ? 'حفظ التعديلات'
                  : 'إنشاء التصنيف'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-[var(--ds-border)] px-4 py-2 hover:bg-[var(--ds-surface-muted)]"
            >
              إلغاء
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden card-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
          <thead className="bg-[var(--ds-surface-muted)]">
            <tr>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">الترتيب</th>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">الصورة</th>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">الاسم</th>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">الرابط</th>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">الحالة</th>
              <th className="px-4 py-3 text-end text-sm font-medium text-[var(--ds-text-muted)]">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[var(--ds-text-muted)]">
                  جاري تحميل التصنيفات...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[var(--ds-text-muted)]">
                  لا توجد تصنيفات بعد.
                </td>
              </tr>
            ) : (
              categories.map((category, index) => (
                <tr
                  key={category.id}
                  draggable
                  onDragStart={() => setDraggingCategoryId(category.id)}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDropTargetCategoryId(category.id)
                  }}
                  onDragLeave={() => setDropTargetCategoryId((current) => (
                    current === category.id ? null : current
                  ))}
                  onDrop={() => {
                    void handleDrop(category.id)
                  }}
                  onDragEnd={() => {
                    setDraggingCategoryId(null)
                    setDropTargetCategoryId(null)
                  }}
                  className={`border-t border-[var(--ds-border)]/70 ${
                    dropTargetCategoryId === category.id ? 'bg-[var(--ds-surface-muted)]' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="cursor-grab text-[var(--ds-text-muted)]/80" title="اسحب لإعادة الترتيب">
                        ☰
                      </span>
                      <span>{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)]">
                      {category.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{category.name}</p>
                    {category.description ? (
                      <p className="text-xs text-[var(--ds-text-muted)]">{category.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--ds-text-muted)]" dir="ltr">
                    {category.slug}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        category.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-[var(--ds-surface-muted)] text-[var(--ds-text)]'
                      }`}
                    >
                      {category.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditForm(category)}
                        className="rounded-lg border border-[var(--ds-border)] px-3 py-1.5 text-sm hover:bg-[var(--ds-surface-muted)]"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => void handleDelete(category.id)}
                        disabled={deletingId === category.id}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingId === category.id ? 'جاري الحذف...' : 'حذف'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}





