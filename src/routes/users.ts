// src/routes/users.ts
import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import {
  UpdateProfileSchema,
  IncrementAttemptSchema,
  CompleteRouteSchema,
  ResetAttemptsSchema,
} from '../lib/schemas.js'
import type { JwtPayload } from '../plugins/auth.js'

export default async function userRoutes(app: FastifyInstance) {

  // GET /users/me/stats  – eigene Stats für Home Screen
  app.get('/me/stats', { preHandler: app.authenticate }, async (request, reply) => {
    const { sub: userId } = request.user as JwtPayload

    const climbedRoutes = await prisma.climbedRoute.findMany({
      where: { userId },
      include: {
        route: { select: { id: true, grade: true, gradeValue: true, name: true } },
      },
    })

    const toppedRoutes = climbedRoutes.filter((e) => e.topped)
    const totalAttempts = climbedRoutes.reduce((sum, e) => sum + e.attempts, 0)
    const hardestRoute = toppedRoutes.reduce<typeof toppedRoutes[0]['route'] | null>(
      (hardest, entry) => {
        if (!hardest || entry.route.gradeValue > hardest.gradeValue) return entry.route
        return hardest
      },
      null,
    )

    const sessionsCount = await prisma.session.count({ where: { userId } })

    return reply.send({
      stats: {
        routesCount: toppedRoutes.length,
        totalAttempts,
        hardestRoute,
        completionRate: totalAttempts
          ? Math.round((toppedRoutes.length / totalAttempts) * 100)
          : 0,
        progressToNextLevel: Math.min(100, toppedRoutes.length * 12),
        sessionsCount,
      },
    })
  })

  // GET /users/me/climbed  – alle gekletterten Routen des Users
  app.get('/me/climbed', { preHandler: app.authenticate }, async (request, reply) => {
    const { sub: userId } = request.user as JwtPayload

    const climbedRoutes = await prisma.climbedRoute.findMany({
      where: { userId },
      include: {
        route: {
          select: {
            id: true,
            name: true,
            grade: true,
            gradeValue: true,
            location: true,
            wallType: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    return reply.send({ climbedRoutes })
  })

  // PATCH /users/me  – Profil bearbeiten
  app.patch('/me', { preHandler: app.authenticate }, async (request, reply) => {
    const { sub: userId } = request.user as JwtPayload

    const result = UpdateProfileSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: result.error.flatten().fieldErrors,
      })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: result.data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        level: true,
        avatarColor: true,
      },
    })

    return reply.send({ user })
  })

  // ─── Climbing Tracking ──────────────────────────────────────────────────────

  // POST /users/me/attempts  – Attempt hinzufügen
  app.post('/me/attempts', { preHandler: app.authenticate }, async (request, reply) => {
    const { sub: userId } = request.user as JwtPayload

    const result = IncrementAttemptSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: result.error.flatten().fieldErrors,
      })
    }

    const { routeId } = result.data

    // Prüfen ob die Route existiert
    const route = await prisma.route.findUnique({ where: { id: routeId } })
    if (!route || route.status === 'ARCHIVED') {
      return reply.status(404).send({ error: 'Not Found', message: 'Route nicht gefunden' })
    }

    // Heutiger Eintrag suchen oder erstellen
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const entry = await prisma.climbedRoute.upsert({
      where: {
        userId_routeId_date: {
          userId,
          routeId,
          date: today,
        },
      },
      update: {
        attempts: { increment: 1 },
      },
      create: {
        userId,
        routeId,
        attempts: 1,
        date: today,
        topped: false,
      },
    })

    return reply.send({ climbedRoute: entry })
  })

  // POST /users/me/top  – Route als geschafft markieren
  app.post('/me/top', { preHandler: app.authenticate }, async (request, reply) => {
    const { sub: userId } = request.user as JwtPayload

    const result = CompleteRouteSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: result.error.flatten().fieldErrors,
      })
    }

    const { routeId } = result.data

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const entry = await prisma.climbedRoute.upsert({
      where: {
        userId_routeId_date: {
          userId,
          routeId,
          date: today,
        },
      },
      update: { topped: true },
      create: {
        userId,
        routeId,
        attempts: 0,
        date: today,
        topped: true,
      },
    })

    return reply.send({ climbedRoute: entry })
  })

  // DELETE /users/me/attempts  – Attempts zurücksetzen
  app.delete('/me/attempts', { preHandler: app.authenticate }, async (request, reply) => {
    const { sub: userId } = request.user as JwtPayload

    const result = ResetAttemptsSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: result.error.flatten().fieldErrors,
      })
    }

    const { routeId } = result.data

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.climbedRoute.updateMany({
      where: { userId, routeId, date: today },
      data: { attempts: 0 },
    })

    return reply.send({ success: true })
  })

  // ─── Sessions ───────────────────────────────────────────────────────────────

  // POST /users/me/sessions  – Session starten
  app.post('/me/sessions', { preHandler: app.authenticate }, async (request, reply) => {
    const { sub: userId } = request.user as JwtPayload

    // Offene Session beenden (falls vorhanden)
    await prisma.session.updateMany({
      where: { userId, endedAt: null },
      data: { endedAt: new Date() },
    })

    const session = await prisma.session.create({
      data: { userId },
    })

    return reply.status(201).send({ session })
  })

  // PATCH /users/me/sessions/active  – laufende Session beenden
  app.patch('/me/sessions/active', { preHandler: app.authenticate }, async (request, reply) => {
    const { sub: userId } = request.user as JwtPayload

    const updated = await prisma.session.updateMany({
      where: { userId, endedAt: null },
      data: { endedAt: new Date() },
    })

    return reply.send({ ended: updated.count })
  })

  // ─── Leaderboard ────────────────────────────────────────────────────────────

  // GET /users/leaderboard
  app.get('/leaderboard', { preHandler: app.authenticate }, async (request, reply) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        level: true,
        avatarColor: true,
        climbedRoutes: {
          select: {
            attempts: true,
            topped: true,
            route: { select: { gradeValue: true } },
          },
        },
        _count: { select: { sessions: true } },
      },
    })

    const leaderboard = users
      .map((user) => {
        const toppedRoutes = user.climbedRoutes.filter((e) => e.topped)
        const totalAttempts = user.climbedRoutes.reduce((sum, e) => sum + e.attempts, 0)
        const score = toppedRoutes.reduce(
          (sum, e) => sum + (e.route?.gradeValue ?? 1) * 100,
          0,
        )

        return {
          id: user.id,
          name: user.name,
          level: user.level,
          avatarColor: user.avatarColor,
          toppedCount: toppedRoutes.length,
          totalAttempts,
          sessionsCount: user._count.sessions,
          score,
        }
      })
      .sort((a, b) => b.score - a.score || a.totalAttempts - b.totalAttempts)

    return reply.send({ leaderboard })
  })
}
