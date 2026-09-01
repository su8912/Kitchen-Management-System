/**
 * Domain types — mirror the Prisma schema in RasoiVibhag-Requirements.md §12.
 * UI-only prototype: no backend, all data comes from src/mock.
 */

export type TransactionType = 'PURCHASE' | 'CONSUMPTION'

export type MealTime = 'MORNING' | 'AFTERNOON' | 'EVENING'

export type Role = 'ADMIN' | 'DATA_ENTRY'

export type Unit = 'KG' | 'LITRE' | 'COUNT' | 'CYLINDER_COUNT' | 'METER_READING'

/**
 * Optional fields a category form may collect.
 * The floor — datetime, itemId, qty, remarks — is always present, never configured.
 */
export type FormField =
  | 'QTY'
  | 'PURCHASE_AMOUNT'
  | 'SEVA_AMOUNT'
  | 'SUPPLIER'
  | 'REMARKS'

/**
 * Money fields only an ADMIN may fill. A data-entry user records what came in;
 * the admin prices it later from the bill.
 */
export const ADMIN_ONLY_FIELDS: FormField[] = ['PURCHASE_AMOUNT', 'SEVA_AMOUNT']

export interface Named {
  nameE: string
  nameG: string
  nameH: string
}

export interface ItemCategory extends Named {
  id: number
}

export interface CategoryFormConfig {
  id: number
  itemCategoryId: number
  transactionType: TransactionType
  fields: FormField[]
}

export interface Item extends Named {
  id: number
  unit: Unit
  itemCategoryId: number
  minimumQty: number | null
  openingStock: number
  isActive: boolean
}

export interface Transaction {
  id: number
  datetime: string
  transactionType: TransactionType
  itemId: number
  qty: number
  purchaseAmount: number | null
  sevaAmount: number | null
  supplier: string | null
  remarks: string | null
  createdById: number
  createdAt: string
}

export interface Bhojanshala extends Named {
  id: number
  isActive: boolean
}

export interface BhojanshalaCount {
  id: number
  date: string
  bhojanshalaId: number
  mealTime: MealTime
  count: number
  remarks: string | null
}

export interface Dish extends Named {
  id: number
  isActive: boolean
}

export interface Menu {
  id: number
  date: string
  mealTime: MealTime
  bhojanshalaId: number
  dishIds: number[]
  remarks: string | null
}

export interface RasoiSeva {
  id: number
  date: string
  donorName: string
  amount: number | null
  remarks: string | null
  slots: RasoiSevaSlot[]
}

export interface RasoiSevaSlot {
  bhojanshalaId: number
  mealTime: MealTime
  personCount: number
}

export interface Staff {
  id: number
  name: string
  designation: string
  monthlySalary: number
  remarks: string | null
  isActive: boolean
}

export interface SalaryTransaction {
  id: number
  staffId: number
  year: number
  month: number
  /** Snapshot at entry time — never a live read of staff.monthlySalary. */
  monthlySalary: number
  /** Days present (from attendance) — editable override per row. */
  daysPresent: number
  /** Per-day rate = monthlySalary ÷ daysInMonth by default, editable. */
  perDaySalary: number
  /** net = daysPresent × perDaySalary (computed in UI, not stored) */
  paidOn: string | null
  remarks: string | null
}

export interface User {
  id: number
  name: string
  username: string
  role: Role
  isActive: boolean
  /** Scope — which categories/bhojanshalas a DATA_ENTRY user may enter for. */
  categoryIds: number[]
  bhojanshalaIds: number[]
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'HOLIDAY'

export interface StaffAttendance {
  id: number
  staffId: number
  date: string   // YYYY-MM-DD
  status: AttendanceStatus
  remarks: string | null
}

// ── Labels ────────────────────────────────────────────────────────────────

export const MEAL_TIMES: MealTime[] = ['MORNING', 'AFTERNOON', 'EVENING']

export const MEAL_LABEL: Record<MealTime, { e: string; g: string; h: string }> = {
  MORNING: { e: 'Morning', g: 'સવાર', h: 'सुबह' },
  AFTERNOON: { e: 'Afternoon', g: 'બપોર', h: 'दोपहर' },
  EVENING: { e: 'Evening', g: 'સાંજ', h: 'शाम' },
}

export const TXN_LABEL: Record<TransactionType, { e: string; g: string; h: string }> = {
  PURCHASE: { e: 'Purchase', g: 'ખરીદી', h: 'खरीद' },
  CONSUMPTION: { e: 'Consumption', g: 'વપરાશ', h: 'खपत' },
}

export const UNIT_LABEL: Record<Unit, { e: string; g: string; h: string }> = {
  KG: { e: 'KG', g: 'KG', h: 'KG' },
  LITRE: { e: 'Litre', g: 'લિટર', h: 'लीटर' },
  COUNT: { e: 'Count', g: 'નંગ', h: 'संख्या' },
  CYLINDER_COUNT: { e: 'Cylinder', g: 'સિલિન્ડર', h: 'सिलिंडर' },
  METER_READING: { e: 'Meter Reading', g: 'મીટર', h: 'मीटर' },
}

export const FIELD_LABEL: Record<FormField, { e: string; g: string; h: string }> = {
  QTY: { e: 'Quantity', g: 'જથ્થો', h: 'मात्रा' },
  PURCHASE_AMOUNT: { e: 'Purchase Amount', g: 'ખરીદ રકમ', h: 'खरीद राशि' },
  SEVA_AMOUNT: { e: 'Seva Amount', g: 'સેવા રકમ', h: 'सेवा राशि' },
  SUPPLIER: { e: 'Supplier', g: 'સપ્લાયર', h: 'आपूर्तिकर्ता' },
  REMARKS: { e: 'Remarks', g: 'નોંધ', h: 'टिप्पणी' },
}

/**
 * Meal-time windows — flagged as an open question in the requirements (§16.6).
 * Placeholder values so "the current meal" resolves in the prototype.
 */
export const MEAL_WINDOWS: { meal: MealTime; untilHour: number }[] = [
  { meal: 'MORNING', untilHour: 11 },
  { meal: 'AFTERNOON', untilHour: 16 },
  { meal: 'EVENING', untilHour: 24 },
]

export function currentMeal(now = new Date()): MealTime {
  const h = now.getHours()
  return MEAL_WINDOWS.find((w) => h < w.untilHour)?.meal ?? 'EVENING'
}
