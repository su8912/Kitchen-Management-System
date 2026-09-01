import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import authRouter from './routes/auth'
import categoriesRouter from './routes/categories'
import itemsRouter from './routes/items'
import transactionsRouter from './routes/transactions'
import bhojanshalasRouter from './routes/bhojanshalas'
import countsRouter from './routes/counts'
import dishesRouter from './routes/dishes'
import menusRouter from './routes/menus'
import rasoiSevaRouter from './routes/rasoi-seva'
import staffRouter from './routes/staff'
import salaryRouter from './routes/salary'
import attendanceRouter from './routes/attendance'
import usersRouter from './routes/users'
import reportsRouter from './routes/reports'

const app = express()

// ── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_URL,       // production frontend (Vercel)
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ].filter(Boolean) as string[]

    // Allow requests with no origin (mobile apps, curl, etc.) or matching origins
    if (!origin || allowed.includes(origin) || origin.startsWith('http://192.168.')) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`))
    }
  },
  credentials: true,
}))

app.use(express.json())
app.use(cookieParser())

// ── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/items', itemsRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/bhojanshalas', bhojanshalasRouter)
app.use('/api/counts', countsRouter)
app.use('/api/dishes', dishesRouter)
app.use('/api/menus', menusRouter)
app.use('/api/rasoi-seva', rasoiSevaRouter)
app.use('/api/staff', staffRouter)
app.use('/api/salary', salaryRouter)
app.use('/api/attendance', attendanceRouter)
app.use('/api/users', usersRouter)
app.use('/api/reports', reportsRouter)

// ── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── 404 ──────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 4000

// Only listen when running locally — Vercel handles this in production
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Rasoi Vibhag API running on http://localhost:${PORT}`)
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
  })
}

export default app
