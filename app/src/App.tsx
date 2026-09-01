import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { LanguageProvider } from '@/lib/language-context'
import { StoreProvider } from '@/mock/store'
import { Layout } from '@/components/Layout'
import { Login } from '@/pages/Login'

import { TodaysMeal } from '@/pages/TodaysMeal'
import { TransactionEntry } from '@/pages/TransactionEntry'
import { BhojanshalaCounts } from '@/pages/BhojanshalaCounts'
import { MenuPlanner } from '@/pages/MenuPlanner'
import { RasoiSevaEntry } from '@/pages/RasoiSevaEntry'
import { MyEntries } from '@/pages/MyEntries'
import { AllTransactions } from '@/pages/AllTransactions'
import { PendingAmounts } from '@/pages/PendingAmounts'
import { Attendance } from '@/pages/Attendance'
import { Salary } from '@/pages/Salary'
import { Masters } from '@/pages/Masters'
import { UserManagement } from '@/pages/UserManagement'
import { Reports } from '@/pages/Reports'

/** Requires login. Shows a spinner while checking the session. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Admin-only routes bounce a data-entry user home. */
function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <RequireAuth>
            <StoreProvider>
              <Layout />
            </StoreProvider>
          </RequireAuth>
        }
      >
        <Route index element={<TodaysMeal />} />
        <Route path="entry" element={<TransactionEntry />} />
        <Route path="counts" element={<BhojanshalaCounts />} />
        <Route path="menu" element={<MenuPlanner />} />
        <Route path="seva" element={<RasoiSevaEntry />} />
        <Route path="my-entries" element={<MyEntries />} />

        <Route path="transactions" element={<AdminOnly><AllTransactions /></AdminOnly>} />
        <Route path="pending" element={<AdminOnly><PendingAmounts /></AdminOnly>} />
        <Route path="attendance" element={<AdminOnly><Attendance /></AdminOnly>} />
        <Route path="salary" element={<AdminOnly><Salary /></AdminOnly>} />
        <Route path="masters" element={<AdminOnly><Masters /></AdminOnly>} />
        <Route path="users" element={<AdminOnly><UserManagement /></AdminOnly>} />
        <Route path="reports" element={<AdminOnly><Reports /></AdminOnly>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </LanguageProvider>
  )
}

