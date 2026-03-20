import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import authRouter from './routes/auth'
import brandRouter from './routes/brand'
import inventoryRouter from './routes/inventory'
import financeRouter from './routes/finance'
import marketingRouter from './routes/marketing'
import beroasRouter from './routes/beroas'
import operationsRouter from './routes/operations'
import posRouter from './routes/pos'
import insightsRouter from './routes/insights'
import webhooksRouter from './routes/webhooks'
import settingsRouter from './routes/settings'
import dashboardRouter from './routes/dashboard'
import syncRouter from './routes/sync'

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json())

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

app.use('/api/auth', authRouter)
app.use('/api/brand', brandRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/finance', financeRouter)
app.use('/api/marketing', marketingRouter)
app.use('/api/beroas', beroasRouter)
app.use('/api/operations', operationsRouter)
app.use('/api/pos', posRouter)
app.use('/api/insights', insightsRouter)
app.use('/api/webhooks', webhooksRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/sync', syncRouter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' })
})

// Global error handler — prevent stack trace leaks
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ success: false, error: 'Internal server error' })
})

const PORT = parseInt(process.env.PORT ?? '4000', 10)

app.listen(PORT, () => {
  console.log(`Brand OS backend running on port ${PORT}`)
})

export default app
