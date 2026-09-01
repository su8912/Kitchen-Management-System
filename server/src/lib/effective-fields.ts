import { FormField, Role } from '@prisma/client'
import { prisma } from './prisma'

export const ADMIN_ONLY_FIELDS: FormField[] = [FormField.PURCHASE_AMOUNT, FormField.SEVA_AMOUNT]

/**
 * Server-side implementation of:
 *   effective_fields(user, category, type)
 *     = config.fields − (role == DATA_ENTRY ? ADMIN_ONLY_FIELDS : ∅)
 *
 * This is the single source of truth — both the rendered form (frontend reads
 * the config via GET /api/categories) and the API validation (POST /transactions)
 * use this same logic, so a data-entry user cannot post an amount even by
 * crafting the request manually.
 */
export async function effectiveFields(
  role: Role,
  itemCategoryId: number,
  transactionType: 'PURCHASE' | 'CONSUMPTION',
): Promise<FormField[]> {
  const config = await prisma.categoryFormConfig.findUnique({
    where: {
      itemCategoryId_transactionType: { itemCategoryId, transactionType },
    },
  })
  if (!config) return []

  if (role === Role.ADMIN) return config.fields

  return config.fields.filter((f) => !ADMIN_ONLY_FIELDS.includes(f))
}

/**
 * Returns all (categoryId, transactionType) pairs that exist in the config.
 * Used to validate that a transaction type is permitted for a given category.
 */
export async function isTypePermitted(
  itemCategoryId: number,
  transactionType: 'PURCHASE' | 'CONSUMPTION',
): Promise<boolean> {
  const config = await prisma.categoryFormConfig.findUnique({
    where: {
      itemCategoryId_transactionType: { itemCategoryId, transactionType },
    },
  })
  return config !== null
}
