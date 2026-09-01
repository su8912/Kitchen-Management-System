/**
 * Typed fetch wrapper for the RasoiVibhag API.
 * All requests go to /api/* — Vite proxies to the backend in dev.
 */

import { db } from './db'

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const isOnline = navigator.onLine

  if (!isOnline) {
    if (path.startsWith('/auth')) {
      throw new Error("Network offline")
    }

    if (method !== 'GET') {
      const id = -Date.now()
      const mockCreated = { ...(body as object), id }
      
      // Queue for sync
      await db.syncQueue.add({ method: method as any, path, body, timestamp: new Date().toISOString() })
      
      // Update local db based on path heuristic
      const tableMap: Record<string, any> = {
        '/transactions': db.transactions,
        '/bhojanshalas': db.bhojanshalas,
        '/dishes': db.dishes,
        '/staff': db.staff,
        '/users': db.users,
        '/items': db.items,
        '/menus': db.menus,
        '/counts': db.bhojanshalaCounts,
        '/rasoi-seva': db.rasoiSevas,
        '/salary': db.salaryTransactions,
      }
      const tablePath = Object.keys(tableMap).find(k => path.startsWith(k))
      if (tablePath && method === 'POST') {
        // Special cases where the endpoint expects an array of rows
        if (path === '/counts' || path === '/salary' || path === '/attendance') {
           const rows = (body as any).rows || []
           for (const r of rows) {
              await tableMap[tablePath].put({ ...r, id: -Math.floor(Math.random()*1000000) })
           }
           return rows as unknown as T
        } else {
           await tableMap[tablePath].put(mockCreated)
        }
      }
      return (method === 'POST' ? mockCreated : body) as unknown as T
    } else {
      throw new Error("GET requests should be handled by the store cache directly when offline.")
    }
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const json = await res.json()
      message = json.error || message
    } catch { }
    throw new ApiError(res.status, message)
  }

  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  get: <T,>(path: string) => request<T>('GET', path),
  post: <T,>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T,>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T,>(path: string) => request<T>('DELETE', path),
}

export { ApiError }
