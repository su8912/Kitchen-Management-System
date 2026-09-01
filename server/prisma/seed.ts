/**
 * Seed script — runs once to populate the database with:
 *   1. The 7 item categories
 *   2. Form configs (which fields each category×type collects)
 *   3. Items (seed list — kitchen should update Grocery items)
 *   4. Bhojanshalas
 *   5. Dishes
 *   6. Staff
 *   7. First admin user (admin / admin123)
 *
 * Run with: npx tsx prisma/seed.ts
 * Or:       npm run db:seed
 */
import { PrismaClient, FormField, Unit } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database…')

  // ── Categories ─────────────────────────────────────────────────────────────
  const [grocery, dairy, veg, gas, prasad, sabha, other] = await Promise.all([
    prisma.itemCategory.upsert({ where: { id: 1 }, update: {}, create: { nameE: 'Grocery', nameG: 'કરિયાણું', nameH: 'किराना' } }),
    prisma.itemCategory.upsert({ where: { id: 2 }, update: {}, create: { nameE: 'Dairy', nameG: 'ડેરી', nameH: 'डेयरी' } }),
    prisma.itemCategory.upsert({ where: { id: 3 }, update: {}, create: { nameE: 'Vegetables', nameG: 'શાકભાજી', nameH: 'सब्ज़ी' } }),
    prisma.itemCategory.upsert({ where: { id: 4 }, update: {}, create: { nameE: 'Gas', nameG: 'ગેસ', nameH: 'गैस' } }),
    prisma.itemCategory.upsert({ where: { id: 5 }, update: {}, create: { nameE: 'Prasad Box', nameG: 'પ્રસાદ બોક્સ', nameH: 'प्रसाद बॉक्स' } }),
    prisma.itemCategory.upsert({ where: { id: 6 }, update: {}, create: { nameE: 'Sabha Count', nameG: 'સભા સંખ્યા', nameH: 'सभा संख्या' } }),
    prisma.itemCategory.upsert({ where: { id: 7 }, update: {}, create: { nameE: 'Other Expenses', nameG: 'અન્ય ખર્ચ', nameH: 'अन्य खर्च' } }),
  ])
  console.log('  ✓ Categories')

  // ── Form configs ────────────────────────────────────────────────────────────
  const configs = [
    // Grocery (1) — purchase + consumption → stock-tracked
    { itemCategoryId: grocery.id, transactionType: 'PURCHASE' as const, fields: [FormField.QTY, FormField.PURCHASE_AMOUNT, FormField.SEVA_AMOUNT, FormField.SUPPLIER, FormField.REMARKS] },
    { itemCategoryId: grocery.id, transactionType: 'CONSUMPTION' as const, fields: [FormField.QTY, FormField.REMARKS] },
    // Dairy (2)
    { itemCategoryId: dairy.id, transactionType: 'PURCHASE' as const, fields: [FormField.QTY, FormField.PURCHASE_AMOUNT, FormField.SEVA_AMOUNT, FormField.SUPPLIER, FormField.REMARKS] },
    { itemCategoryId: dairy.id, transactionType: 'CONSUMPTION' as const, fields: [FormField.QTY, FormField.REMARKS] },
    // Vegetables (3)
    { itemCategoryId: veg.id, transactionType: 'PURCHASE' as const, fields: [FormField.QTY, FormField.PURCHASE_AMOUNT, FormField.SEVA_AMOUNT, FormField.SUPPLIER, FormField.REMARKS] },
    { itemCategoryId: veg.id, transactionType: 'CONSUMPTION' as const, fields: [FormField.QTY, FormField.REMARKS] },
    // Gas (4) — purchase only
    { itemCategoryId: gas.id, transactionType: 'PURCHASE' as const, fields: [FormField.QTY, FormField.PURCHASE_AMOUNT, FormField.SUPPLIER, FormField.REMARKS] },
    // Prasad Box (5)
    { itemCategoryId: prasad.id, transactionType: 'PURCHASE' as const, fields: [FormField.QTY, FormField.PURCHASE_AMOUNT, FormField.SEVA_AMOUNT, FormField.REMARKS] },
    // Sabha Count (6) — no money fields
    { itemCategoryId: sabha.id, transactionType: 'PURCHASE' as const, fields: [FormField.QTY, FormField.REMARKS] },
    // Other Expenses (7)
    { itemCategoryId: other.id, transactionType: 'PURCHASE' as const, fields: [FormField.QTY, FormField.PURCHASE_AMOUNT, FormField.SUPPLIER, FormField.REMARKS] },
  ]

  for (const cfg of configs) {
    await prisma.categoryFormConfig.upsert({
      where: { itemCategoryId_transactionType: { itemCategoryId: cfg.itemCategoryId, transactionType: cfg.transactionType } },
      update: { fields: cfg.fields },
      create: cfg,
    })
  }
  console.log('  ✓ Form configs')

  // ── Items ───────────────────────────────────────────────────────────────────
  const itemSeeds = [
    // Grocery — placeholder list; real list must come from kitchen (§16.1)
    { nameE: 'Rice', nameG: 'ચોખા', nameH: 'चावल', unit: Unit.KG, itemCategoryId: grocery.id, minimumQty: 50, openingStock: 120 },
    { nameE: 'Wheat Flour', nameG: 'ઘઉંનો લોટ', nameH: 'गेहूं का आटा', unit: Unit.KG, itemCategoryId: grocery.id, minimumQty: 40, openingStock: 80 },
    { nameE: 'Toor Dal', nameG: 'તુવેર દાળ', nameH: 'तूर दाल', unit: Unit.KG, itemCategoryId: grocery.id, minimumQty: 25, openingStock: 45 },
    { nameE: 'Sugar', nameG: 'ખાંડ', nameH: 'चीनी', unit: Unit.KG, itemCategoryId: grocery.id, minimumQty: 20, openingStock: 30 },
    { nameE: 'Oil', nameG: 'તેલ', nameH: 'तेल', unit: Unit.LITRE, itemCategoryId: grocery.id, minimumQty: 30, openingStock: 35 },
    // Dairy
    { nameE: 'Milk', nameG: 'દૂધ', nameH: 'दूध', unit: Unit.LITRE, itemCategoryId: dairy.id, minimumQty: 50, openingStock: 60 },
    { nameE: 'Ghee', nameG: 'ઘી', nameH: 'घी', unit: Unit.KG, itemCategoryId: dairy.id, minimumQty: 10, openingStock: 22 },
    // Vegetables
    { nameE: 'Potato', nameG: 'બટાટા', nameH: 'आलू', unit: Unit.KG, itemCategoryId: veg.id, minimumQty: 30, openingStock: 40 },
    { nameE: 'Onion', nameG: 'ડુંગળી', nameH: 'प्याज़', unit: Unit.KG, itemCategoryId: veg.id, minimumQty: 25, openingStock: 35 },
    { nameE: 'Tomato', nameG: 'ટામેટા', nameH: 'टमाटर', unit: Unit.KG, itemCategoryId: veg.id, minimumQty: 20, openingStock: 18 },
    // Gas — purchase only, no stock balance (§16.7)
    { nameE: 'Gas Line', nameG: 'ગેસ લાઇન', nameH: 'गैस लाइन', unit: Unit.METER_READING, itemCategoryId: gas.id, minimumQty: null, openingStock: 0 },
    { nameE: 'Cylinder', nameG: 'સિલિન્ડર', nameH: 'सिलेंडर', unit: Unit.CYLINDER_COUNT, itemCategoryId: gas.id, minimumQty: null, openingStock: 0 },
    // Count-only
    { nameE: 'Prasad Box', nameG: 'પ્રસાદ બોક્સ', nameH: 'प्रसाद बॉक्स', unit: Unit.COUNT, itemCategoryId: prasad.id, minimumQty: null, openingStock: 0 },
    { nameE: 'Ravisabha', nameG: 'રવિસભા', nameH: 'रविसभा', unit: Unit.COUNT, itemCategoryId: sabha.id, minimumQty: null, openingStock: 0 },
    { nameE: 'Misc Expense', nameG: 'પરચૂરણ ખર્ચ', nameH: 'विविध खर्च', unit: Unit.COUNT, itemCategoryId: other.id, minimumQty: null, openingStock: 0 },
  ]

  for (const item of itemSeeds) {
    await prisma.item.upsert({
      where: { id: itemSeeds.indexOf(item) + 1 },
      update: {},
      create: item,
    })
  }
  console.log('  ✓ Items')

  // ── Bhojanshalas ────────────────────────────────────────────────────────────
  const bhSeeds = [
    { nameE: 'Main Bhojanshala', nameG: 'મુખ્ય ભોજનશાળા', nameH: 'मुख्य भोजनशाला' },
    { nameE: 'Sant Bhojanshala', nameG: 'સંત ભોજનશાળા', nameH: 'संत भोजनशाला' },
    { nameE: 'Yuvak Bhojanshala', nameG: 'યુવક ભોજનશાળા', nameH: 'युवक भोजनशाला' },
  ]
  for (const bh of bhSeeds) {
    await prisma.bhojanshala.upsert({
      where: { id: bhSeeds.indexOf(bh) + 1 },
      update: {},
      create: bh,
    })
  }
  console.log('  ✓ Bhojanshalas')

  // ── Dishes ──────────────────────────────────────────────────────────────────
  const dishSeeds = [
    { nameE: 'Rotli', nameG: 'રોટલી', nameH: 'रोटली' },
    { nameE: 'Dal', nameG: 'દાળ', nameH: 'दाल' },
    { nameE: 'Bhat', nameG: 'ભાત', nameH: 'भात' },
    { nameE: 'Shaak', nameG: 'શાક', nameH: 'शाक' },
    { nameE: 'Khichdi', nameG: 'ખીચડી', nameH: 'खिचड़ी' },
    { nameE: 'Kadhi', nameG: 'કઢી', nameH: 'कढ़ी' },
    { nameE: 'Sheero', nameG: 'શીરો', nameH: 'शीरा' },
    { nameE: 'Thepla', nameG: 'થેપલા', nameH: 'थेपला' },
    { nameE: 'Chaas', nameG: 'છાશ', nameH: 'छाछ' },
    { nameE: 'Laddu', nameG: 'લાડુ', nameH: 'लड्डू' },
  ]
  for (const dish of dishSeeds) {
    await prisma.dish.upsert({
      where: { id: dishSeeds.indexOf(dish) + 1 },
      update: {},
      create: dish,
    })
  }
  console.log('  ✓ Dishes')

  // ── Staff ───────────────────────────────────────────────────────────────────
  const staffSeeds = [
    { name: 'રમેશભાઈ', designation: 'રસોઈયા (Cook)', monthlySalary: 15000 },
    { name: 'મુકેશભાઈ', designation: 'મદદનીશ (Helper)', monthlySalary: 10000 },
    { name: 'દિનેશભાઈ', designation: 'સ્ટોર કીપર (Store Keeper)', monthlySalary: 12000 },
    { name: 'સુરેશભાઈ', designation: 'સફાઈ (Cleaning)', monthlySalary: 8000 },
  ]
  for (const s of staffSeeds) {
    await prisma.staff.upsert({
      where: { id: staffSeeds.indexOf(s) + 1 },
      update: {},
      create: s,
    })
  }
  console.log('  ✓ Staff')

  // ── Admin user ──────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrator',
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  })
  console.log('  ✓ Admin user (username: admin, password: admin123)')

  // Give admin access to all categories and bhojanshalas
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } })
  const allCategories = await prisma.itemCategory.findMany()
  const allBhojanshalas = await prisma.bhojanshala.findMany()

  if (adminUser) {
    // User categories
    for (const cat of allCategories) {
      await prisma.userCategory.upsert({
        where: { userId_itemCategoryId: { userId: adminUser.id, itemCategoryId: cat.id } },
        update: {},
        create: { userId: adminUser.id, itemCategoryId: cat.id },
      })
    }
    // User bhojanshalas
    for (const bh of allBhojanshalas) {
      await prisma.userBhojanshala.upsert({
        where: { userId_bhojanshalaId: { userId: adminUser.id, bhojanshalaId: bh.id } },
        update: {},
        create: { userId: adminUser.id, bhojanshalaId: bh.id },
      })
    }
    console.log('  ✓ Admin scopes set')
  }

  console.log('\n✅ Seed complete!')
  console.log('   Login: admin / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
