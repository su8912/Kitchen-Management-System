/**
 * Dummy data for the UI prototype. No backend.
 *
 * Seeded from RasoiVibhag-Requirements.md. Where the requirements flagged a gap
 * (the Grocery item list, bhojanshala names, dishes, opening stock, minimumQty),
 * plausible placeholders are used so the screens have something to render —
 * these are NOT real department data and are marked in the UI as sample data.
 */
import type {
  Bhojanshala,
  BhojanshalaCount,
  CategoryFormConfig,
  Dish,
  Item,
  ItemCategory,
  Menu,
  RasoiSeva,
  SalaryTransaction,
  Staff,
  Transaction,
  User,
} from '@/lib/types'
import { addDays, todayISO } from '@/lib/utils'

// ── Categories ────────────────────────────────────────────────────────────

export const categories: ItemCategory[] = [
  { id: 1, nameE: 'Grocery', nameG: 'કરિયાણું', nameH: 'किराना' },
  { id: 2, nameE: 'Dairy', nameG: 'ડેરી', nameH: 'डेयरी' },
  { id: 3, nameE: 'Vegetables', nameG: 'શાકભાજી', nameH: 'सब्ज़ी' },
  { id: 4, nameE: 'Gas', nameG: 'ગેસ', nameH: 'गैस' },
  { id: 5, nameE: 'Prasad Box', nameG: 'પ્રસાદ બોક્સ', nameH: 'प्रसाद बॉक्स' },
  { id: 6, nameE: 'Sabha Count', nameG: 'સભા સંખ્યા', nameH: 'सभा संख्या' },
  { id: 7, nameE: 'Other Expenses', nameG: 'અન્ય ખર્ચ', nameH: 'अन्य खर्च' },
]

/**
 * The generic bit: which fields each (category × transaction type) form collects.
 * This is the single source of truth for which types a category supports —
 * a category with no CONSUMPTION row here simply has no stock balance.
 */
export const formConfigs: CategoryFormConfig[] = [
  // Grocery, Dairy, Vegetables — purchase AND consumption ⇒ stock-tracked
  { id: 1, itemCategoryId: 1, transactionType: 'PURCHASE', fields: ['QTY', 'PURCHASE_AMOUNT', 'SEVA_AMOUNT', 'SUPPLIER', 'REMARKS'] },
  { id: 2, itemCategoryId: 1, transactionType: 'CONSUMPTION', fields: ['QTY', 'REMARKS'] },
  { id: 3, itemCategoryId: 2, transactionType: 'PURCHASE', fields: ['QTY', 'PURCHASE_AMOUNT', 'SEVA_AMOUNT', 'SUPPLIER', 'REMARKS'] },
  { id: 4, itemCategoryId: 2, transactionType: 'CONSUMPTION', fields: ['QTY', 'REMARKS'] },
  { id: 5, itemCategoryId: 3, transactionType: 'PURCHASE', fields: ['QTY', 'PURCHASE_AMOUNT', 'SEVA_AMOUNT', 'SUPPLIER', 'REMARKS'] },
  { id: 6, itemCategoryId: 3, transactionType: 'CONSUMPTION', fields: ['QTY', 'REMARKS'] },
  // Purchase-only ⇒ cost/count records, no stock balance
  { id: 7, itemCategoryId: 4, transactionType: 'PURCHASE', fields: ['QTY', 'PURCHASE_AMOUNT', 'SUPPLIER', 'REMARKS'] },
  { id: 8, itemCategoryId: 5, transactionType: 'PURCHASE', fields: ['QTY', 'PURCHASE_AMOUNT', 'SEVA_AMOUNT', 'REMARKS'] },
  // Sabha Count carries no money fields at all — it's a headcount.
  { id: 9, itemCategoryId: 6, transactionType: 'PURCHASE', fields: ['QTY', 'REMARKS'] },
  { id: 10, itemCategoryId: 7, transactionType: 'PURCHASE', fields: ['QTY', 'PURCHASE_AMOUNT', 'SUPPLIER', 'REMARKS'] },
]

// ── Items ─────────────────────────────────────────────────────────────────

export const items: Item[] = [
  // Grocery — placeholder list; the real one must come from the kitchen (§16.1)
  { id: 1, nameE: 'Rice', nameG: 'ચોખા', nameH: 'चावल', unit: 'KG', itemCategoryId: 1, minimumQty: 50, openingStock: 120, isActive: true },
  { id: 2, nameE: 'Wheat Flour', nameG: 'ઘઉંનો લોટ', nameH: 'गेहूं का आटा', unit: 'KG', itemCategoryId: 1, minimumQty: 40, openingStock: 80, isActive: true },
  { id: 3, nameE: 'Toor Dal', nameG: 'તુવેર દાળ', nameH: 'तूर दाल', unit: 'KG', itemCategoryId: 1, minimumQty: 25, openingStock: 45, isActive: true },
  { id: 4, nameE: 'Sugar', nameG: 'ખાંડ', nameH: 'चीनी', unit: 'KG', itemCategoryId: 1, minimumQty: 20, openingStock: 30, isActive: true },
  { id: 5, nameE: 'Oil', nameG: 'તેલ', nameH: 'तेल', unit: 'LITRE', itemCategoryId: 1, minimumQty: 30, openingStock: 35, isActive: true },
  // Dairy
  { id: 6, nameE: 'Milk', nameG: 'દૂધ', nameH: 'दूध', unit: 'LITRE', itemCategoryId: 2, minimumQty: 50, openingStock: 60, isActive: true },
  { id: 7, nameE: 'Ghee', nameG: 'ઘી', nameH: 'घी', unit: 'KG', itemCategoryId: 2, minimumQty: 10, openingStock: 22, isActive: true },
  // Vegetables
  { id: 8, nameE: 'Potato', nameG: 'બટાટા', nameH: 'आलू', unit: 'KG', itemCategoryId: 3, minimumQty: 30, openingStock: 40, isActive: true },
  { id: 9, nameE: 'Onion', nameG: 'ડુંગળી', nameH: 'प्याज़', unit: 'KG', itemCategoryId: 3, minimumQty: 25, openingStock: 35, isActive: true },
  { id: 10, nameE: 'Tomato', nameG: 'ટામેટા', nameH: 'टमाटर', unit: 'KG', itemCategoryId: 3, minimumQty: 20, openingStock: 18, isActive: true },
  // Gas — purchase only, so no stock balance can be computed (§16.7)
  { id: 11, nameE: 'Gas Line', nameG: 'ગેસ લાઇન', nameH: 'गैस लाइन', unit: 'METER_READING', itemCategoryId: 4, minimumQty: null, openingStock: 0, isActive: true },
  { id: 12, nameE: 'Cylinder', nameG: 'સિલિન્ડર', nameH: 'सिलेंडर', unit: 'CYLINDER_COUNT', itemCategoryId: 4, minimumQty: null, openingStock: 0, isActive: true },
  // Count-only categories
  { id: 13, nameE: 'Prasad Box', nameG: 'પ્રસાદ બોક્સ', nameH: 'प्रसाद बॉक्स', unit: 'COUNT', itemCategoryId: 5, minimumQty: null, openingStock: 0, isActive: true },
  { id: 14, nameE: 'Ravisabha', nameG: 'રવિસભા', nameH: 'रविसभा', unit: 'COUNT', itemCategoryId: 6, minimumQty: null, openingStock: 0, isActive: true },
  // Other
  { id: 15, nameE: 'Misc Expense', nameG: 'પરચૂરણ ખર્ચ', nameH: 'विविध खर्च', unit: 'COUNT', itemCategoryId: 7, minimumQty: null, openingStock: 0, isActive: true },
]

// ── Bhojanshala ───────────────────────────────────────────────────────────

export const bhojanshalas: Bhojanshala[] = [
  { id: 1, nameE: 'Main Bhojanshala', nameG: 'મુખ્ય ભોજનશાળા', nameH: 'मुख्य भोजनशाला', isActive: true },
  { id: 2, nameE: 'Sant Bhojanshala', nameG: 'સંત ભોજનશાળા', nameH: 'संत भोजनशाला', isActive: true },
  { id: 3, nameE: 'Yuvak Bhojanshala', nameG: 'યુવક ભોજનશાળા', nameH: 'युवक भोजनशाला', isActive: true },
]

// ── Dishes ────────────────────────────────────────────────────────────────

export const dishes: Dish[] = [
  { id: 1, nameE: 'Rotli', nameG: 'રોટલી', nameH: 'रोटली', isActive: true },
  { id: 2, nameE: 'Dal', nameG: 'દાળ', nameH: 'दाल', isActive: true },
  { id: 3, nameE: 'Bhat', nameG: 'ભાત', nameH: 'भात', isActive: true },
  { id: 4, nameE: 'Shaak', nameG: 'શાક', nameH: 'शाक', isActive: true },
  { id: 5, nameE: 'Khichdi', nameG: 'ખીચડી', nameH: 'खिचड़ी', isActive: true },
  { id: 6, nameE: 'Kadhi', nameG: 'કઢી', nameH: 'कढ़ी', isActive: true },
  { id: 7, nameE: 'Sheero', nameG: 'શીરો', nameH: 'शीरा', isActive: true },
  { id: 8, nameE: 'Thepla', nameG: 'થેપલા', nameH: 'थेपला', isActive: true },
  { id: 9, nameE: 'Chaas', nameG: 'છાશ', nameH: 'छाछ', isActive: true },
  { id: 10, nameE: 'Laddu', nameG: 'લાડુ', nameH: 'लड्डू', isActive: true },
]

// ── Users ─────────────────────────────────────────────────────────────────

export const users: User[] = [
  {
    id: 1, name: 'Nilesh Patel', username: 'admin', role: 'ADMIN', isActive: true,
    categoryIds: [1, 2, 3, 4, 5, 6, 7], bhojanshalaIds: [1, 2, 3],
  },
  {
    id: 2, name: 'Rameshbhai', username: 'ramesh', role: 'DATA_ENTRY', isActive: true,
    // Store keeper — groceries and vegetables only, main bhojanshala
    categoryIds: [1, 3], bhojanshalaIds: [1],
  },
  {
    id: 3, name: 'Kiritbhai', username: 'kirit', role: 'DATA_ENTRY', isActive: true,
    // Dairy and gas, sant + yuvak bhojanshala
    categoryIds: [2, 4], bhojanshalaIds: [2, 3],
  },
  {
    id: 4, name: 'Jayeshbhai', username: 'jayesh', role: 'DATA_ENTRY', isActive: false,
    categoryIds: [5, 6], bhojanshalaIds: [1],
  },
]

// ── Staff ─────────────────────────────────────────────────────────────────

export const staff: Staff[] = [
  { id: 1, name: 'રમેશભાઈ', designation: 'રસોઈયા (Cook)', monthlySalary: 15000, remarks: null, isActive: true },
  { id: 2, name: 'મુકેશભાઈ', designation: 'મદદનીશ (Helper)', monthlySalary: 10000, remarks: null, isActive: true },
  { id: 3, name: 'દિનેશભાઈ', designation: 'સ્ટોર કીપર (Store Keeper)', monthlySalary: 12000, remarks: null, isActive: true },
  { id: 4, name: 'સુરેશભાઈ', designation: 'સફાઈ (Cleaning)', monthlySalary: 8000, remarks: null, isActive: true },
]

const thisYear = new Date().getFullYear()
const thisMonth = new Date().getMonth() + 1
const prevMonth = thisMonth === 1 ? 12 : thisMonth - 1
const prevMonthYear = thisMonth === 1 ? thisYear - 1 : thisYear

export const salaryTransactions: SalaryTransaction[] = [
  { id: 1, staffId: 1, year: prevMonthYear, month: prevMonth, monthlySalary: 15000, advance: 1000, paidOn: null, remarks: null },
  { id: 2, staffId: 2, year: prevMonthYear, month: prevMonth, monthlySalary: 10000, advance: null, paidOn: null, remarks: null },
  { id: 3, staffId: 3, year: prevMonthYear, month: prevMonth, monthlySalary: 12000, advance: 2000, paidOn: null, remarks: null },
  { id: 4, staffId: 4, year: prevMonthYear, month: prevMonth, monthlySalary: 8000, advance: null, paidOn: null, remarks: null },
]

// ── Transactions ──────────────────────────────────────────────────────────

const T = todayISO()
const at = (dayOffset: number, hour: number) =>
  `${addDays(T, dayOffset)}T${String(hour).padStart(2, '0')}:00:00`

/**
 * Some purchases deliberately have purchaseAmount = null — those are the ones
 * a data-entry user recorded and the admin has not yet priced from the bill.
 * They are what the "Pending Amounts" worklist picks up.
 */
export const transactions: Transaction[] = [
  // ── today
  { id: 1, datetime: at(0, 7), transactionType: 'PURCHASE', itemId: 6, qty: 60, purchaseAmount: null, sevaAmount: null, supplier: 'શ્રી દૂધ ડેરી', remarks: null, createdById: 3, createdAt: at(0, 7) },
  { id: 2, datetime: at(0, 8), transactionType: 'PURCHASE', itemId: 8, qty: 40, purchaseAmount: null, sevaAmount: null, supplier: 'રામજી શાક ભંડાર', remarks: null, createdById: 2, createdAt: at(0, 8) },
  { id: 3, datetime: at(0, 8), transactionType: 'PURCHASE', itemId: 10, qty: 25, purchaseAmount: null, sevaAmount: null, supplier: 'રામજી શાક ભંડાર', remarks: null, createdById: 2, createdAt: at(0, 8) },
  { id: 4, datetime: at(0, 9), transactionType: 'CONSUMPTION', itemId: 1, qty: 35, purchaseAmount: null, sevaAmount: null, supplier: null, remarks: 'સવારની રસોઈ', createdById: 2, createdAt: at(0, 9) },
  { id: 5, datetime: at(0, 9), transactionType: 'CONSUMPTION', itemId: 6, qty: 40, purchaseAmount: null, sevaAmount: null, supplier: null, remarks: null, createdById: 3, createdAt: at(0, 9) },

  // ── yesterday
  { id: 6, datetime: at(-1, 7), transactionType: 'PURCHASE', itemId: 6, qty: 55, purchaseAmount: 2750, sevaAmount: null, supplier: 'શ્રી દૂધ ડેરી', remarks: null, createdById: 3, createdAt: at(-1, 7) },
  { id: 7, datetime: at(-1, 8), transactionType: 'PURCHASE', itemId: 9, qty: 30, purchaseAmount: 900, sevaAmount: null, supplier: 'રામજી શાક ભંડાર', remarks: null, createdById: 2, createdAt: at(-1, 8) },
  { id: 8, datetime: at(-1, 8), transactionType: 'PURCHASE', itemId: 1, qty: 100, purchaseAmount: 5500, sevaAmount: 5500, supplier: 'પટેલ કરિયાણા', remarks: 'દાતા દ્વારા સેવા', createdById: 2, createdAt: at(-1, 8) },
  { id: 9, datetime: at(-1, 10), transactionType: 'PURCHASE', itemId: 12, qty: 2, purchaseAmount: 2200, sevaAmount: null, supplier: 'ભારત ગેસ', remarks: null, createdById: 3, createdAt: at(-1, 10) },
  { id: 10, datetime: at(-1, 11), transactionType: 'CONSUMPTION', itemId: 8, qty: 30, purchaseAmount: null, sevaAmount: null, supplier: null, remarks: null, createdById: 2, createdAt: at(-1, 11) },
  { id: 11, datetime: at(-1, 11), transactionType: 'CONSUMPTION', itemId: 6, qty: 50, purchaseAmount: null, sevaAmount: null, supplier: null, remarks: null, createdById: 3, createdAt: at(-1, 11) },
  { id: 12, datetime: at(-1, 12), transactionType: 'PURCHASE', itemId: 13, qty: 200, purchaseAmount: 4000, sevaAmount: 2000, supplier: null, remarks: 'રવિસભા પ્રસાદ', createdById: 2, createdAt: at(-1, 12) },

  // ── 2 days ago
  { id: 13, datetime: at(-2, 7), transactionType: 'PURCHASE', itemId: 6, qty: 58, purchaseAmount: 2900, sevaAmount: null, supplier: 'શ્રી દૂધ ડેરી', remarks: null, createdById: 3, createdAt: at(-2, 7) },
  { id: 14, datetime: at(-2, 8), transactionType: 'PURCHASE', itemId: 7, qty: 10, purchaseAmount: 5500, sevaAmount: null, supplier: 'શ્રી દૂધ ડેરી', remarks: null, createdById: 3, createdAt: at(-2, 8) },
  { id: 15, datetime: at(-2, 9), transactionType: 'PURCHASE', itemId: 3, qty: 40, purchaseAmount: 4800, sevaAmount: null, supplier: 'પટેલ કરિયાણા', remarks: null, createdById: 2, createdAt: at(-2, 9) },
  { id: 16, datetime: at(-2, 11), transactionType: 'CONSUMPTION', itemId: 3, qty: 18, purchaseAmount: null, sevaAmount: null, supplier: null, remarks: null, createdById: 2, createdAt: at(-2, 11) },
  { id: 17, datetime: at(-2, 11), transactionType: 'CONSUMPTION', itemId: 7, qty: 4, purchaseAmount: null, sevaAmount: null, supplier: null, remarks: null, createdById: 3, createdAt: at(-2, 11) },
  { id: 18, datetime: at(-2, 15), transactionType: 'PURCHASE', itemId: 15, qty: 1, purchaseAmount: 1100, sevaAmount: null, supplier: 'સ્થાનિક', remarks: 'વાસણ સમારકામ', createdById: 2, createdAt: at(-2, 15) },

  // ── 3 days ago
  { id: 19, datetime: at(-3, 7), transactionType: 'PURCHASE', itemId: 6, qty: 62, purchaseAmount: 3100, sevaAmount: null, supplier: 'શ્રી દૂધ ડેરી', remarks: null, createdById: 3, createdAt: at(-3, 7) },
  { id: 20, datetime: at(-3, 9), transactionType: 'PURCHASE', itemId: 5, qty: 30, purchaseAmount: 4200, sevaAmount: null, supplier: 'પટેલ કરિયાણા', remarks: null, createdById: 2, createdAt: at(-3, 9) },
  { id: 21, datetime: at(-3, 10), transactionType: 'CONSUMPTION', itemId: 1, qty: 40, purchaseAmount: null, sevaAmount: null, supplier: null, remarks: null, createdById: 2, createdAt: at(-3, 10) },
  { id: 22, datetime: at(-3, 10), transactionType: 'CONSUMPTION', itemId: 9, qty: 22, purchaseAmount: null, sevaAmount: null, supplier: null, remarks: null, createdById: 2, createdAt: at(-3, 10) },
  { id: 23, datetime: at(-3, 12), transactionType: 'PURCHASE', itemId: 14, qty: 500, purchaseAmount: null, sevaAmount: null, supplier: null, remarks: 'રવિસભા', createdById: 2, createdAt: at(-3, 12) },

  // ── 4 days ago
  { id: 24, datetime: at(-4, 8), transactionType: 'PURCHASE', itemId: 2, qty: 80, purchaseAmount: 3200, sevaAmount: null, supplier: 'પટેલ કરિયાણા', remarks: null, createdById: 2, createdAt: at(-4, 8) },
  { id: 25, datetime: at(-4, 8), transactionType: 'PURCHASE', itemId: 4, qty: 25, purchaseAmount: 1125, sevaAmount: null, supplier: 'પટેલ કરિયાણા', remarks: null, createdById: 2, createdAt: at(-4, 8) },
  { id: 26, datetime: at(-4, 11), transactionType: 'CONSUMPTION', itemId: 2, qty: 30, purchaseAmount: null, sevaAmount: null, supplier: null, remarks: null, createdById: 2, createdAt: at(-4, 11) },
  { id: 27, datetime: at(-4, 11), transactionType: 'CONSUMPTION', itemId: 10, qty: 15, purchaseAmount: null, sevaAmount: null, supplier: null, remarks: null, createdById: 2, createdAt: at(-4, 11) },
]

// ── Bhojanshala counts ────────────────────────────────────────────────────

let bcId = 1
export const bhojanshalaCounts: BhojanshalaCount[] = []
const COUNT_SEED: Record<number, [number, number, number]> = {
  1: [420, 560, 380],
  2: [90, 120, 85],
  3: [150, 210, 140],
}
for (let d = -4; d <= 0; d++) {
  for (const b of bhojanshalas) {
    const [m, a, e] = COUNT_SEED[b.id]
    const jitter = (n: number) => Math.max(0, n + Math.round((((d * 7 + b.id * 13) % 11) - 5) * 4))
    // Today's evening count isn't in yet — the meal hasn't happened.
    const rows: [import('@/lib/types').MealTime, number][] = [
      ['MORNING', jitter(m)],
      ['AFTERNOON', jitter(a)],
      ['EVENING', jitter(e)],
    ]
    for (const [meal, count] of rows) {
      if (d === 0 && meal === 'EVENING') continue
      bhojanshalaCounts.push({
        id: bcId++,
        date: addDays(T, d),
        bhojanshalaId: b.id,
        mealTime: meal,
        count,
        remarks: null,
      })
    }
  }
}

// ── Menus ─────────────────────────────────────────────────────────────────

let menuId = 1
export const menus: Menu[] = []
const MENU_SEED: Record<import('@/lib/types').MealTime, number[][]> = {
  MORNING: [[1, 4, 9], [5, 6], [8, 9]],
  AFTERNOON: [[1, 2, 3, 4], [1, 4, 6, 3], [1, 2, 3, 4, 10]],
  EVENING: [[1, 4, 2], [5, 9], [1, 4, 3]],
}
for (let d = -4; d <= 1; d++) {
  for (const b of bhojanshalas) {
    for (const meal of ['MORNING', 'AFTERNOON', 'EVENING'] as const) {
      const variants = MENU_SEED[meal]
      const pick = variants[Math.abs(d + b.id) % variants.length]
      menus.push({
        id: menuId++,
        date: addDays(T, d),
        mealTime: meal,
        bhojanshalaId: b.id,
        dishIds: pick,
        remarks: null,
      })
    }
  }
}

// ── Rasoi Seva ────────────────────────────────────────────────────────────

export const rasoiSevas: RasoiSeva[] = [
  {
    id: 1,
    date: T,
    donorName: 'પટેલ પરિવાર',
    amount: 21000,
    remarks: 'જન્મદિવસ નિમિત્તે',
    slots: [
      { bhojanshalaId: 1, mealTime: 'MORNING', personCount: 420 },
      { bhojanshalaId: 1, mealTime: 'AFTERNOON', personCount: 560 },
      { bhojanshalaId: 2, mealTime: 'AFTERNOON', personCount: 120 },
    ],
  },
  {
    id: 2,
    date: T,
    donorName: 'શાહ પરિવાર',
    amount: 11000,
    remarks: null,
    slots: [
      { bhojanshalaId: 3, mealTime: 'AFTERNOON', personCount: 210 },
      { bhojanshalaId: 1, mealTime: 'EVENING', personCount: 380 },
    ],
  },
  {
    // Shares today's Main-afternoon and Sant-afternoon slots with the Patel
    // parivar — so those meals show two parivars and a combined total.
    id: 6,
    date: T,
    donorName: 'ત્રિવેદી પરિવાર',
    amount: 8000,
    remarks: null,
    slots: [
      { bhojanshalaId: 1, mealTime: 'MORNING', personCount: 80 },
      { bhojanshalaId: 1, mealTime: 'AFTERNOON', personCount: 150 },
      { bhojanshalaId: 2, mealTime: 'AFTERNOON', personCount: 60 },
    ],
  },
  {
    id: 3,
    date: addDays(T, 1),
    donorName: 'મહેતા પરિવાર',
    amount: 15000,
    remarks: 'આવતીકાલની સેવા',
    slots: [
      { bhojanshalaId: 1, mealTime: 'MORNING', personCount: 400 },
      { bhojanshalaId: 1, mealTime: 'AFTERNOON', personCount: 550 },
    ],
  },
  {
    id: 4,
    date: addDays(T, -1),
    donorName: 'દેસાઈ પરિવાર',
    amount: 18000,
    remarks: null,
    slots: [
      { bhojanshalaId: 1, mealTime: 'AFTERNOON', personCount: 540 },
      { bhojanshalaId: 2, mealTime: 'MORNING', personCount: 95 },
      { bhojanshalaId: 3, mealTime: 'EVENING', personCount: 130 },
    ],
  },
  {
    id: 5,
    date: addDays(T, -3),
    donorName: 'જોષી પરિવાર',
    amount: 9000,
    remarks: null,
    slots: [
      { bhojanshalaId: 2, mealTime: 'AFTERNOON', personCount: 115 },
      { bhojanshalaId: 3, mealTime: 'AFTERNOON', personCount: 200 },
    ],
  },
]
