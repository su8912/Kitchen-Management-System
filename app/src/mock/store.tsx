/**
 * API-backed store — replaces the in-memory mock prototype.
 *
 * The public interface (useStore / Store) is intentionally identical to the
 * old mock/store.tsx so all 12 page components work without changes.
 *
 * Strategy:
 *  - Reference data (categories, items, bhojanshalas, dishes, staff, users,
 *    formConfigs) is fetched on mount and cached locally.
 *  - Transactional data (transactions, counts, menus, sevas, salaries) is
 *    also fetched and cached, then kept in sync after mutations.
 *  - All selectors (stockFor, pendingAmounts, effectiveFields…) still run
 *    client-side over the cached data — same logic as before.
 *  - Mutations call the API, then patch the local cache optimistically.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Bhojanshala,
  BhojanshalaCount,
  CategoryFormConfig,
  Dish,
  FormField,
  Item,
  ItemCategory,
  MealTime,
  Menu,
  RasoiSeva,
  SalaryTransaction,
  Staff,
  StaffAttendance,
  Transaction,
  TransactionType,
  User,
} from '@/lib/types'
import { ADMIN_ONLY_FIELDS } from '@/lib/types'
import { api } from '@/lib/api'
import { db } from '@/lib/db'
import { useAuth } from '@/lib/auth-context'
import { todayISO, addDays } from '@/lib/utils'

// ─────────────────────────── Shape ───────────────────────────────────────────

interface State {
  categories: ItemCategory[]
  formConfigs: CategoryFormConfig[]
  items: Item[]
  bhojanshalas: Bhojanshala[]
  dishes: Dish[]
  staff: Staff[]
  users: User[]
  transactions: Transaction[]
  bhojanshalaCounts: BhojanshalaCount[]
  menus: Menu[]
  rasoiSevas: RasoiSeva[]
  salaryTransactions: SalaryTransaction[]
  attendance: StaffAttendance[]
}

export interface Store extends State {
  currentUser: User
  isLoading: boolean

  // ── writes
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>
  updateTransaction: (id: number, patch: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: number) => Promise<void>
  saveBhojanshalaCounts: (date: string, rows: { bhojanshalaId: number; mealTime: MealTime; count: number }[]) => Promise<void>
  saveMenu: (m: Omit<Menu, 'id'>) => Promise<void>
  addRasoiSeva: (s: Omit<RasoiSeva, 'id'>) => Promise<void>
  saveSalary: (rows: Omit<SalaryTransaction, 'id'>[]) => Promise<void>
  saveAttendance: (rows: Omit<StaffAttendance, 'id'>[]) => Promise<void>
  fetchAttendance: (year: number, month: number) => Promise<void>
  addItem: (i: Omit<Item, 'id'>) => Promise<void>
  addBhojanshala: (b: Omit<Bhojanshala, 'id'>) => Promise<void>
  addDish: (d: Omit<Dish, 'id'>) => Promise<void>
  addStaff: (s: Omit<Staff, 'id'>) => Promise<void>
  addCategory: (payload: { nameE: string; nameG: string; nameH: string; formConfigs: { transactionType: TransactionType; fields: FormField[] }[] }) => Promise<void>
  updateCategory: (id: number, payload: { nameE: string; nameG: string; nameH: string; formConfigs: { transactionType: TransactionType; fields: FormField[] }[] }) => Promise<void>
  hardDeleteCategory: (id: number) => Promise<void>
  saveUser: (u: Omit<User, 'id'> & { id?: number }) => Promise<void>
  deactivateItem: (id: number) => Promise<void>
  deactivateBhojanshala: (id: number) => Promise<void>
  deactivateDish: (id: number) => Promise<void>
  deactivateStaff: (id: number) => Promise<void>
  reactivateItem: (id: number) => Promise<void>
  reactivateBhojanshala: (id: number) => Promise<void>
  reactivateDish: (id: number) => Promise<void>
  reactivateStaff: (id: number) => Promise<void>
  hardDeleteItem: (id: number) => Promise<void>
  hardDeleteBhojanshala: (id: number) => Promise<void>
  hardDeleteDish: (id: number) => Promise<void>
  hardDeleteStaff: (id: number) => Promise<void>
  hardDeleteUser: (id: number) => Promise<void>

  // ── selectors
  categoryById: (id: number) => ItemCategory | undefined
  itemById: (id: number) => Item | undefined
  bhojanshalaById: (id: number) => Bhojanshala | undefined
  dishById: (id: number) => Dish | undefined
  userById: (id: number) => User | undefined

  typesForCategory: (categoryId: number) => TransactionType[]
  effectiveFields: (categoryId: number, type: TransactionType, user: User) => FormField[]
  isStockTracked: (categoryId: number) => boolean
  visibleCategories: () => ItemCategory[]
  visibleBhojanshalas: () => Bhojanshala[]

  stockFor: (itemId: number, range?: { from: string; to: string }) => {
    opening: number; purchased: number; consumed: number; available: number
  }
  pendingAmounts: () => Transaction[]
  countFor: (date: string, bhojanshalaId: number, meal: MealTime) => number | null
  menuFor: (date: string, bhojanshalaId: number, meal: MealTime) => Menu | undefined
  sevaFor: (date: string, bhojanshalaId: number, meal: MealTime) => {
    personCount: number; donors: string[]; byDonor: { donor: string; personCount: number }[]
  }
  /** Reload all data from the API (e.g. after admin saves a user). */
  reload: () => Promise<void>
  /** Returns effective attendance days for a staff member in a given month. */
  attendanceSummary: (staffId: number, year: number, month: number) => { present: number; halfDay: number; absent: number; effectiveDays: number }
}

// ─────────────────────────── Context ─────────────────────────────────────────

const Ctx = createContext<Store | null>(null)

// ─────────────────────────── Provider ────────────────────────────────────────

// Category API response includes nested formConfigs
interface CategoryWithConfigs extends ItemCategory {
  formConfigs: CategoryFormConfig[]
}

const INITIAL: State = {
  categories: [], formConfigs: [], items: [], bhojanshalas: [],
  dishes: [], staff: [], users: [], transactions: [],
  bhojanshalaCounts: [], menus: [], rasoiSevas: [], salaryTransactions: [],
  attendance: [],
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user: currentUser } = useAuth()
  const [state, setState] = useState<State>(INITIAL)
  const [isLoading, setIsLoading] = useState(true)

  // ── Fetch all data ─────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!currentUser) return
    setIsLoading(true)

    if (!navigator.onLine) {
       try {
         const categories = await db.categories.toArray()
         const formConfigs = await db.formConfigs.toArray()
         const items = await db.items.toArray()
         const bhojanshalas = await db.bhojanshalas.toArray()
         const dishes = await db.dishes.toArray()
         const staff = await db.staff.toArray()
         const users = await db.users.toArray()
         const transactions = await db.transactions.toArray()
         const bhojanshalaCounts = await db.bhojanshalaCounts.toArray()
         const menus = await db.menus.toArray()
         const rasoiSevas = await db.rasoiSevas.toArray()
         const salaryTransactions = await db.salaryTransactions.toArray()
         const attendance = await db.attendance.toArray()
         
         setState({
           categories, formConfigs, items, bhojanshalas, dishes, staff, users,
           transactions, bhojanshalaCounts, menus, rasoiSevas, salaryTransactions, attendance
         })
       } catch(e) { console.error('Offline load failed', e) }
       setIsLoading(false)
       return
    }

    try {
      const today = todayISO()
      const from365 = addDays(today, -365)
      const to7 = addDays(today, 7)

      const [
        categoriesWithConfigs,
        items,
        bhojanshalas,
        dishes,
        staff,
        transactions,
        bhojanshalaCounts,
        _menus,
        _rasoiSevas,
        salaryTransactions,
        users,
      ] = await Promise.all([
        api.get<CategoryWithConfigs[]>('/categories'),
        api.get<Item[]>('/items'),
        api.get<Bhojanshala[]>('/bhojanshalas'),
        api.get<Dish[]>('/dishes'),
        api.get<Staff[]>('/staff'),
        api.get<Transaction[]>(`/transactions?from=${from365}&to=${to7}`),
        api.get<BhojanshalaCount[]>(`/counts/range?from=${addDays(today, -30)}&to=${today}`),
        api.get<Menu[]>(`/menus?date=`).catch(() => [] as Menu[]), // fetch across range
        api.get<RasoiSeva[]>(`/rasoi-seva?date=`).catch(() => [] as RasoiSeva[]),
        currentUser.role === 'ADMIN'
          ? api.get<SalaryTransaction[]>(`/salary/range?fromYear=${new Date().getFullYear() - 1}&fromMonth=1&toYear=${new Date().getFullYear()}&toMonth=12`).catch(() => [] as SalaryTransaction[])
          : Promise.resolve([] as SalaryTransaction[]),
        currentUser.role === 'ADMIN'
          ? api.get<User[]>('/users')
          : Promise.resolve([currentUser] as User[]),
      ])

      // Fetch menus for a wider range
      let menusData: Menu[] = []
      try {
        const from7 = addDays(today, -7)
        const res = await api.get<Menu[]>(`/menus?from=${from7}&to=${today}`)
        menusData = Array.isArray(res) ? res : []
      } catch { /* empty — menus not yet populated */ }

      // Fetch rasoi seva across a range
      let sevasData: RasoiSeva[] = []
      try {
        sevasData = await api.get<RasoiSeva[]>(`/rasoi-seva?date=${today}`)
      } catch { /* empty */ }

      // Flatten categories+formConfigs
      const categories = categoriesWithConfigs.map(({ formConfigs: _fc, ...c }) => c)
      const formConfigs = categoriesWithConfigs.flatMap((c) => c.formConfigs)

      // Save to Dexie for offline use
      await db.categories.bulkPut(categories)
      await db.formConfigs.bulkPut(formConfigs)
      await db.items.bulkPut(items)
      await db.bhojanshalas.bulkPut(bhojanshalas)
      await db.dishes.bulkPut(dishes)
      await db.staff.bulkPut(staff)
      await db.transactions.bulkPut(transactions)
      await db.bhojanshalaCounts.bulkPut(bhojanshalaCounts)
      await db.salaryTransactions.bulkPut(salaryTransactions)
      await db.users.bulkPut(users)
      await db.menus.bulkPut(menusData)
      await db.rasoiSevas.bulkPut(sevasData)

      setState({
        categories,
        formConfigs,
        items,
        bhojanshalas,
        dishes,
        staff,
        users,
        transactions,
        bhojanshalaCounts,
        menus: menusData,
        rasoiSevas: sevasData,
        salaryTransactions,
        attendance: [],
      })
    } catch (err) {
      console.error('Store fetch failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [currentUser])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    const handleOnline = async () => {
      const queue = await db.syncQueue.toArray()
      if (queue.length === 0) return
      
      console.log('Syncing offline data...', queue.length)
      for (const item of queue) {
         try {
           if (item.method === 'POST') await api.post(item.path, item.body)
           if (item.method === 'PATCH') await api.patch(item.path, item.body)
           if (item.method === 'DELETE') await api.delete(item.path)
           
           if (item.id) await db.syncQueue.delete(item.id)
         } catch(e) { console.error('Sync failed for item', item, e) }
      }
      fetchAll()
    }
    
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [fetchAll])

  const reload = useCallback(() => fetchAll(), [fetchAll])

  // ── Writes ─────────────────────────────────────────────────────────────────

  const addTransaction = useCallback(async (t: Omit<Transaction, 'id' | 'createdAt'>) => {
    const created = await api.post<Transaction>('/transactions', {
      ...t,
      datetime: t.datetime || new Date().toISOString(),
    })
    setState((s) => ({ ...s, transactions: [created, ...s.transactions] }))
  }, [])

  const updateTransaction = useCallback(async (id: number, patch: Partial<Transaction>) => {
    const updated = await api.patch<Transaction>(`/transactions/${id}`, patch)
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...updated } : t)),
    }))
  }, [])

  const deleteTransaction = useCallback(async (id: number) => {
    await api.delete<void>(`/transactions/${id}`)
    setState((s) => ({
      ...s,
      transactions: s.transactions.filter((t) => t.id !== id),
    }))
  }, [])

  const saveBhojanshalaCounts = useCallback(
    async (date: string, rows: { bhojanshalaId: number; mealTime: MealTime; count: number }[]) => {
      const saved = await api.post<BhojanshalaCount[]>('/counts', { date, rows })
      setState((s) => {
        let counts = [...s.bhojanshalaCounts]
        for (const c of saved) {
          const idx = counts.findIndex(
            (x) => x.date === c.date && x.bhojanshalaId === c.bhojanshalaId && x.mealTime === c.mealTime,
          )
          if (idx >= 0) counts[idx] = c
          else counts.push(c)
        }
        return { ...s, bhojanshalaCounts: counts }
      })
    },
    [],
  )

  const saveMenu = useCallback(async (m: Omit<Menu, 'id'>) => {
    const saved = await api.post<Menu>('/menus', m)
    setState((s) => {
      const menus = [...s.menus]
      const idx = menus.findIndex(
        (x) => x.date === saved.date && x.mealTime === saved.mealTime && x.bhojanshalaId === saved.bhojanshalaId,
      )
      if (idx >= 0) menus[idx] = saved
      else menus.push(saved)
      return { ...s, menus }
    })
  }, [])

  const addRasoiSeva = useCallback(async (sv: Omit<RasoiSeva, 'id'>) => {
    const created = await api.post<RasoiSeva>('/rasoi-seva', sv)
    setState((s) => ({ ...s, rasoiSevas: [created, ...s.rasoiSevas] }))
  }, [])

  const saveSalary = useCallback(async (rows: Omit<SalaryTransaction, 'id'>[]) => {
    const saved = await api.post<SalaryTransaction[]>('/salary', { rows })
    setState((s) => {
      const list = [...s.salaryTransactions]
      for (const row of saved) {
        const idx = list.findIndex(
          (x) => x.staffId === row.staffId && x.year === row.year && x.month === row.month,
        )
        if (idx >= 0) list[idx] = row
        else list.push(row)
      }
      return { ...s, salaryTransactions: list }
    })
  }, [])

  const fetchAttendance = useCallback(async (year: number, month: number) => {
    const rows = await api.get<StaffAttendance[]>(`/attendance?year=${year}&month=${month}`)
    setState((s) => ({ ...s, attendance: rows }))
  }, [])

  const saveAttendance = useCallback(async (rows: Omit<StaffAttendance, 'id'>[]) => {
    const saved = await api.post<StaffAttendance[]>('/attendance', { rows })
    setState((s) => {
      const list = [...s.attendance]
      for (const row of saved) {
        const idx = list.findIndex((x) => x.staffId === row.staffId && x.date === row.date)
        if (idx >= 0) list[idx] = row
        else list.push(row)
      }
      return { ...s, attendance: list }
    })
  }, [])

  const addItem = useCallback(async (i: Omit<Item, 'id'>) => {
    const created = await api.post<Item>('/items', i)
    setState((s) => ({ ...s, items: [...s.items, created] }))
  }, [])

  const addCategory = useCallback(async (payload: {
    nameE: string; nameG: string; nameH: string
    formConfigs: { transactionType: TransactionType; fields: FormField[] }[]
  }) => {
    // Server returns the new category with its nested formConfigs
    interface CategoryWithConfigs extends ItemCategory { formConfigs: CategoryFormConfig[] }
    const created = await api.post<CategoryWithConfigs>('/categories', payload)
    const newCat: ItemCategory = { id: created.id, nameE: created.nameE, nameG: created.nameG, nameH: created.nameH }
    setState((s) => ({
      ...s,
      categories: [...s.categories, newCat],
      formConfigs: [...s.formConfigs, ...created.formConfigs],
    }))
  }, [])

  const updateCategory = useCallback(async (id: number, payload: {
    nameE: string; nameG: string; nameH: string
    formConfigs: { transactionType: TransactionType; fields: FormField[] }[]
  }) => {
    interface CategoryWithConfigs extends ItemCategory { formConfigs: CategoryFormConfig[] }
    const updated = await api.patch<CategoryWithConfigs>(`/categories/${id}`, payload)
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) => c.id === id ? { id: updated.id, nameE: updated.nameE, nameG: updated.nameG, nameH: updated.nameH } : c),
      formConfigs: [
        ...s.formConfigs.filter((fc) => fc.itemCategoryId !== id),
        ...updated.formConfigs,
      ],
    }))
  }, [])

  const hardDeleteCategory = useCallback(async (id: number) => {
    await api.delete<void>(`/categories/${id}`)
    setState((s) => ({
      ...s,
      categories: s.categories.filter((c) => c.id !== id),
      formConfigs: s.formConfigs.filter((fc) => fc.itemCategoryId !== id),
    }))
  }, [])

  const addBhojanshala = useCallback(async (b: Omit<Bhojanshala, 'id'>) => {
    const created = await api.post<Bhojanshala>('/bhojanshalas', b)
    setState((s) => ({ ...s, bhojanshalas: [...s.bhojanshalas, created] }))
  }, [])

  const addDish = useCallback(async (d: Omit<Dish, 'id'>) => {
    const created = await api.post<Dish>('/dishes', d)
    setState((s) => ({ ...s, dishes: [...s.dishes, created] }))
  }, [])

  const addStaff = useCallback(async (st: Omit<Staff, 'id'>) => {
    const created = await api.post<Staff>('/staff', st)
    setState((s) => ({ ...s, staff: [...s.staff, created] }))
  }, [])

  const deactivateItem = useCallback(async (id: number) => {
    const updated = await api.patch<Item>(`/items/${id}`, { isActive: false })
    setState((s) => ({ ...s, items: s.items.map((x) => (x.id === id ? { ...x, ...updated } : x)) }))
  }, [])

  const deactivateBhojanshala = useCallback(async (id: number) => {
    const updated = await api.patch<Bhojanshala>(`/bhojanshalas/${id}`, { isActive: false })
    setState((s) => ({ ...s, bhojanshalas: s.bhojanshalas.map((x) => (x.id === id ? { ...x, ...updated } : x)) }))
  }, [])

  const deactivateDish = useCallback(async (id: number) => {
    const updated = await api.patch<Dish>(`/dishes/${id}`, { isActive: false })
    setState((s) => ({ ...s, dishes: s.dishes.map((x) => (x.id === id ? { ...x, ...updated } : x)) }))
  }, [])

  const deactivateStaff = useCallback(async (id: number) => {
    const updated = await api.patch<Staff>(`/staff/${id}`, { isActive: false })
    setState((s) => ({ ...s, staff: s.staff.map((x) => (x.id === id ? { ...x, ...updated } : x)) }))
  }, [])

  const reactivateItem = useCallback(async (id: number) => {
    const updated = await api.patch<Item>(`/items/${id}`, { isActive: true })
    setState((s) => ({ ...s, items: s.items.map((x) => (x.id === id ? { ...x, ...updated } : x)) }))
  }, [])

  const reactivateBhojanshala = useCallback(async (id: number) => {
    const updated = await api.patch<Bhojanshala>(`/bhojanshalas/${id}`, { isActive: true })
    setState((s) => ({ ...s, bhojanshalas: s.bhojanshalas.map((x) => (x.id === id ? { ...x, ...updated } : x)) }))
  }, [])

  const reactivateDish = useCallback(async (id: number) => {
    const updated = await api.patch<Dish>(`/dishes/${id}`, { isActive: true })
    setState((s) => ({ ...s, dishes: s.dishes.map((x) => (x.id === id ? { ...x, ...updated } : x)) }))
  }, [])

  const reactivateStaff = useCallback(async (id: number) => {
    const updated = await api.patch<Staff>(`/staff/${id}`, { isActive: true })
    setState((s) => ({ ...s, staff: s.staff.map((x) => (x.id === id ? { ...x, ...updated } : x)) }))
  }, [])

  const hardDeleteItem = useCallback(async (id: number) => {
    await api.delete<void>(`/items/${id}`)
    setState((s) => ({ ...s, items: s.items.filter((x) => x.id !== id) }))
  }, [])

  const hardDeleteBhojanshala = useCallback(async (id: number) => {
    await api.delete<void>(`/bhojanshalas/${id}`)
    setState((s) => ({ ...s, bhojanshalas: s.bhojanshalas.filter((x) => x.id !== id) }))
  }, [])

  const hardDeleteDish = useCallback(async (id: number) => {
    await api.delete<void>(`/dishes/${id}`)
    setState((s) => ({ ...s, dishes: s.dishes.filter((x) => x.id !== id) }))
  }, [])

  const hardDeleteStaff = useCallback(async (id: number) => {
    await api.delete<void>(`/staff/${id}`)
    setState((s) => ({ ...s, staff: s.staff.filter((x) => x.id !== id) }))
  }, [])

  const hardDeleteUser = useCallback(async (id: number) => {
    await api.delete<void>(`/users/${id}`)
    setState((s) => ({ ...s, users: s.users.filter((x) => x.id !== id) }))
  }, [])

  const saveUser = useCallback(async (u: Omit<User, 'id'> & { id?: number }) => {
    let saved: User
    if (u.id) {
      saved = await api.patch<User>(`/users/${u.id}`, u)
      setState((s) => ({ ...s, users: s.users.map((x) => (x.id === u.id ? saved : x)) }))
    } else {
      saved = await api.post<User>('/users', u)
      setState((s) => ({ ...s, users: [...s.users, saved] }))
    }
  }, [])

  // ── Selectors (all computed client-side over cached data) ──────────────────

  const store = useMemo<Store>(() => {
    if (!currentUser) return null as unknown as Store

    const categoryById = (id: number) => state.categories.find((c) => c.id === id)
    const itemById = (id: number) => state.items.find((i) => i.id === id)
    const bhojanshalaById = (id: number) => state.bhojanshalas.find((b) => b.id === id)
    const dishById = (id: number) => state.dishes.find((d) => d.id === id)
    const userById = (id: number) => state.users.find((u) => u.id === id)

    const typesForCategory = (categoryId: number): TransactionType[] =>
      state.formConfigs
        .filter((c) => c.itemCategoryId === categoryId)
        .map((c) => c.transactionType)

    const isStockTracked = (categoryId: number) =>
      typesForCategory(categoryId).includes('CONSUMPTION')

    const effectiveFields = (categoryId: number, type: TransactionType, user: User): FormField[] => {
      const cfg = state.formConfigs.find(
        (c) => c.itemCategoryId === categoryId && c.transactionType === type,
      )
      if (!cfg) return []
      if (user.role === 'ADMIN') return cfg.fields
      return cfg.fields.filter((f) => !ADMIN_ONLY_FIELDS.includes(f))
    }

    const visibleCategories = () =>
      currentUser.role === 'ADMIN'
        ? state.categories
        : state.categories.filter((c) => currentUser.categoryIds.includes(c.id))

    const visibleBhojanshalas = () =>
      currentUser.role === 'ADMIN'
        ? state.bhojanshalas.filter((b) => b.isActive)
        : state.bhojanshalas.filter((b) => b.isActive && currentUser.bhojanshalaIds.includes(b.id))

    const stockFor = (itemId: number, range?: { from: string; to: string }) => {
      const item = itemById(itemId)
      if (!item) return { opening: 0, purchased: 0, consumed: 0, available: 0 }

      const rows = state.transactions.filter((t) => t.itemId === itemId)
      const sum = (list: Transaction[], type: TransactionType) =>
        list.filter((t) => t.transactionType === type).reduce((n, t) => n + t.qty, 0)

      if (!range) {
        const purchased = sum(rows, 'PURCHASE')
        const consumed = sum(rows, 'CONSUMPTION')
        return { opening: item.openingStock, purchased, consumed, available: item.openingStock + purchased - consumed }
      }

      const before = rows.filter((t) => t.datetime.slice(0, 10) < range.from)
      const within = rows.filter(
        (t) => t.datetime.slice(0, 10) >= range.from && t.datetime.slice(0, 10) <= range.to,
      )
      const opening = item.openingStock + sum(before, 'PURCHASE') - sum(before, 'CONSUMPTION')
      const purchased = sum(within, 'PURCHASE')
      const consumed = sum(within, 'CONSUMPTION')
      return { opening, purchased, consumed, available: opening + purchased - consumed }
    }

    const pendingAmounts = () =>
      state.transactions.filter((t) => {
        if (t.transactionType !== 'PURCHASE') return false
        if (t.purchaseAmount !== null) return false
        const item = itemById(t.itemId)
        if (!item) return false
        const cfg = state.formConfigs.find(
          (c) => c.itemCategoryId === item.itemCategoryId && c.transactionType === 'PURCHASE',
        )
        return cfg?.fields.includes('PURCHASE_AMOUNT') ?? false
      })

    const countFor = (date: string, bhojanshalaId: number, meal: MealTime) =>
      state.bhojanshalaCounts.find(
        (c) => c.date === date && c.bhojanshalaId === bhojanshalaId && c.mealTime === meal,
      )?.count ?? null

    const menuFor = (date: string, bhojanshalaId: number, meal: MealTime) =>
      state.menus.find(
        (m) => m.date === date && m.bhojanshalaId === bhojanshalaId && m.mealTime === meal,
      )

    const sevaFor = (date: string, bhojanshalaId: number, meal: MealTime) => {
      const byDonor: { donor: string; personCount: number }[] = []
      for (const sv of state.rasoiSevas) {
        if (sv.date !== date) continue
        for (const slot of sv.slots) {
          if (slot.bhojanshalaId === bhojanshalaId && slot.mealTime === meal) {
            const existing = byDonor.find((d) => d.donor === sv.donorName)
            if (existing) existing.personCount += slot.personCount
            else byDonor.push({ donor: sv.donorName, personCount: slot.personCount })
          }
        }
      }
      byDonor.sort((a, b) => b.personCount - a.personCount)
      return {
        personCount: byDonor.reduce((n, d) => n + d.personCount, 0),
        donors: byDonor.map((d) => d.donor),
        byDonor,
      }
    }

    const attendanceSummary = (staffId: number, year: number, month: number) => {
      const prefix = `${year}-${String(month).padStart(2, '0')}-`
      const rows = state.attendance.filter((a) => a.staffId === staffId && a.date.startsWith(prefix))
      const present = rows.filter((a) => a.status === 'PRESENT').length
      const halfDay = rows.filter((a) => a.status === 'HALF_DAY').length
      const absent = rows.filter((a) => a.status === 'ABSENT').length
      return { present, halfDay, absent, effectiveDays: present + halfDay * 0.5 }
    }

    return {
      ...state,
      currentUser,
      isLoading,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      saveBhojanshalaCounts,
      saveMenu,
      addRasoiSeva,
      saveSalary,
      saveAttendance,
      fetchAttendance,
      addItem,
      addBhojanshala,
      addDish,
      addStaff,
      saveUser,
      deactivateItem,
      deactivateBhojanshala,
      deactivateDish,
      deactivateStaff,
      reactivateItem,
      reactivateBhojanshala,
      reactivateDish,
      reactivateStaff,
      hardDeleteItem,
      hardDeleteBhojanshala,
      hardDeleteDish,
      hardDeleteStaff,
      hardDeleteUser,
      addCategory,
      updateCategory,
      hardDeleteCategory,
      categoryById,
      itemById,
      bhojanshalaById,
      dishById,
      userById,
      typesForCategory,
      effectiveFields,
      isStockTracked,
      visibleCategories,
      visibleBhojanshalas,
      stockFor,
      pendingAmounts,
      countFor,
      menuFor,
      sevaFor,
      attendanceSummary,
      reload,
    }
  }, [
    state, currentUser, isLoading,
    addTransaction, updateTransaction, deleteTransaction, saveBhojanshalaCounts,
    saveMenu, addRasoiSeva, saveSalary, saveAttendance, fetchAttendance,
    addItem, addBhojanshala, addDish, addStaff, addCategory, updateCategory, saveUser,
    deactivateItem, deactivateBhojanshala, deactivateDish, deactivateStaff,
    reactivateItem, reactivateBhojanshala, reactivateDish, reactivateStaff,
    hardDeleteItem, hardDeleteBhojanshala, hardDeleteDish, hardDeleteStaff, hardDeleteUser, hardDeleteCategory, reload,
  ])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore must be inside <StoreProvider>')
  return s
}
