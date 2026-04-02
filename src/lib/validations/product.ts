import { z } from 'zod'

const productSlugRegex = /^[a-z0-9\u0600-\u06FF-]+$/
const MAX_DECIMAL_10_2 = 99_999_999.99

export const variantOptionSchema = z.object({
  name: z.string().trim().min(1, { error: 'اسم الخيار مطلوب' }),
  value: z.string().trim().min(1, { error: 'قيمة الخيار مطلوبة' }),
})

export const productVariantSchema = z.object({
  id: z.string().trim().min(1, { error: 'معرف المتغير مطلوب' }),
  options: z.array(variantOptionSchema).min(1, {
    error: 'يجب إضافة خيار واحد على الأقل لكل متغير',
  }),
  price: z
    .number({ error: 'سعر المتغير يجب أن يكون رقمًا' })
    .min(0, { error: 'سعر المتغير يجب أن يكون 0 أو أكثر' })
    .max(MAX_DECIMAL_10_2, {
      error: 'سعر المتغير أكبر من الحد المسموح (99,999,999.99)',
    })
    .nullable(),
  stock: z
    .number({ error: 'مخزون المتغير يجب أن يكون رقمًا' })
    .int({ error: 'مخزون المتغير يجب أن يكون رقمًا صحيحًا' })
    .min(0, { error: 'مخزون المتغير يجب أن يكون 0 أو أكثر' }),
  sku: z.string().trim().min(1, { error: 'رمز المتغير غير صالح' }).nullable(),
  isActive: z.coerce.boolean().default(true),
})

type ParsedProductVariant = z.infer<typeof productVariantSchema>

function getVariantOptionsSignature(options: ParsedProductVariant['options']): string {
  return options
    .map((option) => `${option.name}:${option.value}`)
    .sort()
    .join('|')
}

function getVariantOptionNames(options: ParsedProductVariant['options']): string[] {
  return options.map((option) => option.name).sort()
}

function validateVariantCombinations(
  variants: ParsedProductVariant[],
  ctx: z.RefinementCtx
) {
  if (!variants.length) return

  let expectedOptionNames: string[] | null = null
  const seenSignatures = new Set<string>()

  variants.forEach((variant, variantIndex) => {
    const optionNames = variant.options.map((option) => option.name)
    const uniqueOptionNames = new Set(optionNames)

    if (uniqueOptionNames.size !== optionNames.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'كل تركيبة يجب أن تحتوي على أسماء متغيرات غير مكررة',
        path: ['variants', variantIndex, 'options'],
      })
    }

    const normalizedOptionNames = getVariantOptionNames(variant.options)

    if (!expectedOptionNames) {
      expectedOptionNames = normalizedOptionNames
    } else {
      const hasSameNames =
        expectedOptionNames.length === normalizedOptionNames.length &&
        expectedOptionNames.every(
          (name, index) => name === normalizedOptionNames[index]
        )

      if (!hasSameNames) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'كل تركيبة يجب أن تحتوي على نفس أسماء المتغيرات',
          path: ['variants', variantIndex, 'options'],
        })
      }
    }

    const signature = getVariantOptionsSignature(variant.options)
    if (seenSignatures.has(signature)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'هذه التركيبة مكررة',
        path: ['variants', variantIndex, 'options'],
      })
    }

    seenSignatures.add(signature)
  })
}

const createProductSchemaBase = z.object({
  name: z.string().trim().min(2, { error: 'اسم المنتج مطلوب' }).max(200),
  slug: z
    .string()
    .trim()
    .min(2, { error: 'رابط المنتج يجب أن يكون حرفين على الأقل' })
    .max(200)
    .regex(productSlugRegex, {
      error: 'رابط المنتج يقبل الأحرف والأرقام والشرطة فقط',
    }),
  description: z.string().trim().optional().nullable(),
  shortDescription: z.string().trim().max(300).optional().nullable(),
  price: z.coerce
    .number()
    .min(0, { error: 'السعر يجب أن يكون 0 أو أكثر' })
    .max(MAX_DECIMAL_10_2, { error: 'السعر أكبر من الحد المسموح (99,999,999.99)' }),
  compareAtPrice: z.coerce
    .number()
    .min(0, { error: 'سعر المقارنة يجب أن يكون 0 أو أكثر' })
    .max(MAX_DECIMAL_10_2, { error: 'سعر المقارنة أكبر من الحد المسموح (99,999,999.99)' })
    .optional()
    .nullable(),
  costPrice: z.coerce
    .number()
    .min(0, { error: 'سعر التكلفة يجب أن يكون 0 أو أكثر' })
    .max(MAX_DECIMAL_10_2, { error: 'سعر التكلفة أكبر من الحد المسموح (99,999,999.99)' })
    .optional()
    .nullable(),
  sku: z.string().trim().optional().nullable(),
  barcode: z.string().trim().optional().nullable(),
  stock: z.coerce.number().int().min(0, { error: 'المخزون يجب أن يكون 0 أو أكثر' }).default(0),
  trackInventory: z.coerce.boolean().default(true),
  isActive: z.coerce.boolean().default(true),
  isFeatured: z.coerce.boolean().default(false),
  isDigital: z.coerce.boolean().default(false),
  weight: z.coerce.number().min(0).optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  categoryId: z.string().uuid({ error: 'التصنيف غير صالح' }).optional().nullable(),
  tags: z.array(z.string().trim()).optional(),
  images: z.array(z.string().url({ error: 'رابط الصورة غير صالح' })).default([]),
  seoTitle: z.string().trim().max(70).optional().nullable(),
  seoDescription: z.string().trim().max(160).optional().nullable(),
  variants: z.array(productVariantSchema).max(100, { error: 'عدد المتغيرات كبير جدًا' }).default([]),
  translations: z.record(z.string(), z.object({
    name: z.string().trim().max(200).optional(),
    description: z.string().trim().optional(),
    shortDescription: z.string().trim().max(300).optional(),
  })).optional().nullable(),
})

export const createProductSchema = createProductSchemaBase.superRefine((data, ctx) => {
  validateVariantCombinations(data.variants, ctx)
})

const updateProductSchemaBase = z.object({
  name: z.string().trim().min(2, { error: 'اسم المنتج مطلوب' }).max(200).optional(),
  slug: z
    .string()
    .trim()
    .min(2, { error: 'رابط المنتج يجب أن يكون حرفين على الأقل' })
    .max(200)
    .regex(productSlugRegex, {
      error: 'رابط المنتج يقبل الأحرف والأرقام والشرطة فقط',
    })
    .optional(),
  description: z.string().trim().optional().nullable(),
  shortDescription: z.string().trim().max(300).optional().nullable(),
  price: z.coerce
    .number()
    .min(0, { error: 'السعر يجب أن يكون 0 أو أكثر' })
    .max(MAX_DECIMAL_10_2, { error: 'السعر أكبر من الحد المسموح (99,999,999.99)' })
    .optional(),
  compareAtPrice: z.coerce
    .number()
    .min(0, { error: 'سعر المقارنة يجب أن يكون 0 أو أكثر' })
    .max(MAX_DECIMAL_10_2, { error: 'سعر المقارنة أكبر من الحد المسموح (99,999,999.99)' })
    .optional()
    .nullable(),
  costPrice: z.coerce
    .number()
    .min(0, { error: 'سعر التكلفة يجب أن يكون 0 أو أكثر' })
    .max(MAX_DECIMAL_10_2, { error: 'سعر التكلفة أكبر من الحد المسموح (99,999,999.99)' })
    .optional()
    .nullable(),
  sku: z.string().trim().optional().nullable(),
  barcode: z.string().trim().optional().nullable(),
  stock: z.coerce.number().int().min(0, { error: 'المخزون يجب أن يكون 0 أو أكثر' }).optional(),
  trackInventory: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  isDigital: z.coerce.boolean().optional(),
  weight: z.coerce.number().min(0).optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  categoryId: z.string().uuid({ error: 'التصنيف غير صالح' }).optional().nullable(),
  tags: z.array(z.string().trim()).optional(),
  images: z.array(z.string().url({ error: 'رابط الصورة غير صالح' })).optional(),
  seoTitle: z.string().trim().max(70).optional().nullable(),
  seoDescription: z.string().trim().max(160).optional().nullable(),
  variants: z.array(productVariantSchema).max(100, { error: 'عدد المتغيرات كبير جدًا' }).optional(),
  translations: z.record(z.string(), z.object({
    name: z.string().trim().max(200).optional(),
    description: z.string().trim().optional(),
    shortDescription: z.string().trim().max(300).optional(),
  })).optional().nullable(),
})

export const updateProductSchema = updateProductSchemaBase.superRefine((data, ctx) => {
  if (!data.variants) return

  validateVariantCombinations(data.variants, ctx)
})

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, { error: 'اسم التصنيف مطلوب' }).max(100),
  description: z.string().trim().optional().nullable(),
  imageUrl: z.string().url({ error: 'رابط الصورة غير صالح' }).optional().nullable(),
  parentId: z.string().uuid({ error: 'التصنيف الأب غير صالح' }).optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
})

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, { error: 'اسم التصنيف مطلوب' }).max(100).optional(),
  description: z.string().trim().optional().nullable(),
  imageUrl: z.string().url({ error: 'رابط الصورة غير صالح' }).optional().nullable(),
  parentId: z.string().uuid({ error: 'التصنيف الأب غير صالح' }).optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.coerce.boolean().optional(),
})
