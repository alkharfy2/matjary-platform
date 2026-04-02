'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import { slugifyProductName } from '@/lib/products/product-slug'

type ProductFormMode = 'create' | 'edit'

type ProductFormProps = {
  mode: ProductFormMode
  productId?: string
}

type Category = {
  id: string
  name: string
}

type OptionGroupValueForm = {
  id: string
  value: string
}

type OptionGroupForm = {
  id: string
  name: string
  values: OptionGroupValueForm[]
}

type VariantCombinationSelectionForm = {
  groupId: string
  valueId: string
}

type VariantCombinationForm = {
  id: string
  selection: VariantCombinationSelectionForm[]
  price: string
  stock: string
  sku: string
  isActive: boolean
  isActiveManuallySet: boolean
}

type ApiProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  shortDescription: string | null
  price: string
  compareAtPrice: string | null
  costPrice: string | null
  sku: string | null
  stock: number
  trackInventory: boolean
  isDigital: boolean
  sortOrder: number
  categoryId: string | null
  isActive: boolean
  isFeatured?: boolean
  seoTitle?: string | null
  seoDescription?: string | null
  images: string[]
  variants: Array<{
    id?: string
    options?: Array<{ name?: string; value?: string }>
    price?: number | null
    stock?: number
    sku?: string | null
    isActive?: boolean
  }>
  translations?: Record<string, { name?: string; description?: string; shortDescription?: string }> | null
}

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

type ApiResponseBody = {
  success?: boolean
  error?: string
  data?: unknown
}

async function parseResponseBody(response: Response): Promise<ApiResponseBody> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const fallback = response.clone()
    try {
      return (await response.json()) as ApiResponseBody
    } catch {
      const text = (await fallback.text()).trim()
      return {
        success: false,
        error: text || `تعذر قراءة استجابة الخادم (${response.status})`,
      }
    }
  }

  const text = (await response.text()).trim()
  return {
    success: false,
    error: text || `تعذر قراءة استجابة الخادم (${response.status})`,
  }
}

function isTechnicalErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  const technicalSignals = [
    'failed query',
    'select ',
    'insert ',
    'update ',
    'delete ',
    ' from ',
    ' where ',
    ' params:',
    'sql',
    'syntax error',
    'stack',
    'exception',
  ]

  return technicalSignals.some((signal) => normalized.includes(signal))
}

function getApiErrorMessage(response: Response, body: ApiResponseBody, fallback: string): string {
  if (response.status === 413) {
    return 'حجم الملف كبير جدا. الحد الأقصى المسموح هو 5 ميجابايت للصورة.'
  }

  if (typeof body.error === 'string' && body.error.trim()) {
    return isTechnicalErrorMessage(body.error)
      ? 'حدث خطأ في الخادم. حاول مرة أخرى.'
      : body.error
  }

  if (!response.ok) {
    return `${fallback} (HTTP ${response.status})`
  }

  return fallback
}
type InitializedVariantEditorState = {
  optionGroups: OptionGroupForm[]
  combinations: VariantCombinationForm[]
  hasLegacyData: boolean
}

function createOptionGroupValue(value = ''): OptionGroupValueForm {
  return {
    id: nanoid(),
    value,
  }
}

function createOptionGroup(): OptionGroupForm {
  return {
    id: nanoid(),
    name: '',
    values: [createOptionGroupValue()],
  }
}

function getTrimmedOptionGroupName(group: OptionGroupForm): string {
  return group.name.trim()
}

function getTrimmedOptionGroupValue(value: OptionGroupValueForm): string {
  return value.value.trim()
}

function getGeneratableOptionGroups(optionGroups: OptionGroupForm[]) {
  return optionGroups
    .map((group) => ({
      id: group.id,
      name: getTrimmedOptionGroupName(group),
      values: group.values
        .map((value) => ({
          id: value.id,
          value: getTrimmedOptionGroupValue(value),
        }))
        .filter((value) => value.value.length > 0),
    }))
    .filter((group) => group.name.length > 0 && group.values.length > 0)
}

function serializeCombinationSelection(selection: VariantCombinationSelectionForm[]): string {
  return selection.map((item) => `${item.groupId}:${item.valueId}`).join('|')
}

function createVariantCombination(
  selection: VariantCombinationSelectionForm[],
  initialStock = '',
  isActive = true,
  isActiveManuallySet = false
): VariantCombinationForm {
  return {
    id: nanoid(),
    selection,
    price: '',
    stock: initialStock,
    sku: '',
    isActive,
    isActiveManuallySet,
  }
}

function getCombinationStockValue(stock: string): number {
  const parsedStock = Number.parseInt(stock || '0', 10)
  return Number.isFinite(parsedStock) ? parsedStock : 0
}

function getAutomaticCombinationActiveState(stock: string): boolean {
  return getCombinationStockValue(stock) > 0
}

function getResolvedCombinationIsActive(combination: VariantCombinationForm): boolean {
  return combination.isActiveManuallySet
    ? combination.isActive
    : getAutomaticCombinationActiveState(combination.stock)
}

function buildCombinationSelections(
  optionGroups: ReturnType<typeof getGeneratableOptionGroups>
): VariantCombinationSelectionForm[][] {
  if (!optionGroups.length) return []

  return optionGroups.reduce<VariantCombinationSelectionForm[][]>(
    (combinations, group) =>
      combinations.flatMap((selection) =>
        group.values.map((value) => [
          ...selection,
          { groupId: group.id, valueId: value.id },
        ])
      ),
    [[]]
  )
}

function mergeGeneratedCombinations(
  optionGroups: OptionGroupForm[],
  existingCombinations: VariantCombinationForm[],
  options?: {
    defaultIsActive?: boolean
    initialStock?: string
  }
): VariantCombinationForm[] {
  const generatableGroups = getGeneratableOptionGroups(optionGroups)
  if (!generatableGroups.length) return []

  const selectionMap = new Map(
    existingCombinations.map((combination) => [
      serializeCombinationSelection(combination.selection),
      combination,
    ])
  )
  const defaultIsActive = options?.defaultIsActive ?? true
  const initialStock = options?.initialStock ?? ''

  return buildCombinationSelections(generatableGroups).map((selection) => {
    const key = serializeCombinationSelection(selection)
    const existing = selectionMap.get(key)

    return existing
      ? { ...existing, selection }
      : createVariantCombination(selection, initialStock, defaultIsActive)
  })
}

function initializeVariantEditorState(
  inputs: ApiProduct['variants'],
  initialStock = ''
): InitializedVariantEditorState {
  const optionGroupsMap = new Map<string, Set<string>>()
  const optionGroupOrder: string[] = []

  for (const input of Array.isArray(inputs) ? inputs : []) {
    for (const option of Array.isArray(input.options) ? input.options : []) {
      const optionName = option.name?.trim() ?? ''
      const optionValue = option.value?.trim() ?? ''

      if (!optionName || !optionValue) continue

      if (!optionGroupsMap.has(optionName)) {
        optionGroupsMap.set(optionName, new Set())
        optionGroupOrder.push(optionName)
      }

      optionGroupsMap.get(optionName)?.add(optionValue)
    }
  }

  const optionGroups: OptionGroupForm[] = optionGroupOrder.map((groupName) => ({
    id: nanoid(),
    name: groupName,
    values: Array.from(optionGroupsMap.get(groupName) ?? []).map((value) =>
      createOptionGroupValue(value)
    ),
  }))

  if (!optionGroups.length) {
    return {
      optionGroups: [],
      combinations: [],
      hasLegacyData: false,
    }
  }

  const generatableGroups = getGeneratableOptionGroups(optionGroups)
  const groupByName = new Map(generatableGroups.map((group) => [group.name, group]))
  const existingCombinations: VariantCombinationForm[] = []
  let hasLegacyData = false

  for (const input of Array.isArray(inputs) ? inputs : []) {
    const options = (Array.isArray(input.options) ? input.options : [])
      .map((option) => ({
        name: option.name?.trim() ?? '',
        value: option.value?.trim() ?? '',
      }))
      .filter((option) => option.name && option.value)

    if (!options.length) continue

    if (options.length !== generatableGroups.length) {
      hasLegacyData = true
      continue
    }

    const selection: VariantCombinationSelectionForm[] = []
    let isValidCombination = true

    for (const group of generatableGroups) {
      const matchingOption = options.find((option) => option.name === group.name)
      if (!matchingOption) {
        isValidCombination = false
        break
      }

      const matchedGroup = groupByName.get(group.name)
      const matchedValue = matchedGroup?.values.find(
        (value) => value.value === matchingOption.value
      )

      if (!matchedGroup || !matchedValue) {
        isValidCombination = false
        break
      }

      selection.push({
        groupId: matchedGroup.id,
        valueId: matchedValue.id,
      })
    }

    if (!isValidCombination) {
      hasLegacyData = true
      continue
    }

    existingCombinations.push({
      id: input.id?.trim() || nanoid(),
      selection,
      price: typeof input.price === 'number' ? String(input.price) : '',
      stock: typeof input.stock === 'number' ? String(input.stock) : initialStock,
      sku: input.sku ?? '',
      isActive: input.isActive !== false,
      isActiveManuallySet:
        typeof input.isActive === 'boolean' &&
        input.isActive &&
        typeof input.stock === 'number' &&
        input.stock <= 0,
    })
  }

  return {
    optionGroups,
    combinations: mergeGeneratedCombinations(optionGroups, existingCombinations, {
      defaultIsActive: false,
      initialStock,
    }),
    hasLegacyData,
  }
}

function getCombinationOptionsPayload(
  selection: VariantCombinationSelectionForm[],
  optionGroups: OptionGroupForm[]
): Array<{ name: string; value: string }> {
  const groupsById = new Map(optionGroups.map((group) => [group.id, group]))

  return selection.flatMap((item) => {
    const group = groupsById.get(item.groupId)
    const value = group?.values.find((groupValue) => groupValue.id === item.valueId)
    const groupName = group ? getTrimmedOptionGroupName(group) : ''
    const groupValue = value ? getTrimmedOptionGroupValue(value) : ''

    if (!groupName || !groupValue) return []

    return [{ name: groupName, value: groupValue }]
  })
}

function getCombinationDisplayLabel(
  selection: VariantCombinationSelectionForm[],
  optionGroups: OptionGroupForm[]
): string {
  return getCombinationOptionsPayload(selection, optionGroups)
    .map((option) => `${option.name}: ${option.value}`)
    .join(' / ')
}

export function ProductForm({ mode, productId }: ProductFormProps) {
  const router = useRouter()
  const isEditMode = mode === 'edit'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [price, setPrice] = useState('')
  const [compareAtPrice, setCompareAtPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [sku, setSku] = useState('')
  const [stock, setStock] = useState('0')
  const [sortOrder, setSortOrder] = useState('0')
  const [isFeatured, setIsFeatured] = useState(false)
  const [trackInventory, setTrackInventory] = useState(true)
  const [isDigital, setIsDigital] = useState(false)
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [optionGroups, setOptionGroups] = useState<OptionGroupForm[]>([])
  const [variantCombinations, setVariantCombinations] = useState<VariantCombinationForm[]>([])
  const [variantWarning, setVariantWarning] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [translations, setTranslations] = useState<Record<string, { name?: string; description?: string; shortDescription?: string }>>({})

  const handleAiDescribe = async () => {
    if (!name || name.length < 2) {
      setError('اكتب اسم المنتج الأول')
      return
    }

    setAiLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/products/ai-describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: name,
          categoryName: categories?.find(c => c.id === categoryId)?.name,
          existingDescription: description,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? 'فشل — حاول تاني')
        return
      }

      const stripHtml = (html: string) =>
        html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\n{3,}/g, '\n\n').trim()

      setDescription(stripHtml(data.data.description))
      setShortDescription(data.data.shortDescription)
      setSeoTitle(data.data.seoTitle)
      setSeoDescription(data.data.seoDescription)
      setNotice(`تم توليد الوصف! (باقي ${data.data.remaining} طلب اليوم)`)
    } catch {
      setError('فشل الاتصال')
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function loadPageData() {
      try {
        setLoading(true)
        setError(null)

        const categoriesRequest = fetch('/api/dashboard/categories')
        const productRequest =
          isEditMode && productId
            ? fetch(`/api/dashboard/products/${productId}`)
            : Promise.resolve(null)

        const [categoriesResponse, productResponse] = await Promise.all([
          categoriesRequest,
          productRequest,
        ])

        if (!categoriesResponse.ok) {
          throw new Error('تعذر تحميل التصنيفات')
        }

        const categoriesBody = await categoriesResponse.json()
        if (!categoriesBody.success) {
          throw new Error(categoriesBody.error || 'تعذر تحميل التصنيفات')
        }

        if (!active) return
        setCategories(categoriesBody.data as Category[])

        if (productResponse) {
          if (!productResponse.ok) {
            throw new Error('تعذر تحميل بيانات المنتج')
          }

          const productBody = await productResponse.json()
          if (!productBody.success) {
            throw new Error(productBody.error || 'تعذر تحميل بيانات المنتج')
          }

          const product = productBody.data as ApiProduct
          if (!active) return

          setName(product.name)
          setDescription(product.description ?? '')
          setShortDescription(product.shortDescription ?? '')
          setPrice(product.price)
          setCompareAtPrice(product.compareAtPrice ?? '')
          setCostPrice(product.costPrice ?? '')
          setCategoryId(product.categoryId ?? '')
          setIsActive(Boolean(product.isActive))
          setSku(product.sku ?? '')
          setStock(String(product.stock))
          setSortOrder(String(product.sortOrder ?? 0))
          setIsFeatured(Boolean(product.isFeatured))
          setTrackInventory(Boolean(product.trackInventory))
          setIsDigital(Boolean(product.isDigital))
          setSeoTitle(product.seoTitle ?? '')
          setSeoDescription(product.seoDescription ?? '')
          setImages(Array.isArray(product.images) ? product.images : [])
          if (product.translations && typeof product.translations === 'object') {
            setTranslations(product.translations as Record<string, { name?: string; description?: string; shortDescription?: string }>)
          }
          const initializedVariantEditor = initializeVariantEditorState(
            Array.isArray(product.variants) ? product.variants : [],
            ''
          )
          setOptionGroups(initializedVariantEditor.optionGroups)
          setVariantCombinations(initializedVariantEditor.combinations)
          setVariantWarning(
            initializedVariantEditor.hasLegacyData
              ? 'تم العثور على بيانات متغيرات قديمة غير متوافقة مع محرر التركيبات الجديد. راجع أسماء المتغيرات والتركيبات ثم احفظ المنتج مرة واحدة لإعادة تنظيمها.'
              : null
          )
        }
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل بيانات المنتج')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadPageData()

    return () => {
      active = false
    }
  }, [isEditMode, productId])
  const canDelete = isEditMode && Boolean(productId)
  const pageTitle = useMemo(
    () => (isEditMode ? 'تعديل المنتج' : 'إنشاء منتج جديد'),
    [isEditMode]
  )
  const productSlugPreview = useMemo(() => slugifyProductName(name || 'product'), [name])

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    const oversizedFile = files.find((file) => file.size > MAX_UPLOAD_SIZE_BYTES)
    if (oversizedFile) {
      setError(`الملف "${oversizedFile.name}" أكبر من الحجم المسموح. الحد الأقصى هو 5 ميجابايت للصورة الواحدة.`)
      event.target.value = ''
      return
    }

    const unsupportedFile = files.find((file) => !ALLOWED_IMAGE_TYPES.has(file.type))
    if (unsupportedFile) {
      setError(`نوع الملف "${unsupportedFile.name}" غير مدعوم. الأنواع المسموح بها: JPG, PNG, WebP, GIF.`)
      event.target.value = ''
      return
    }

    setUploading(true)
    setError(null)

    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'products')

        const response = await fetch('/api/dashboard/upload', {
          method: 'POST',
          body: formData,
        })

        const data = await parseResponseBody(response)
        if (!response.ok || !data.success) {
          throw new Error(getApiErrorMessage(response, data, 'تعذر رفع الصورة'))
        }

        const imageUrl =
          typeof (data.data as { url?: unknown } | undefined)?.url === 'string'
            ? (data.data as { url: string }).url
            : null

        if (!imageUrl) {
          throw new Error('لم يرجع الخادم رابط الصورة بعد الرفع')
        }

        setImages((prev) => [...prev, imageUrl])
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'تعذر رفع الصورة')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  function syncOptionGroups(
    updater: (currentGroups: OptionGroupForm[]) => OptionGroupForm[]
  ) {
    setOptionGroups((currentGroups) => {
      const nextGroups = updater(currentGroups)

      setVariantWarning(null)
      setVariantCombinations((currentCombinations) =>
        mergeGeneratedCombinations(nextGroups, currentCombinations, {
          defaultIsActive: true,
          initialStock: isEditMode ? '' : '0',
        })
      )

      return nextGroups
    })
  }

  function addOptionGroup() {
    syncOptionGroups((currentGroups) => [...currentGroups, createOptionGroup()])
  }

  function removeOptionGroup(groupId: string) {
    syncOptionGroups((currentGroups) =>
      currentGroups.filter((group) => group.id !== groupId)
    )
  }

  function updateOptionGroup(groupId: string, patch: Partial<OptionGroupForm>) {
    syncOptionGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === groupId ? { ...group, ...patch } : group
      )
    )
  }

  function addOptionGroupValue(groupId: string) {
    syncOptionGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              values: [...group.values, createOptionGroupValue()],
            }
          : group
      )
    )
  }

  function updateOptionGroupValue(
    groupId: string,
    valueId: string,
    patch: Partial<OptionGroupValueForm>
  ) {
    syncOptionGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              values: group.values.map((value) =>
                value.id === valueId ? { ...value, ...patch } : value
              ),
            }
          : group
      )
    )
  }

  function removeOptionGroupValue(groupId: string, valueId: string) {
    syncOptionGroups((currentGroups) =>
      currentGroups.map((group) => {
        if (group.id !== groupId) return group
        if (group.values.length <= 1) return group

        return {
          ...group,
          values: group.values.filter((value) => value.id !== valueId),
        }
      })
    )
  }

  function updateVariantCombination(
    combinationId: string,
    patch: Partial<VariantCombinationForm>
  ) {
    setVariantCombinations((currentCombinations) =>
      currentCombinations.map((combination) =>
        combination.id === combinationId ? { ...combination, ...patch } : combination
      )
    )
  }

  async function submitProduct() {
    setError(null)
    setNotice(null)

    const normalizedName = name.trim()
    const parsedPrice = Number.parseFloat(price)
    const parsedCompareAtPrice = compareAtPrice
      ? Number.parseFloat(compareAtPrice)
      : null
    const parsedCostPrice = costPrice
      ? Number.parseFloat(costPrice)
      : null
    const parsedStock = Number.parseInt(stock || '0', 10)
    const parsedSortOrder = Number.parseInt(sortOrder || '0', 10)

    if (!normalizedName) {
      setError('اسم المنتج مطلوب')
      return
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('السعر الأساسي يجب أن يكون رقمًا صحيحًا 0 أو أكثر')
      return
    }
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      setError('المخزون يجب أن يكون رقمًا صحيحًا 0 أو أكثر')
      return
    }
    if (!Number.isFinite(parsedSortOrder) || parsedSortOrder < 0) {
      setError('ترتيب العرض يجب أن يكون رقمًا صحيحًا 0 أو أكثر')
      return
    }
    if (
      parsedCompareAtPrice !== null &&
      (!Number.isFinite(parsedCompareAtPrice) || parsedCompareAtPrice < 0)
    ) {
      setError('سعر المقارنة غير صالح')
      return
    }
    if (
      parsedCostPrice !== null &&
      (!Number.isFinite(parsedCostPrice) || parsedCostPrice < 0)
    ) {
      setError('سعر التكلفة غير صالح')
      return
    }

    const optionGroupNames = optionGroups
      .map((group) => getTrimmedOptionGroupName(group))
      .filter((groupName) => groupName.length > 0)
    const duplicateOptionGroupName = optionGroupNames.find(
      (groupName, index) => optionGroupNames.indexOf(groupName) !== index
    )

    if (duplicateOptionGroupName) {
      setError(`اسم المتغير "${duplicateOptionGroupName}" مكرر. استخدم اسمًا فريدًا لكل متغير.`)
      return
    }

    for (const optionGroup of optionGroups) {
      const groupName = getTrimmedOptionGroupName(optionGroup)
      const groupValues = optionGroup.values
        .map((value) => getTrimmedOptionGroupValue(value))
        .filter((value) => value.length > 0)

      if (!groupName && groupValues.length > 0) {
        setError('يجب إدخال اسم المتغير قبل إضافة القيم')
        return
      }

      if (groupName && groupValues.length === 0) {
        setError(`أضف قيمة واحدة على الأقل للمتغير "${groupName}"`)
        return
      }

      const duplicateGroupValue = groupValues.find(
        (value, index) => groupValues.indexOf(value) !== index
      )

      if (duplicateGroupValue) {
        setError(`القيمة "${duplicateGroupValue}" مكررة داخل المتغير "${groupName}"`)
        return
      }
    }

    const generatableOptionGroups = getGeneratableOptionGroups(optionGroups)

    if (variantCombinations.length > 100) {
      setError('عدد التركيبات كبير جدًا. قلل عدد القيم أو المتغيرات قبل الحفظ.')
      return
    }

    let cleanedVariants: Array<{
      id: string
      options: Array<{ name: string; value: string }>
      price: number | null
      stock: number
      sku: string | null
      isActive: boolean
    }>

    try {
      const expectedOptionCount = generatableOptionGroups.length
      const combinationKeys = new Set<string>()

      cleanedVariants = variantCombinations.map((combination) => {
        const combinationLabel = getCombinationDisplayLabel(
          combination.selection,
          optionGroups
        )
        const combinationOptions = getCombinationOptionsPayload(
          combination.selection,
          optionGroups
        )
        const variantPrice = combination.price.trim()
        const parsedVariantPrice =
          variantPrice === '' ? null : Number.parseFloat(variantPrice)
        const parsedVariantStock = Number.parseInt(combination.stock || '0', 10)

        if (!combinationOptions.length || combinationOptions.length !== expectedOptionCount) {
          throw new Error('تعذر إنشاء خيارات كاملة لإحدى التركيبات. راجع أسماء المتغيرات والقيم.')
        }

        if (
          parsedVariantPrice !== null &&
          (!Number.isFinite(parsedVariantPrice) || parsedVariantPrice < 0)
        ) {
          throw new Error(`سعر التركيبة "${combinationLabel}" غير صالح`)
        }

        if (!Number.isFinite(parsedVariantStock) || parsedVariantStock < 0) {
          throw new Error(`مخزون التركيبة "${combinationLabel}" غير صالح`)
        }

        const combinationKey = combinationOptions
          .map((option) => `${option.name}:${option.value}`)
          .join('|')

        if (combinationKeys.has(combinationKey)) {
          throw new Error(`التركيبة "${combinationLabel}" مكررة`)
        }

        combinationKeys.add(combinationKey)

        return {
          id: combination.id.trim() || nanoid(),
          options: combinationOptions,
          price: parsedVariantPrice,
          stock: parsedVariantStock,
          sku: combination.sku.trim() ? combination.sku.trim() : null,
          isActive: getResolvedCombinationIsActive(combination),
        }
      })
    } catch (variantError) {
      setError(
        variantError instanceof Error
          ? variantError.message
          : 'بيانات التركيبات غير صالحة'
      )
      return
    }

    setSaving(true)

    try {
      const payload = {
        name: normalizedName,
        description: description.trim() || null,
        shortDescription: shortDescription.trim() || null,
        price: parsedPrice,
        compareAtPrice: parsedCompareAtPrice,
        costPrice: parsedCostPrice,
        categoryId: categoryId || null,
        sku: sku.trim() || null,
        stock: parsedStock,
        sortOrder: parsedSortOrder,
        trackInventory,
        isDigital,
        isActive,
        isFeatured,
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
        images,
        variants: cleanedVariants,
        translations: Object.keys(translations).length > 0 ? translations : null,
      }

      const response = await fetch(
        isEditMode ? `/api/dashboard/products/${productId}` : '/api/dashboard/products',
        {
          method: isEditMode ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const data = await parseResponseBody(response)
      if (!response.ok || !data.success) {
        throw new Error(getApiErrorMessage(response, data, 'تعذر إكمال الطلب'))
      }

      if (isEditMode) {
        setNotice('تم حفظ التعديلات بنجاح')
      } else {
        router.push('/dashboard/products')
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر حفظ المنتج')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!productId) return
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.')) return

    setDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/dashboard/products/${productId}`, {
        method: 'DELETE',
      })
      const data = await parseResponseBody(response)

      if (!response.ok || !data.success) {
        throw new Error(getApiErrorMessage(response, data, 'تعذر إكمال الطلب'))
      }

      router.push('/dashboard/products')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'تعذر حذف المنتج')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-[var(--ds-text-muted)]">جاري تحميل بيانات المنتج...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
          <p className="text-sm text-[var(--ds-text-muted)]">
            أدخل بيانات المنتج ثم احفظه كمسودة أو انشره مباشرة في المتجر.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/products"
            className="rounded-lg border border-[var(--ds-border)] px-4 py-2 hover:bg-[var(--ds-surface-muted)]"
          >
            رجوع
          </Link>
          {canDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {deleting ? 'جاري الحذف...' : 'حذف المنتج'}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="space-y-4 card-surface p-4 sm:p-6">
            <h2 className="text-lg font-semibold">المعلومات الأساسية</h2>

            <div>
              <label className="mb-1 block text-sm font-medium">اسم المنتج *</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
              />
              <p className="mt-1 text-xs text-[var(--ds-text-muted)]">
                سيتم إنشاء رابط المنتج تلقائيًا من الاسم بهذا الشكل:{' '}
                <span dir="ltr">/product/{productSlugPreview}</span>
              </p>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium">وصف المنتج</label>
                <button
                  type="button"
                  onClick={handleAiDescribe}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 disabled:opacity-50"
                >
                  {aiLoading ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      جاري الكتابة...
                    </>
                  ) : '✨ اقتراح بالذكاء الاصطناعي'}
                </button>
              </div>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">عنوان SEO</label>
              <input
                type="text"
                value={seoTitle}
                onChange={(event) => setSeoTitle(event.target.value)}
                maxLength={70}
                className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">وصف SEO</label>
              <textarea
                value={seoDescription}
                onChange={(event) => setSeoDescription(event.target.value)}
                rows={3}
                maxLength={160}
                className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
              />
            </div>
          </section>

          <section className="space-y-4 card-surface p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">صور المنتج</h2>
            </div>

            <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-[var(--ds-surface-muted)]/40 p-4">
              <p className="text-sm font-medium text-[var(--ds-text)]">أضف صور المنتج بشكل واضح لجذب العملاء</p>
              <p className="mt-1 text-xs text-[var(--ds-text-muted)]">
                يمكنك اختيار أكثر من صورة من الجهاز أو التقاط صورة فورية بالكاميرا.
              </p>

              <div className="mt-3 flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700">
                  <span aria-hidden="true">+</span>
                  <span>{uploading ? 'جاري الرفع...' : 'اختيار صور من الجهاز'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-4 py-2 text-sm font-medium text-[var(--ds-text)] transition hover:bg-[var(--ds-surface-muted)]">
                  <span aria-hidden="true">+</span>
                  <span>{uploading ? 'جاري الرفع...' : 'التقاط صورة بالكاميرا'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {images.length ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {images.map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}`} className="relative overflow-hidden rounded-lg border border-[var(--ds-border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="" className="h-28 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                      className="absolute left-2 top-2 rounded-full bg-[var(--ds-primary)]/70 px-2 py-0.5 text-xs text-white"
                    >
                      إزالة
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--ds-text-muted)]">لم يتم رفع أي صور لهذا المنتج بعد.</p>
            )}
          </section>

          <section className="space-y-4 card-surface p-4 sm:p-6">
            <h2 className="text-lg font-semibold">الأسعار والمخزون</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">السعر الأساسي</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">سعر المقارنة قبل الخصم (اختياري)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={compareAtPrice}
                  onChange={(event) => setCompareAtPrice(event.target.value)}
                  className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">رمز المخزون (SKU) - اختياري</label>
                <input
                  type="text"
                  dir="ltr"
                  value={sku}
                  onChange={(event) => setSku(event.target.value)}
                  placeholder="اتركه فارغًا ليتم إنشاؤه تلقائيًا"
                  className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                />
                <p className="mt-1 text-xs text-[var(--ds-text-muted)]">
                  يستخدم لتتبع المنتج في المخزن والفواتير. إذا تركته فارغًا سيتم توليده تلقائيًا.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">المخزون الأساسي</label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
                  className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 card-surface p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">المتغيرات</h2>
              <button
                type="button"
                onClick={addOptionGroup}
                className="rounded-lg border border-[var(--ds-border)] px-3 py-1.5 text-sm hover:bg-[var(--ds-surface-muted)]"
              >
                + إضافة متغير
              </button>
            </div>

            <p className="text-sm text-[var(--ds-text-muted)]">
              عرّف أسماء المتغيرات وقيمها مثل اللون والمقاس. سيتم إنشاء كل التركيبات الممكنة تلقائيًا لتحديد السعر والمخزون وSKU لكل تركيبة.
            </p>

            {variantWarning ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {variantWarning}
              </div>
            ) : null}

            {optionGroups.length === 0 ? (
              <p className="text-sm text-[var(--ds-text-muted)]">لا توجد متغيرات بعد. أضف متغيرًا لبدء إنشاء التركيبات.</p>
            ) : (
              <div className="space-y-4">
                {optionGroups.map((group, groupIndex) => (
                  <div key={group.id} className="space-y-4 rounded-lg border border-[var(--ds-border)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">متغير #{groupIndex + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeOptionGroup(group.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        إزالة المتغير
                      </button>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">اسم المتغير</label>
                      <input
                        type="text"
                        value={group.name}
                        onChange={(event) => updateOptionGroup(group.id, { name: event.target.value })}
                        placeholder="مثال: اللون"
                        className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                      />
                    </div>

                    <div className="space-y-3">
                      {group.values.map((valueItem, valueIndex) => (
                        <div
                          key={valueItem.id}
                          className="flex flex-col gap-3 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)]/20 p-3 sm:flex-row sm:items-end"
                        >
                          <div className="min-w-0 flex-1">
                            <label className="mb-1 block text-xs font-medium text-[var(--ds-text-muted)]">
                              قيمة #{valueIndex + 1}
                            </label>
                            <input
                              type="text"
                              value={valueItem.value}
                              onChange={(event) =>
                                updateOptionGroupValue(group.id, valueItem.id, {
                                  value: event.target.value,
                                })
                              }
                              placeholder="مثال: أحمر"
                              className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeOptionGroupValue(group.id, valueItem.id)}
                            disabled={group.values.length <= 1}
                            className="rounded-lg border border-[var(--ds-border)] px-3 py-2 text-sm hover:bg-[var(--ds-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            حذف
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => addOptionGroupValue(group.id)}
                      className="rounded-lg border border-[var(--ds-border)] px-3 py-1.5 text-sm hover:bg-[var(--ds-surface-muted)]"
                    >
                      + إضافة قيمة
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-muted)]/15 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">التركيبات النهائية</h3>
                  <p className="text-sm text-[var(--ds-text-muted)]">
                    حدد السعر والمخزون وSKU لكل تركيبة. عطّل أي تركيبة غير موجودة فعليًا في متجرك.
                  </p>
                </div>
                <span className="rounded-full border border-[var(--ds-border)] px-3 py-1 text-xs font-medium text-[var(--ds-text-muted)]">
                  {variantCombinations.length} تركيبة
                </span>
              </div>

              {variantCombinations.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--ds-border)] px-4 py-5 text-sm text-[var(--ds-text-muted)]">
                  أكمل أسماء المتغيرات والقيم ليتم توليد التركيبات النهائية تلقائيًا.
                </p>
              ) : (
                <div className="space-y-3">
                  {variantCombinations.map((combination) => (
                    <div
                      key={combination.id}
                      className="space-y-4 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold">
                            {getCombinationDisplayLabel(combination.selection, optionGroups)}
                          </p>
                          <p className="text-xs text-[var(--ds-text-muted)]">
                            هذه هي الصيغة التي ستظهر للعميل عند اختيار هذه التركيبة.
                          </p>
                        </div>

                        <div className="space-y-1 text-sm">
                          <label className="inline-flex items-center gap-2 font-medium">
                            <input
                              type="checkbox"
                              checked={getResolvedCombinationIsActive(combination)}
                              onChange={(event) =>
                                updateVariantCombination(combination.id, {
                                  isActive: event.target.checked,
                                  isActiveManuallySet: true,
                                })
                              }
                              className="h-4 w-4 rounded border-[var(--ds-border)]"
                            />
                            التركيبة نشطة
                          </label>
                          {!combination.isActiveManuallySet ? (
                            <p className="text-xs text-[var(--ds-text-muted)]">
                              يتم تحديدها تلقائيًا من المخزون. أي مخزون أكبر من 0 يفعّل هذه التركيبة.
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-sm font-medium">سعر خاص (اختياري)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={combination.price}
                            onChange={(event) =>
                              updateVariantCombination(combination.id, {
                                price: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium">المخزون</label>
                          <input
                            type="number"
                            min="0"
                            value={combination.stock}
                            onChange={(event) =>
                              updateVariantCombination(combination.id, {
                                stock: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium">SKU التركيبة</label>
                          <input
                            type="text"
                            dir="ltr"
                            value={combination.sku}
                            onChange={(event) =>
                              updateVariantCombination(combination.id, {
                                sku: event.target.value,
                              })
                            }
                            placeholder="اختياري"
                            className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="space-y-3 card-surface p-4 sm:p-6">
            <h2 className="text-lg font-semibold">التصنيف</h2>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
            >
              <option value="">بدون تصنيف</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </section>

          <section className="space-y-3 card-surface p-4 sm:p-6">
            <h2 className="text-lg font-semibold">الحالة</h2>
            <select
              value={isActive ? 'active' : 'draft'}
              onChange={(event) => setIsActive(event.target.value === 'active')}
              className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
            >
              <option value="active">نشط</option>
              <option value="draft">مسودة</option>
            </select>
            <p className="text-xs text-[var(--ds-text-muted)]">
              {isActive
                ? 'المنتج سيظهر في المتجر بعد الحفظ.'
                : 'سيبقى المنتج مخفيًا عن واجهة المتجر حتى تغيير حالته إلى نشط.'}
            </p>
          </section>

          <section className="space-y-3 card-surface p-4 sm:p-6">
            <h2 className="text-lg font-semibold">إعدادات الظهور</h2>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(event) => setIsFeatured(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[var(--ds-border)]"
              />
              <span>
                <span className="block text-sm font-medium">منتج مميز</span>
                <span className="block text-xs text-[var(--ds-text-muted)]">
                  يظهر هذا المنتج في قسم المنتجات المميزة بواجهة المتجر.
                </span>
              </span>
            </label>
          </section>

          <details className="card-surface p-4 sm:p-6">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--ds-text)]">
              إعدادات متقدمة (اختياري)
            </summary>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">الوصف القصير</label>
                <textarea
                  value={shortDescription}
                  onChange={(event) => setShortDescription(event.target.value)}
                  rows={3}
                  maxLength={300}
                  className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">سعر التكلفة</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costPrice}
                  onChange={(event) => setCostPrice(event.target.value)}
                  className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">ترتيب العرض</label>
                <input
                  type="number"
                  min="0"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                />
              </div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={trackInventory}
                  onChange={(event) => setTrackInventory(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[var(--ds-border)]"
                />
                <span className="text-sm text-[var(--ds-text)]">تتبع المخزون</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={isDigital}
                  onChange={(event) => setIsDigital(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[var(--ds-border)]"
                />
                <span className="text-sm text-[var(--ds-text)]">منتج رقمي</span>
              </label>
            </div>
          </details>

          {/* Translations Section */}
          <section className="space-y-4 card-surface p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">الترجمات</h2>
              <button
                type="button"
                onClick={() => {
                  if (!translations.en) {
                    setTranslations((prev) => ({ ...prev, en: { name: '', description: '', shortDescription: '' } }))
                  }
                }}
                className="rounded-lg border border-[var(--ds-border)] px-3 py-1.5 text-sm hover:bg-[var(--ds-surface-muted)]"
              >
                + إضافة ترجمة إنجليزية
              </button>
            </div>
            <p className="text-sm text-[var(--ds-text-muted)]">
              أضف ترجمة للمنتج ليظهر بلغات أخرى عند تفعيل اللغات المتعددة في إعدادات المتجر.
            </p>

            {Object.keys(translations).length === 0 && (
              <p className="text-sm text-[var(--ds-text-muted)] italic">لا توجد ترجمات مضافة بعد.</p>
            )}

            {Object.entries(translations).map(([langCode, trans]) => (
              <div key={langCode} className="space-y-3 rounded-lg border border-[var(--ds-border)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {langCode === 'en' ? 'English' : langCode.toUpperCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTranslations((prev) => {
                        const next = { ...prev }
                        delete next[langCode]
                        return next
                      })
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    إزالة
                  </button>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">اسم المنتج ({langCode})</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={trans.name ?? ''}
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [langCode]: { ...prev[langCode], name: e.target.value },
                      }))
                    }
                    className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">الوصف القصير ({langCode})</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={trans.shortDescription ?? ''}
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [langCode]: { ...prev[langCode], shortDescription: e.target.value },
                      }))
                    }
                    className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">الوصف الكامل ({langCode})</label>
                  <textarea
                    dir="ltr"
                    value={trans.description ?? ''}
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [langCode]: { ...prev[langCode], description: e.target.value },
                      }))
                    }
                    rows={4}
                    className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                  />
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-3 card-surface p-4 sm:p-6">
            <h2 className="text-lg font-semibold">الحفظ</h2>
            <p className="text-sm text-[var(--ds-text-muted)]">
              {isActive
                ? 'سيتم حفظ المنتج كمنتج نشط وظاهر في المتجر.'
                : 'سيتم حفظ المنتج كمسودة ولن يظهر في المتجر.'}
            </p>

            <button
              type="button"
              onClick={() => void submitProduct()}
              disabled={saving || uploading}
              className="w-full rounded-lg bg-[var(--ds-primary)] px-4 py-2 text-white hover:bg-[var(--ds-primary-hover)] disabled:opacity-60"
            >
              {saving ? 'جاري الحفظ...' : isActive ? 'حفظ كمنتج نشط' : 'حفظ كمسودة'}
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}






