// src/routes/auth.ts
import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { LoginSchema, RegisterSchema } from '../lib/schemas.js'
import type { JwtPayload } from '../plugins/auth.js'

export default async function authRoutes(app: FastifyInstance) {

  // POST /auth/register
  app.post('/register', async (request, reply) => {
    const result = RegisterSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: result.error.flatten().fieldErrors,
      })
    }

    const { email, password, name } = result.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'E-Mail-Adresse ist bereits registriert',
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true, role: true, level: true, avatarColor: true },
    })

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role }
    const token = app.jwt.sign(payload)

    return reply.status(201).send({ user, token })
  })

  // POST /auth/login
  app.post('/login', async (request, reply) => {
    const result = LoginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: result.error.flatten().fieldErrors,
      })
    }

    const { email, password } = result.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // Gleiche Fehlermeldung wie bei falschem Passwort (Security)
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'E-Mail oder Passwort ungültig',
      })
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'E-Mail oder Passwort ungültig',
      })
    }

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role }
    const token = app.jwt.sign(payload)

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        level: user.level,
        avatarColor: user.avatarColor,
      },
      token,
    })
  })

  // GET /auth/me  (Token prüfen + aktuellen User zurückgeben)
  app.get('/me', { preHandler: app.authenticate }, async (request, reply) => {
    const payload = request.user as JwtPayload

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        level: true,
        avatarColor: true,
        createdAt: true,
        sessions: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: { id: true, startedAt: true, endedAt: true },
        },
        _count: {
          select: { sessions: true, climbedRoutes: true },
        },
      },
    })

    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'User nicht gefunden' })
    }

    return reply.send({ user })
  })
}
