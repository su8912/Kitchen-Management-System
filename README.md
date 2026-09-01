# Rasoi Vibhag — Temple Kitchen Management System

**રસોડા વિભાગ** — Full-stack web app for managing purchases, consumption, stock, Bhojanshala headcounts, menus, Rasoi Seva donations, staff salary, and reports.

**Stack:** React + shadcn/ui (frontend) · Node + Express + Prisma + PostgreSQL (backend)

---

## Quick Start

### 1. Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL) — or use any existing PostgreSQL 14+ instance

### 2. Start the database

```powershell
# From the project root
docker-compose up -d
```

This starts PostgreSQL on port 5432 with:
- User: `rasoi`
- Password: `rasoi123`
- Database: `rasoi_vibhag`

### 3. Set up the backend

```powershell
cd server
# .env is already copied from .env.example
# If using a different database, edit server/.env

npm install
npm run db:migrate    # creates the schema
npm run db:seed       # seeds categories, items, admin user
npm run dev           # starts on http://localhost:4000
```

**Admin credentials:** `admin` / `admin123`

### 4. Set up the frontend

```powershell
cd app
npm install
npm run dev           # starts on http://localhost:5173
```

Open **http://localhost:5173** → you'll see the login screen.

---

## Project Structure

```
Archive/
├── app/                  # React frontend (Vite + shadcn/ui + Tailwind)
│   └── src/
│       ├── lib/
│       │   ├── api.ts            # Typed fetch wrapper
│       │   ├── auth-context.tsx  # Login / logout / current user
│       │   └── types.ts          # Domain types
│       ├── mock/
│       │   └── store.tsx         # API-backed store (same interface as old mock)
│       └── pages/                # 12 feature pages
│
├── server/               # Node + Express backend
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   └── seed.ts               # Initial data + admin user
│   └── src/
│       ├── index.ts              # Express app
│       ├── middleware/auth.ts    # JWT auth
│       ├── lib/
│       │   ├── effective-fields.ts  # Field config + role filtering
│       │   └── stock.ts             # Range-aware stock calculator
│       └── routes/               # One file per resource
│
└── docker-compose.yml    # PostgreSQL for local dev
```

---

## API Overview

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/auth/login` | — | Returns JWT in httpOnly cookie |
| GET | `/api/auth/me` | Any | Current user + scope |
| POST | `/api/auth/logout` | Any | Clears cookie |
| GET | `/api/categories` | Any | With form configs |
| GET | `/api/items` | Any | Optionally `?categoryId=` |
| GET | `/api/transactions` | Any | Admin: all; Data-entry: own |
| GET | `/api/transactions/pending` | Admin | Pending amounts worklist |
| POST | `/api/transactions` | Any | Validated against form config + role |
| PATCH | `/api/transactions/:id` | Any | Data-entry: same-day own only |
| GET | `/api/counts` | Any | `?date=YYYY-MM-DD` |
| POST | `/api/counts` | Any | Upsert by slot |
| GET | `/api/menus` | Any | Data-entry: today only |
| POST | `/api/menus` | Admin | Upsert by slot |
| POST | `/api/menus/copy` | Admin | Copy day |
| GET | `/api/rasoi-seva` | Any | Data-entry: today only |
| POST | `/api/rasoi-seva` | Admin | Create with slots |
| GET/POST | `/api/salary` | Admin | Upsert by (staff, year, month) |
| GET/POST/PATCH | `/api/users` | Admin | Safety: last admin protected |
| GET | `/api/reports/stock` | Admin | Range-aware stock |
| GET | `/api/reports/bhojanshala` | Admin | Headcount pivot |
| GET | `/api/reports/rasoi-seva` | Admin | Sponsored vs served |
| GET | `/api/reports/salary` | Admin | Payroll |
| GET | `/api/reports/kharch` | Admin | Expenses + donations + balance |

---

## Business Rules Enforced

- **DATA_ENTRY** users cannot enter `purchase_amount` or `seva_amount` — both the form and the API reject them
- **Transaction type** must be permitted by the category form config (e.g. Gas is PURCHASE only)
- **Same-day lock** — DATA_ENTRY users can only edit their own transactions on the day they were created
- **Cannot deactivate/demote the last active admin**
- **Admin cannot deactivate or demote themselves**
- **Salary is snapshotted** — changing `staff.monthlySalary` does not rewrite historical payroll
- **Stock opening for a date range** is computed correctly: `openingStock + Σ purchases before range − Σ consumptions before range`

---

## Adding a New Item Category

No code changes needed. In the app:

1. **Masters → Item Category** — add the new category
2. **Masters → Category Form Config** — configure which fields the form collects
3. **Masters → Items** — add items under the new category

---

## Open Items (from §16 of requirements)

1. Real Grocery item list (rice, dal, flour, oil, sugar, spices) — currently seeded with placeholders
2. Real Bhojanshala names from the department
3. Real Dish list
4. Opening stock per item (currently 0)
5. Minimum qty per item (currently TBD)
6. Meal-time windows (default: morning < 11:00, afternoon < 16:00, evening = rest)
7. Should Gas be stock-tracked?
8. Is Ghee Dairy or Grocery?
9. Hindi name review by a native speaker
10. Any existing mandir SSO to hook into?
