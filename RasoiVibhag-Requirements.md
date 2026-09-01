# Rasoi Vibhag — Requirements

**રસોડા વિભાગ / Temple Kitchen Management System**

| | |
|---|---|
| **Stack** | React + shadcn/ui · Node + Prisma + PostgreSQL |
| **Status** | Requirements — no code written yet |
| **Date** | 14 July 2026 |

---

## 1. Purpose

The Rasoi Vibhag needs a system to record what the kitchen **buys**, what it **consumes**, what it **serves**, and what it **spends** — replacing the spreadsheets used today.

Two halves, deliberately independent of each other:

| Half | Covers |
|---|---|
| **Items & money** | Purchases, consumption, stock, expenses, salary |
| **Bhojanshala & meals** | Headcounts, menus, rasoi seva (donor-sponsored meals) |

They share no foreign keys. A purchase of 30kg potatoes is not linked to a meal served; the kitchen tracks the two separately.

### The governing design decision

**One generic `transaction` table, driven by per-category form configuration.**

Rather than a separate table and screen per expense type (milk, vegetables, gas, prasad…), there is *one* transaction table and *one* entry form. What a form shows is **configuration, not code** — so a new category can be added by an admin without a developer, a migration, or a new screen.

Everything in §2–§4 follows from this.

---

## 2. `item_category`

Seven categories. What distinguishes them is **which transaction types they permit**.

| id | name_e | name_g | name_h | Transaction types |
|---|---|---|---|---|
| 1 | Grocery | કરિયાણું | किराना | PURCHASE + CONSUMPTION |
| 2 | Dairy | ડેરી | डेयरी | PURCHASE + CONSUMPTION |
| 3 | Vegetables | શાકભાજી | सब्ज़ी | PURCHASE + CONSUMPTION |
| 4 | Gas | ગેસ | गैस | PURCHASE only |
| 5 | Prasad Box | પ્રસાદ બોક્સ | प्रसाद बॉक्स | PURCHASE only |
| 6 | Sabha Count | સભા સંખ્યા | सभा संख्या | PURCHASE only |
| 7 | Other Expenses | અન્ય ખર્ચ | अन्य खर्च | PURCHASE only |

Transaction types are **data, not code**. A category may be purchase-only, consumption-only, or both. None of the current seven is consumption-only, but the model supports one without any change.

### CONSUMPTION ⇒ stock

This is the key rule of the whole system:

> **A category has a stock balance if and only if it permits CONSUMPTION.**

Consumption is stock going *out*. Without it, there is nothing to subtract, so no balance can exist.

```
stock = opening + Σ qty(PURCHASE) − Σ qty(CONSUMPTION)
```

| | Categories | Stock tracked? |
|---|---|---|
| Purchase **and** consumption | Grocery, Dairy, Vegetables | ✅ Yes |
| Purchase only | Gas, Prasad Box, Sabha Count, Other Expenses | ❌ No — cost/count records only |

`minimum_qty` and the min-stock alerts are therefore only meaningful for **Grocery, Dairy and Vegetables**.

> ⚠️ **Open question.** Gas is purchase-only, so *cylinders on hand cannot be computed*. If the kitchen wants to know how many cylinders are in the store, Gas needs CONSUMPTION enabled too.

---

## 3. `category_form_config` — the generic part

Configuration is keyed by **(category × transaction type)**, not by category alone.

The reason: Grocery permits both types, but a grocery **purchase** needs supplier and amounts, while a grocery **consumption** needs neither. A single field list per category cannot express that difference.

```
category_form_config
  id                (pk)
  item_category_id  fk → item_category
  transaction_type  PURCHASE | CONSUMPTION
  fields            FormField[]
  @@unique([item_category_id, transaction_type])
```

### The floor and the ceiling

| | Fields |
|---|---|
| **Always present** — never configurable | `datetime`, `item_id`, `qty`, `remarks` |
| **Configurable** — pick any subset | `purchase_amount`, `seva_amount`, `supplier` |

Adding a new optional field later means extending the `FormField` enum — nothing else.

### Seed configuration

| Category | Type | Fields |
|---|---|---|
| Grocery / Dairy / Vegetables | PURCHASE | QTY, PURCHASE_AMOUNT, SEVA_AMOUNT, SUPPLIER, REMARKS |
| Grocery / Dairy / Vegetables | CONSUMPTION | QTY, REMARKS |
| Gas | PURCHASE | QTY, PURCHASE_AMOUNT, SUPPLIER, REMARKS |
| Prasad Box | PURCHASE | QTY, PURCHASE_AMOUNT, SEVA_AMOUNT, REMARKS |
| Sabha Count | PURCHASE | QTY, REMARKS |
| Other Expenses | PURCHASE | QTY, PURCHASE_AMOUNT, SUPPLIER, REMARKS |

**This config is the single source of truth.** It drives *both* the React form (which inputs render) and the API validation (which fields are accepted and required) — one definition, not two that drift apart.

`category_form_config` also tells you which types a category supports, so **do not also keep a `transactionTypes` array on `item_category`** — it would be a second copy of the same fact.

Sabha Count is the proof the design holds: it is a headcount, so its config carries no money fields at all, and the generic form simply renders qty + remarks.

---

## 4. `transaction`

One table. Datetime-wise, per item.

| Field | Type | Notes |
|---|---|---|
| `id` | pk | |
| `datetime` | DateTime | |
| `transaction_type` | enum | PURCHASE \| CONSUMPTION |
| `item_id` | fk → item | the category comes from the item |
| `qty` | Decimal | |
| `purchase_amount` | Decimal? | null until the admin prices it from the bill |
| `seva_amount` | Decimal? | donor covering this purchase — **income** |
| `supplier` | String? | free text |
| `remarks` | String? | |
| `created_by` / `created_at` | audit | |
| `updated_by` / `updated_at` | audit | |

The table is the **superset** of every possible field; each configurable column is nullable. `category_form_config` decides which are collected and required for a given (category, type).

### Validation rules

1. The transaction's type must be **permitted for the item's category** — a CONSUMPTION row against a Gas item is rejected.
2. Any field **not enabled** in that category's config is rejected.
3. `purchase_amount` and `seva_amount` may only be set by an **ADMIN** (see §10).

### Two things this table deliberately does *not* have

**No `rate` column.** The amount is entered directly, not computed from qty × rate. If a unit rate is ever wanted, it is `purchase_amount ÷ qty`.

**`seva_amount` is not an offset.** It is income, tracked separately:

```
Kharch report    = Σ purchase_amount        (the FULL amount)
Donation report  = Σ seva_amount  +  Σ rasoi_seva.amount
Balance          = donations − kharch
```

A donor sponsoring ₹1,500 of a ₹2,000 purchase does **not** reduce the recorded expense to ₹500. The expense is ₹2,000 and the donation is ₹1,500.

---

## 5. `item`

```
item
  id (pk)
  name_e, name_g, name_h
  unit               KG | Litre | Count | Cylinder Count | Meter Reading
  item_category_id   fk → item_category
  minimum_qty        -- drives min-stock alerts
```

`unit` should be an **enum, not free text** — stock arithmetic depends on it being consistent.

### Seed items

**An initial list, not the kitchen's real one.**

| name_e | name_g | name_h | unit | Category | minimum_qty |
|---|---|---|---|---|---|
| Milk | દૂધ | दूध | Litre | Dairy | *TBD* |
| Ghee | ઘી | घी | KG | Dairy | *TBD* |
| Potato | બટાટા | आलू | KG | Vegetables | *TBD* |
| Onion | ડુંગળી | प्याज़ | KG | Vegetables | *TBD* |
| Tomato | ટામેટા | टमाटर | KG | Vegetables | *TBD* |
| Gas Line | ગેસ લાઇન | गैस लाइन | Meter Reading | Gas | n/a |
| Cylinder | સિલિન્ડર | सिलेंडर | Cylinder Count | Gas | n/a |
| Prasad Box | પ્રસાદ બોક્સ | प्रसाद बॉक्स | Count | Prasad Box | n/a |
| Sabha (Ravisabha) | રવિસભા | रविसभा | Count | Sabha Count | n/a |

> ⚠️ **Grocery has no items yet — and Grocery is stock-tracked.** Rice, dal, flour, oil, sugar, spices: the real list must come from the kitchen. This is the most important gap to fill before go-live. Left empty here rather than guessed at.

> ⚠️ **Every `minimum_qty` is TBD.** These drive the min-stock alerts, so they need collecting per item for the three stock-tracked categories.

> ⚠️ **Ghee is filed under Dairy.** Many kitchens treat it as Grocery — worth a decision.

---

## 6. Bhojanshala

**Independent of items, purchases and consumption.** Headcount only, no stock, no foreign key to the item half of the app.

The mandir serves food **three times a day** and may have **several bhojanshalas**. Counts are collected **date-wise, per bhojanshala, per meal**.

```
bhojanshala
  id (pk)
  name_e, name_g, name_h
  is_active   Boolean

bhojanshala_count
  id (pk)
  date            Date
  bhojanshala_id  fk
  meal_time       MORNING | AFTERNOON | EVENING     (સવાર / બપોર / સાંજ)
  count           Int
  remarks         String?
  @@unique([date, bhojanshala_id, meal_time])
```

The unique constraint is load-bearing: **exactly one count per bhojanshala per meal per day.** A double entry is rejected by the database rather than quietly inflating a total.

**Entry:** pick a date, get a grid — one row per bhojanshala, three columns (morning / afternoon / evening) — and fill the whole day in one save. A missed slot is visible at a glance.

---

## 7. Menu

A menu lists **dishes**. Dishes are deliberately **not** the same thing as stock items.

> `item` holds raw stock — Potato in KG, Milk in Litres, Gas cylinders.
> A menu says રોટલી, દાળ, ભાત, શાક.
>
> Keeping them apart means the menu picker never offers "Potato, 30 KG" as something to serve.

```
dish
  id (pk)
  name_e, name_g, name_h
  is_active   Boolean

menu
  id (pk)
  date            Date
  meal_time       MORNING | AFTERNOON | EVENING
  bhojanshala_id  fk
  remarks         String?
  @@unique([date, meal_time, bhojanshala_id])

menu_dish
  menu_id   fk
  dish_id   fk
  @@id([menu_id, dish_id])
```

**Entry — admin only.** Pick date + meal + bhojanshala, multi-select dishes. Include a **"copy from another day"** action — menus repeat, and re-picking dishes every day gets tedious fast.

**A data-entry user sees the menu read-only** — today only, and only for their own bhojanshalas. They need to know what to cook; they must not be able to change what was planned. See §11.

---

## 8. Rasoi Seva

A donor sponsoring meals. A seva is booked for a date and may cover **several bhojanshalas and several meals**.

**The person count is recorded per slot, not on the header** — a donor may sponsor 300 at Bhojanshala A morning and 200 at B afternoon. A single count spread across the selection would be ambiguous.

```
rasoi_seva
  id (pk)
  date          Date
  donor_name    String
  amount        Decimal?     -- donation, if any
  remarks       String?

rasoi_seva_slot
  id (pk)
  rasoi_seva_id   fk
  bhojanshala_id  fk
  meal_time       MORNING | AFTERNOON | EVENING
  person_count    Int
  @@unique([rasoi_seva_id, bhojanshala_id, meal_time])
```

**Entry — admin only.** Pick date + donor, tick the bhojanshalas and meals, give each resulting slot its own count.

**A data-entry user sees seva read-only** — today only, and only for their own bhojanshalas. They need to know who is sponsoring and for how many; they must not be able to alter a donor's booking. See §11.

### Two distinctions that must not be blurred

**`rasoi_seva.amount` vs `transaction.seva_amount`** — the first is a donation for *meals*; the second is a donor covering a specific *purchase*. Different things. The donation report sums both.

**Sponsored vs served** — `rasoi_seva_slot.person_count` is the count **booked in advance**. `bhojanshala_count.count` is what was **actually served**. Keeping them separate is what makes the over/under-catering report possible.

---

## 9. The shared slot key

Three tables key on the same triple:

```
date  ×  bhojanshala  ×  meal_time
   │
   ├── menu                → what we are serving
   ├── rasoi_seva_slot     → who sponsored it, for how many
   └── bhojanshala_count   → how many we actually served
```

That alignment is deliberate, and it gives the **"Today's Meal" panel** for free — a pure read, no new tables:

> **Today's Meal** — the landing screen for both roles. For the current date and meal, per bhojanshala:
> - **The menu** — what am I cooking?
> - **The count** — `Σ rasoi_seva_slot.person_count`. For how many?
> - **The donor(s)** — who is it for?
>
> This is what a kitchen actually needs at 6am.

> ⚠️ **Open:** "the current meal" needs **meal-time windows** to be defined — e.g. morning until 11:00, afternoon until 16:00, evening after.

---

## 10. Staff & salary

```
staff
  id (pk)
  name
  designation
  monthly_salary   Decimal
  remarks          String?
  is_active        Boolean

salary_transaction
  id (pk)
  staff_id         fk
  year             Int
  month            Int          -- 1..12
  monthly_salary   Decimal      -- SNAPSHOT, copied from staff at entry
  advance          Decimal?
  remarks          String?
  paid_on          Date?
  @@unique([staff_id, year, month])
```

**Flat monthly pay** — no attendance tracking:

```
net_payable = monthly_salary − advance          (derived, never stored)
```

### `monthly_salary` is snapshotted, not looked up

This matters. If the salary were read live from `staff`, **giving someone a raise would silently rewrite every past month's payroll.** The snapshot keeps history true. `staff.monthly_salary` is only the default that pre-fills a new month's entry.

The unique key `(staff_id, year, month)` means a month cannot be paid twice by accident.

**Salary is excluded from the Kharch report** — it has its own report.

---

## 11. Users, roles & access

```
user
  id (pk)
  name
  username         unique
  password_hash
  role             ADMIN | DATA_ENTRY
  is_active        Boolean

user_category        -- which categories a data-entry user may enter
  user_id, item_category_id
  @@id([user_id, item_category_id])

user_bhojanshala     -- which bhojanshalas they may enter for
  user_id, bhojanshala_id
  @@id([user_id, bhojanshala_id])
```

### DATA_ENTRY

Scoped to the categories and bhojanshalas assigned to them.

**What they may write:**

| Module | Access |
|---|---|
| Transactions | **Write** — their assigned categories only (the item picker is filtered to those) |
| Bhojanshala counts | **Write** — their assigned bhojanshalas only |
| **Menu** | **Read-only** — today only, their bhojanshalas |
| **Rasoi Seva** | **Read-only** — today only, their bhojanshalas |
| Reports, other users' data | **No access** |

- **Cannot enter `purchase_amount` or `seva_amount`.** Those inputs never render, and the API rejects them if posted. Quantities and remarks only.
- Sees **only their own entries**, as a datewise list. No reports, no other users' data, no totals.
- May **edit their own transaction on the same day it was made**; after that it locks and only an admin can change it. No deletes.

> **Why menu and seva are read-only.** The kitchen staff need to see *what to cook and for how many* — that's the whole point of the Today's Meal panel. But a menu is a plan and a seva is a donor's booking; neither is the storekeeper's to change. They read; the admin writes. Restricting the read to **today** also keeps the screen to what's actionable rather than a browsable history.

> **Why the same-day lock on transactions.** The admin prices entries from bills afterwards. A quantity must not change under an amount that has already been reconciled against a bill.

### ADMIN

- **All transactions**, datewise, across every user and category.
- **Updates the amount on each transaction from the bill.** This is the core admin workflow.
- **Pending Amounts worklist** — every transaction whose category config includes `PURCHASE_AMOUNT` but whose value is still null. **Derived, not a stored status flag**, so it can never go stale.
- All reports. **Reports are admin-only.**
- **Menu planning and seva booking** — admin-only writes, any date, any bhojanshala. Data-entry users only read today's.
- **User management** — create users of either role, set/reset passwords, activate/deactivate, and set each data-entry user's category and bhojanshala scope on the same screen.

### Safety rules

- **The system can never be left without an active admin.** Deactivating or demoting the last one is rejected — otherwise nobody can log in to undo it.
- **An admin cannot deactivate or demote themselves.**
- The **first admin is created by a seed script** — there is no one inside the app to create them.

### How roles compose with the form config

The config (§3) gives the fields for a (category, type). The role then filters them. `PURCHASE_AMOUNT` and `SEVA_AMOUNT` are **admin-only fields** — a static property of the `FormField` enum, not a per-user setting, so exactly one place decides it.

```
effective_fields(user, category, type)
    = category_form_config.fields
    − (user.role == DATA_ENTRY ? ADMIN_ONLY_FIELDS : ∅)
```

The **same function drives both the rendered form and the API validation** — so a data-entry user cannot post an amount even by crafting the request by hand.

---

## 12. Prisma schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TransactionType {
  PURCHASE
  CONSUMPTION
}

enum MealTime {
  MORNING
  AFTERNOON
  EVENING
}

enum Role {
  ADMIN
  DATA_ENTRY
}

enum Unit {
  KG
  LITRE
  COUNT
  CYLINDER_COUNT
  METER_READING
}

/// Optional fields a category form may collect.
/// The floor (datetime, itemId, qty, remarks) is always present and not listed here.
/// PURCHASE_AMOUNT and SEVA_AMOUNT are ADMIN-only — see effective_fields() in §11.
enum FormField {
  QTY
  PURCHASE_AMOUNT
  SEVA_AMOUNT
  SUPPLIER
  REMARKS
}

// ─────────────────────────────  Items & money  ─────────────────────────────

model ItemCategory {
  id     Int    @id @default(autoincrement())
  nameE  String
  nameG  String
  nameH  String

  items       Item[]
  formConfigs CategoryFormConfig[]
  userScopes  UserCategory[]

  @@map("item_category")
}

/// Which fields a form collects, per (category × transaction type).
/// Also the single source of truth for which types a category supports.
model CategoryFormConfig {
  id              Int             @id @default(autoincrement())
  itemCategoryId  Int
  transactionType TransactionType
  fields          FormField[]

  itemCategory ItemCategory @relation(fields: [itemCategoryId], references: [id])

  @@unique([itemCategoryId, transactionType])
  @@map("category_form_config")
}

model Item {
  id             Int      @id @default(autoincrement())
  nameE          String
  nameG          String
  nameH          String
  unit           Unit
  itemCategoryId Int
  minimumQty     Decimal? @db.Decimal(12, 3)
  openingStock   Decimal  @default(0) @db.Decimal(12, 3)
  isActive       Boolean  @default(true)

  itemCategory ItemCategory  @relation(fields: [itemCategoryId], references: [id])
  transactions Transaction[]

  @@map("item")
}

model Transaction {
  id              Int             @id @default(autoincrement())
  datetime        DateTime
  transactionType TransactionType
  itemId          Int
  qty             Decimal         @db.Decimal(12, 3)
  purchaseAmount  Decimal?        @db.Decimal(12, 2)  // admin-only; null until priced
  sevaAmount      Decimal?        @db.Decimal(12, 2)  // admin-only; income, not an offset
  supplier        String?
  remarks         String?

  createdById Int
  createdAt   DateTime @default(now())
  updatedById Int?
  updatedAt   DateTime @updatedAt

  item      Item  @relation(fields: [itemId], references: [id])
  createdBy User  @relation("TxnCreatedBy", fields: [createdById], references: [id])
  updatedBy User? @relation("TxnUpdatedBy", fields: [updatedById], references: [id])

  @@index([datetime])
  @@index([itemId, transactionType])
  @@map("transaction")
}

// ──────────────────────────  Bhojanshala & meals  ──────────────────────────

model Bhojanshala {
  id       Int     @id @default(autoincrement())
  nameE    String
  nameG    String
  nameH    String
  isActive Boolean @default(true)

  counts     BhojanshalaCount[]
  menus      Menu[]
  sevaSlots  RasoiSevaSlot[]
  userScopes UserBhojanshala[]

  @@map("bhojanshala")
}

/// How many were ACTUALLY served. Cf. RasoiSevaSlot.personCount = sponsored.
model BhojanshalaCount {
  id            Int      @id @default(autoincrement())
  date          DateTime @db.Date
  bhojanshalaId Int
  mealTime      MealTime
  count         Int
  remarks       String?

  createdById Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  bhojanshala Bhojanshala @relation(fields: [bhojanshalaId], references: [id])
  createdBy   User        @relation(fields: [createdById], references: [id])

  @@unique([date, bhojanshalaId, mealTime])
  @@map("bhojanshala_count")
}

model Dish {
  id       Int     @id @default(autoincrement())
  nameE    String
  nameG    String
  nameH    String
  isActive Boolean @default(true)

  menuDishes MenuDish[]

  @@map("dish")
}

model Menu {
  id            Int      @id @default(autoincrement())
  date          DateTime @db.Date
  mealTime      MealTime
  bhojanshalaId Int
  remarks       String?

  createdById Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  bhojanshala Bhojanshala @relation(fields: [bhojanshalaId], references: [id])
  createdBy   User        @relation(fields: [createdById], references: [id])
  dishes      MenuDish[]

  @@unique([date, mealTime, bhojanshalaId])
  @@map("menu")
}

model MenuDish {
  menuId Int
  dishId Int

  menu Menu @relation(fields: [menuId], references: [id], onDelete: Cascade)
  dish Dish @relation(fields: [dishId], references: [id])

  @@id([menuId, dishId])
  @@map("menu_dish")
}

model RasoiSeva {
  id        Int      @id @default(autoincrement())
  date      DateTime @db.Date
  donorName String
  amount    Decimal? @db.Decimal(12, 2)
  remarks   String?

  createdById Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  createdBy User            @relation(fields: [createdById], references: [id])
  slots     RasoiSevaSlot[]

  @@index([date])
  @@map("rasoi_seva")
}

/// The count is per slot, not on the header: a donor may sponsor
/// 300 at Bhojanshala A morning and 200 at B afternoon.
model RasoiSevaSlot {
  id            Int      @id @default(autoincrement())
  rasoiSevaId   Int
  bhojanshalaId Int
  mealTime      MealTime
  personCount   Int

  rasoiSeva   RasoiSeva   @relation(fields: [rasoiSevaId], references: [id], onDelete: Cascade)
  bhojanshala Bhojanshala @relation(fields: [bhojanshalaId], references: [id])

  @@unique([rasoiSevaId, bhojanshalaId, mealTime])
  @@map("rasoi_seva_slot")
}

// ───────────────────────────  Staff & salary  ───────────────────────────

model Staff {
  id            Int     @id @default(autoincrement())
  name          String
  designation   String
  monthlySalary Decimal @db.Decimal(12, 2)
  remarks       String?
  isActive      Boolean @default(true)

  salaries SalaryTransaction[]

  @@map("staff")
}

model SalaryTransaction {
  id      Int  @id @default(autoincrement())
  staffId Int
  year    Int
  month   Int  // 1..12

  /// SNAPSHOT of staff.monthlySalary at entry time — never a live lookup,
  /// otherwise a raise would rewrite every past month's payroll.
  monthlySalary Decimal  @db.Decimal(12, 2)
  advance       Decimal? @db.Decimal(12, 2)
  remarks       String?
  paidOn        DateTime? @db.Date

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  staff Staff @relation(fields: [staffId], references: [id])

  @@unique([staffId, year, month])
  @@map("salary_transaction")
}

// ────────────────────────  Users & access control  ────────────────────────

model User {
  id           Int     @id @default(autoincrement())
  name         String
  username     String  @unique
  passwordHash String
  role         Role
  isActive     Boolean @default(true)

  categories   UserCategory[]
  bhojanshalas UserBhojanshala[]

  txnsCreated  Transaction[]      @relation("TxnCreatedBy")
  txnsUpdated  Transaction[]      @relation("TxnUpdatedBy")
  counts       BhojanshalaCount[]
  menus        Menu[]
  sevas        RasoiSeva[]

  @@map("user")
}

model UserCategory {
  userId         Int
  itemCategoryId Int

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  itemCategory ItemCategory @relation(fields: [itemCategoryId], references: [id])

  @@id([userId, itemCategoryId])
  @@map("user_category")
}

model UserBhojanshala {
  userId        Int
  bhojanshalaId Int

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  bhojanshala Bhojanshala @relation(fields: [bhojanshalaId], references: [id])

  @@id([userId, bhojanshalaId])
  @@map("user_bhojanshala")
}
```

**Derived, never stored:** stock balance · net payable · the pending-amounts queue · the Today's Meal panel · every report total.

---

## 13. Reports

**Admin only.** Every report takes a date range (salary takes a year/month range).

### A. Stock report

Grouped by category, item-wise. Only the **stock-tracked categories** appear — the others have no balance.

| Item | Opening Stock | Purchased | Consumption | Available Stock |
|---|---|---|---|---|
| બટાટા (Potato) | 20 | 30 | 25 | 25 |
| ટામેટા (Tomato) | 10 | 25 | 15 | 20 |
| **Vegetables — subtotal** | **30** | **55** | **40** | **45** |

> ⚠️ **"Opening Stock" means opening *as at the range start*** — not the item's original opening balance. Get this wrong and every range except the first reports nonsense.

```
opening(range)   = item.opening_stock
                 + Σ purchase qty    BEFORE range start
                 − Σ consumption qty BEFORE range start

purchased(range) = Σ purchase qty    WITHIN range
consumed(range)  = Σ consumption qty WITHIN range

available        = opening + purchased − consumed
```

The row always reconciles left to right. Rows below `minimum_qty` are flagged.

### B. Bhojanshala report

| Date | Bhojanshala | Morning | Afternoon | Evening | Total |
|---|---|---|---|---|---|
| 21-Jun-2026 | Bhojanshala A | 400 | 500 | 350 | 1250 |
| 21-Jun-2026 | Bhojanshala B | 200 | 250 | 180 | 630 |
| … | | | | | |
| **Total** | | **600** | **750** | **530** | **1880** |

One row per (date, bhojanshala); the three meal counts pivot into columns; a **totals row** at the bottom.

### C. Rasoi Seva report

Date, donor, bhojanshala, meal, person count, amount — plus a totals row.

Plus a **sponsored vs served** view: `rasoi_seva_slot.person_count` against `bhojanshala_count.count` for the same slot. The gap is what the kitchen over- or under-catered by.

### D. Salary report

Year/month range, staff-wise: name, designation, monthly salary, advance, net payable, totals row. **Separate from Kharch.**

### E. Kharch, donations, balance

| Report | Definition |
|---|---|
| **Kharch (expense)** | `Σ purchase_amount` grouped by category. **Excludes salary.** |
| **Donations** | `Σ rasoi_seva.amount` + `Σ transaction.seva_amount` |
| **Balance** | donations − kharch |
| **Menu history** | what was served by date / meal / bhojanshala, alongside that slot's count |

### Export — PDF and Excel

Generated **server-side**. A long date range would choke a phone, and server generation keeps the output identical no matter who ran it.

- **Excel** — `exceljs`
- **PDF** — render the report's own HTML with headless Chromium (Puppeteer), reusing one layout rather than maintaining two

> 🔴 **Gujarati text in PDFs will break unless planned for.**
> PDF's built-in fonts have **no Gujarati glyphs** — the default result is a page of blank boxes, and it is almost always discovered late, after someone prints a report for a trustee.
>
> **A Gujarati-capable font (Noto Sans Gujarati) must be embedded in the PDF pipeline**, and exports must be tested with real Gujarati item and bhojanshala names — never English placeholders.

Every export carries the report title, the date range, and a generated-on timestamp — these get printed and filed, and a sheet with no range on it is worthless.

---

## 14. Screens

### Data-entry user

| Screen | |
|---|---|
| **Today's Meal** | Landing screen. Their bhojanshalas, current meal: menu, count to cook for, donors. |
| **Transaction Entry** | One generic form. Pick category (scoped to theirs) + type; the config renders the fields. **No amount inputs.** |
| **Bhojanshala Daily Count** | Date + their bhojanshalas × 3 meals. |
| **Menu** | **Read-only.** Today's dishes for their bhojanshalas. |
| **Rasoi Seva** | **Read-only.** Today's sponsored counts and donors for their bhojanshalas. |
| **My Entries** | Datewise list of their own entries. Today's are editable. |

### Admin

Everything above — with **Menu and Rasoi Seva as full editors**, any date — plus:

| Screen | |
|---|---|
| **Menu Planner** | Date + meal + bhojanshala → pick dishes. Copy-from-another-day. |
| **Rasoi Seva Entry** | Date + donor, tick bhojanshalas × meals, count per slot. |
| **All Transactions** | Datewise, across all users. Inline **amount update from the bill**. |
| **Pending Amounts** | The not-yet-priced worklist. |
| **Salary Entry** | Pick year + month → staff list pre-filled with salaries; enter advances; save the month. |
| **User Management** | Create ADMIN / DATA_ENTRY users; set/reset password; activate/deactivate; tick their **categories** and **bhojanshalas**. |
| **Masters** | Item & Category, Bhojanshala, Dish, Staff, **Category Form Config**. |
| **Reports** | Stock, Bhojanshala, Rasoi Seva, Kharch, Salary — range picker + PDF/Excel export. |

**Gujarati-first labels, English secondary** — matching how the department already works.

---

## 15. UI targets

One responsive React codebase (shadcn + Tailwind breakpoints) — **not two apps**. But the roles get genuinely different layouts, because their screens are used standing up versus sitting down.

### Data entry — phone first

Used on the floor: in the store, at the counter, one-handed.

- Large tap targets · numeric keypads on qty inputs (`inputmode="numeric"`) · single-column forms · big sticky Save button · **no horizontal scrolling anywhere**

**Layouts that must genuinely change, not merely reflow:**

| Screen | Desktop | Mobile |
|---|---|---|
| **Bhojanshala Daily Count** | Grid: bhojanshalas × 3 meal columns | **One card per bhojanshala**, three stacked inputs |
| **Rasoi Seva Entry** | Bhojanshala × meal matrix | Per-slot cards |
| **Today's Meal** | Card | Card — phone-native by nature |

A squeezed grid on a 5" screen is unusable. Same data, different shape.

### Admin — desktop first, phone-capable

Wide tables (the transaction list, the reports) live in `overflow-x: auto` containers so the **page body never scrolls sideways**; priority columns stay visible on small screens and the rest scroll.

The **amount-update flow must work on a phone** — an admin may well be pricing bills away from a desk.

### Connectivity

**Online-only.** No PWA, no offline queue. Mitigation: keep in-progress form state in `localStorage`, so a dropped request can be retried rather than retyped.

---

## 16. Open items

Nothing below is assumed into or out of scope — each needs a decision before or during the build.

| # | Open item | Blocks |
|---|---|---|
| 1 | **Grocery item list** — rice, dal, flour, oil, sugar, spices… | Seeding. Grocery is stock-tracked, so this is the biggest gap. |
| 2 | **Bhojanshala list** — how many, and their names | Seeding, and every meal screen |
| 3 | **Dish list** | Seeding the menu |
| 4 | **Opening stock** per item | Any stock balance being meaningful |
| 5 | **`minimum_qty`** per item | Min-stock alerts |
| 6 | **Meal-time windows** (morning until 11:00, afternoon until 16:00…) | Deciding "the current meal" on the Today's Meal panel |
| 7 | Should **Gas** be stock-tracked? It's purchase-only, so cylinders-on-hand cannot be computed | Gas stock reporting |
| 8 | Is **ghee** Dairy or Grocery? | Seeding |
| 9 | Do **staff names** need Gujarati/Hindi fields, or is one `name` enough? | Staff master |
| 10 | **Authentication** — assumed username + password with a session/JWT. Existing mandir SSO to hook into? | Login |
| 11 | May a **data-entry user read the item/dish masters** (they must, to pick from them) but not edit? Assumed yes, read-only. | Permissions |

> ⚠️ **All Hindi (`name_h`) values in this document are translations supplied during drafting, not data given by the department.** They must be reviewed by a native speaker before seeding. Gujarati names are as specified.
