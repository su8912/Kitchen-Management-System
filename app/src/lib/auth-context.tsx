import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { api } from './api'
import type { User } from './types'

interface AuthState {
  user: User | null
  loading: boolean
}

interface AuthContext extends AuthState {
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Refresh the current user from the server (call after user-management saves). */
  refresh: () => Promise<void>
}

const Ctx = createContext<AuthContext | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  async function fetchMe() {
    if (!navigator.onLine) {
      const savedUser = localStorage.getItem('offlineUser')
      if (savedUser) {
        setState({ user: JSON.parse(savedUser), loading: false })
        return
      }
    }

    try {
      const user = await api.get<User>('/auth/me')
      localStorage.setItem('offlineUser', JSON.stringify(user))
      setState({ user, loading: false })
    } catch (err) {
      localStorage.removeItem('offlineUser')
      setState({ user: null, loading: false })
    }
  }

  // On mount, check if we already have a valid session cookie
  useEffect(() => { fetchMe() }, [])

  async function login(username: string, password: string) {
    if (!navigator.onLine) {
       const savedUser = localStorage.getItem('offlineUser')
       if (savedUser) {
          const u = JSON.parse(savedUser)
          if (u.username === username) {
            setState({ user: u, loading: false })
            return
          }
       }
       throw new Error("Cannot login while offline without cached credentials.")
    }

    await api.post<User>('/auth/login', { username, password })
    await fetchMe()
  }

  async function logout() {
    if (navigator.onLine) {
      try { await api.post('/auth/logout', {}) } catch(e) {}
    }
    localStorage.removeItem('offlineUser')
    setState({ user: null, loading: false })
  }

  async function refresh() {
    await fetchMe()
  }

  return (
    <Ctx.Provider value={{ ...state, login, logout, refresh }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth(): AuthContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside <AuthProvider>')
  return ctx
}
