import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

/** GET /api/categories — all authenticated users */
router.get('/', requireAuth, async (_req, res) => {
  const categories = await prisma.itemCategory.findMany({
    include: {
      formConfigs: { select: { id: true, itemCategoryId: true, transactionType: true, fields: true } },
    },
    orderBy: { id: 'asc' },
  })
  res.json(categories)
})

const FormConfigSchema = z.object({
  transactionType: z.enum(['PURCHASE', 'CONSUMPTION']),
  fields: z.array(z.enum(['QTY', 'PURCHASE_AMOUNT', 'SEVA_AMOUNT', 'SUPPLIER', 'REMARKS'])),
})

const CategoryCreateSchema = z.object({
  nameE: z.string().min(1),
  nameG: z.string().min(1),
  nameH: z.string().min(1),
  formConfigs: z.array(FormConfigSchema).min(1, 'At least one transaction type is required'),
})

/** POST /api/categories — admin only */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parse = CategoryCreateSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }

  const { nameE, nameG, nameH, formConfigs } = parse.data

  const category = await prisma.itemCategory.create({
    data: {
      nameE, nameG, nameH,
      formConfigs: {
        create: formConfigs.map((fc) => ({
          transactionType: fc.transactionType,
          fields: fc.fields,
        })),
      },
    },
    include: {
      formConfigs: { select: { id: true, itemCategoryId: true, transactionType: true, fields: true } },
    },
  })

  res.status(201).json(category)
})

/** PATCH /api/categories/:id — admin only */
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const parse = CategoryCreateSchema.partial().safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }

  const { nameE, nameG, nameH, formConfigs } = parse.data

  await prisma.$transaction(async (tx) => {
    if (nameE !== undefined || nameG !== undefined || nameH !== undefined) {
      await tx.itemCategory.update({
        where: { id },
        data: { ...(nameE && { nameE }), ...(nameG && { nameG }), ...(nameH && { nameH }) },
      })
    }
    if (formConfigs !== undefined) {
      await tx.categoryFormConfig.deleteMany({ where: { itemCategoryId: id } })
      await tx.categoryFormConfig.createMany({
        data: formConfigs.map((fc) => ({ itemCategoryId: id, transactionType: fc.transactionType, fields: fc.fields })),
      })
    }
  })

  const updated = await prisma.itemCategory.findUniqueOrThrow({
    where: { id },
    include: { formConfigs: { select: { id: true, itemCategoryId: true, transactionType: true, fields: true } } },
  })
  res.json(updated)
})

/** DELETE /api/categories/:id — admin only
 * Blocked if the category has items linked to it.
 */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  try {
    const itemCount = await prisma.item.count({ where: { itemCategoryId: id } })
    if (itemCount > 0) {
      res.status(409).json({
        error: `Cannot delete: category has ${itemCount} item(s). Delete or reassign the items first.`,
      })
      return
    }
    // Remove form configs then the category
    await prisma.$transaction([
      prisma.categoryFormConfig.deleteMany({ where: { itemCategoryId: id } }),
      prisma.userCategory.deleteMany({ where: { itemCategoryId: id } }),
      prisma.itemCategory.delete({ where: { id } }),
    ])
    res.status(204).end()
  } catch {
    res.status(404).json({ error: 'Category not found' })
  }
})

export default router
