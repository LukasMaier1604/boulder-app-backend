// src/server.ts
import Fastify from 'fastify'
import cors from '@fastify/cors'
import authPlugin from './plugins/auth.js'
import authRoutes from './routes/auth.js'
import routeRoutes from './routes/routes.js'
import userRoutes from './routes/users.js'
import { prisma } from './lib/prisma.js'
import pino from 'pino'

const transport =
  process.env.NODE_ENV !== 'production'
    ? pino.transport({
        target: 'pino-pretty',
        options: { colorize: true },
      })
    : undefined

const app = Fastify({
  logger: pino(
    {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    },
    transport
  ),
})

// ─── Plugins ──────────────────────────────────────────────────────────────────

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

await app.register(authPlugin)

// ─── Routes ───────────────────────────────────────────────────────────────────

await app.register(authRoutes,  { prefix: '/auth' })
await app.register(routeRoutes, { prefix: '/routes' })
await app.register(userRoutes,  { prefix: '/users' })

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

const shutdown = async (signal: string) => {
  app.log.info(`${signal} empfangen – fahre Server herunter...`)
  await app.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))

// ─── Start ────────────────────────────────────────────────────────────────────

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '0.0.0.0'

try {
  await app.listen({ port, host })
  app.log.info(`🧗 Boulder API läuft auf http://${host}:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
