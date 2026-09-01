import Dexie, { type Table } from 'dexie'
import type { 
  ItemCategory, Item, Bhojanshala, Dish, Staff, User, Transaction,
  BhojanshalaCount, Menu, RasoiSeva, SalaryTransaction, StaffAttendance, CategoryFormConfig
} from './types'

export interface SyncQueueItem {
  id?: number
  method: 'POST' | 'PATCH' | 'DELETE'
  path: string
  body?: any
  timestamp: string
}

export class RasoiDB extends Dexie {
  categories!: Table<ItemCategory, number>
  formConfigs!: Table<CategoryFormConfig, number>
  items!: Table<Item, number>
  bhojanshalas!: Table<Bhojanshala, number>
  dishes!: Table<Dish, number>
  staff!: Table<Staff, number>
  users!: Table<User, number>
  transactions!: Table<Transaction, number>
  bhojanshalaCounts!: Table<BhojanshalaCount, number>
  menus!: Table<Menu, number>
  rasoiSevas!: Table<RasoiSeva, number>
  salaryTransactions!: Table<SalaryTransaction, number>
  attendance!: Table<StaffAttendance, number>
  syncQueue!: Table<SyncQueueItem, number>

  constructor() {
    super('RasoiDB')
    this.version(1).stores({
      categories: 'id, nameE',
      formConfigs: 'id, itemCategoryId, [itemCategoryId+transactionType]',
      items: 'id, itemCategoryId, nameE',
      bhojanshalas: 'id, nameE',
      dishes: 'id, nameE',
      staff: 'id, name',
      users: 'id, username',
      transactions: 'id, datetime, itemId, transactionType',
      bhojanshalaCounts: 'id, [date+bhojanshalaId+mealTime]',
      menus: 'id, [date+mealTime+bhojanshalaId]',
      rasoiSevas: 'id, date, donorName',
      salaryTransactions: 'id, [staffId+year+month]',
      attendance: 'id, [staffId+date]',
      syncQueue: '++id, timestamp'
    })
  }
}

export const db = new RasoiDB()
