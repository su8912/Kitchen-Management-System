import { prisma } from './prisma'

/**
 * Computes stock for one item, optionally over a date range.
 *
 * The opening stock for a range is not the item's original openingStock —
 * it is: openingStock + Σ purchases BEFORE range start − Σ consumption BEFORE range start.
 * Get this wrong and every range except the first reports nonsense.
 *
 *   opening(range)   = item.openingStock
 *                    + Σ purchase qty    BEFORE range start
 *                    − Σ consumption qty BEFORE range start
 *
 *   purchased(range) = Σ purchase qty    WITHIN range
 *   consumed(range)  = Σ consumption qty WITHIN range
 *   available        = opening + purchased − consumed
 */
export async function stockFor(
  itemId: number,
  range?: { from: string; to: string },
): Promise<{ opening: number; purchased: number; consumed: number; available: number }> {
  const item = await prisma.item.findUnique({ where: { id: itemId } })
  if (!item) return { opening: 0, purchased: 0, consumed: 0, available: 0 }

  const opening = Number(item.openingStock)

  if (!range) {
    const [purchaseAgg, consumptionAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { itemId, transactionType: 'PURCHASE' },
        _sum: { qty: true },
      }),
      prisma.transaction.aggregate({
        where: { itemId, transactionType: 'CONSUMPTION' },
        _sum: { qty: true },
      }),
    ])
    const purchased = Number(purchaseAgg._sum.qty ?? 0)
    const consumed = Number(consumptionAgg._sum.qty ?? 0)
    return { opening, purchased, consumed, available: opening + purchased - consumed }
  }

  const rangeStart = new Date(range.from + 'T00:00:00.000Z')
  const rangeEnd = new Date(range.to + 'T23:59:59.999Z')

  // Transactions BEFORE the range start → build the opening balance
  const [beforePurchase, beforeConsumption] = await Promise.all([
    prisma.transaction.aggregate({
      where: { itemId, transactionType: 'PURCHASE', datetime: { lt: rangeStart } },
      _sum: { qty: true },
    }),
    prisma.transaction.aggregate({
      where: { itemId, transactionType: 'CONSUMPTION', datetime: { lt: rangeStart } },
      _sum: { qty: true },
    }),
  ])

  const openingForRange =
    opening +
    Number(beforePurchase._sum.qty ?? 0) -
    Number(beforeConsumption._sum.qty ?? 0)

  // Transactions WITHIN the range
  const [withinPurchase, withinConsumption] = await Promise.all([
    prisma.transaction.aggregate({
      where: { itemId, transactionType: 'PURCHASE', datetime: { gte: rangeStart, lte: rangeEnd } },
      _sum: { qty: true },
    }),
    prisma.transaction.aggregate({
      where: { itemId, transactionType: 'CONSUMPTION', datetime: { gte: rangeStart, lte: rangeEnd } },
      _sum: { qty: true },
    }),
  ])

  const purchased = Number(withinPurchase._sum.qty ?? 0)
  const consumed = Number(withinConsumption._sum.qty ?? 0)

  return {
    opening: openingForRange,
    purchased,
    consumed,
    available: openingForRange + purchased - consumed,
  }
}
