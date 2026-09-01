# Rasoi Vibhag — UI prototype

Front-end only. **No backend** — all data is dummy data held in memory (`src/mock/`), so changes are lost on refresh. Built to the spec in [`../RasoiVibhag-Requirements.md`](../RasoiVibhag-Requirements.md).

```bash
npm install
npm run dev
```

## Trying it out

There is no login. Use the **user switcher in the top-right** to move between roles — it stands in for auth:

| User | Role | Scope |
|---|---|---|
| Nilesh Patel | Admin | Everything |
| Rameshbhai | Data Entry | Grocery + Vegetables · Main Bhojanshala |
| Kiritbhai | Data Entry | Dairy + Gas · Sant + Yuvak Bhojanshala |

Switching to a data-entry user is the quickest way to see the access model work: the admin nav disappears, the item picker narrows to their categories, and the money fields vanish from the entry form.

## What to look at

**Transaction Entry** (`/entry`) is the centrepiece. One form serves all seven categories — what it renders comes from `category_form_config`, not from code. The side panel shows which fields the current (category × type × role) resolves to. Switch category from Grocery to Sabha Count and watch the money fields disappear, because a headcount has no money.

**Pending Amounts** (`/pending`, admin) is the other half of that: data-entry users record quantities, the admin prices them from bills. The list is *derived* — a purchase appears whenever its category collects an amount and none is set — so there is no status flag to go stale.

**Reports → Stock** shows the range-aware opening balance: opening is the balance *as at the range start*, not the item's original opening stock, so every row reconciles left to right.

**Bhojanshala Count** (`/counts`) is the layout that changes shape rather than reflowing — a grid on desktop, one card per bhojanshala on a phone.

## Structure

```
src/
  lib/types.ts        domain types + labels; mirrors the Prisma schema
  lib/utils.ts        date/money/qty formatting
  mock/data.ts        seed data
  mock/store.tsx      in-memory store; stands in for the API.
                      Holds every derived rule — stock, pending amounts,
                      effective_fields — so screens can't drift from them.
  components/ui/      shadcn primitives
  pages/              one file per screen
```

## Known gaps

Carried over from the requirements — placeholders, not real department data:

- The **Grocery item list**, **bhojanshala names**, **dishes**, **opening stock** and **`minimum_qty`** values are all invented. They need to come from the kitchen.
- All **Hindi (`name_h`)** names are machine translations awaiting a native review.
- **PDF/Excel export** buttons are stubs. In the real build these are server-side — and the PDF pipeline must embed a Gujarati font (Noto Sans Gujarati), or every Gujarati name renders as blank boxes.
- Meal-time windows (morning until 11:00, afternoon until 16:00) are placeholders that decide which meal Today's Meal opens on.
