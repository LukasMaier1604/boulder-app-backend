// src/routes/routes.ts
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma.js'
import { CreateRouteSchema, UpdateRouteSchema } from '../lib/schemas.js'
import type { JwtPayload } from '../plugins/auth.js'

export default async function routeRoutes(app: FastifyInstance) {

  // GET /routes  – alle aktiven Routen (öffentlich für eingeloggte User)
  app.get('/', { preHandler: app.authenticate }, async (request, reply) => {
    const routes = await prisma.route.findMany({
      where: { status: 'ACTIVE' },
      include: {
        betaSteps: {
          orderBy: { position: 'asc' },
          select: { id: true, position: true, text: true },
        },
        _count: { select: { climbedRoutes: true } },
      },
      orderBy: [{ gradeValue: 'asc' }, { name: 'asc' }],
    })

    return reply.send({ routes })
  })

  // GET /routes/qr/:qrCode  – Route per QR-Code-Wert abrufen (Scan-Flow)
  app.get('/qr/:qrCode', { preHandler: app.authenticate }, async (request, reply) => {
    const { qrCode } = request.params as { qrCode: string }

    const route = await prisma.route.findUnique({
      where: { qrCode },
      include: {
        betaSteps: {
          orderBy: { position: 'asc' },
          select: { id: true, position: true, text: true },
        },
      },
    })

    if (!route || route.status === 'ARCHIVED') {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Route nicht gefunden oder nicht mehr aktiv',
      })
    }

    return reply.send({ route })
  })

  // GET /routes/:id  – einzelne Route
  app.get('/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        betaSteps: {
          orderBy: { position: 'asc' },
          select: { id: true, position: true, text: true },
        },
        _count: { select: { climbedRoutes: true } },
      },
    })

    if (!route) {
      return reply.status(404).send({ error: 'Not Found', message: 'Route nicht gefunden' })
    }

    return reply.send({ route })
  })

  // POST /routes  – neue Route anlegen (nur Admin)
  app.post('/', { preHandler: app.requireAdmin }, async (request, reply) => {
    const result = CreateRouteSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: result.error.flatten().fieldErrors,
      })
    }

    const { betaSteps, ...routeData } = result.data

    const route = await prisma.route.create({
      data: {
        ...routeData,
        qrCode: randomUUID(),
        betaSteps: {
          create: betaSteps.map((text, index) => ({
            position: index + 1,
            text,
          })),
        },
      },
      include: {
        betaSteps: { orderBy: { position: 'asc' } },
      },
    })

    return reply.status(201).send({ route })
  })

  // PATCH /routes/:id  – Route bearbeiten (nur Admin)
  app.patch('/:id', { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const result = UpdateRouteSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: result.error.flatten().fieldErrors,
      })
    }

    const { betaSteps, ...routeData } = result.data

    const existing = await prisma.route.findUnique({ where: { id } })
    if (!existing) {
      return reply.status(404).send({ error: 'Not Found', message: 'Route nicht gefunden' })
    }

    // Beta Steps: bei Änderung komplett ersetzen
    const route = await prisma.route.update({
      where: { id },
      data: {
        ...routeData,
        ...(betaSteps && {
          betaSteps: {
            deleteMany: {},
            create: betaSteps.map((text, index) => ({
              position: index + 1,
              text,
            })),
          },
        }),
      },
      include: {
        betaSteps: { orderBy: { position: 'asc' } },
      },
    })

    return reply.send({ route })
  })

  // DELETE /routes/:id  – Route archivieren (soft delete, nur Admin)
  app.delete('/:id', { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await prisma.route.findUnique({ where: { id } })
    if (!existing) {
      return reply.status(404).send({ error: 'Not Found', message: 'Route nicht gefunden' })
    }

    await prisma.route.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    })

    return reply.status(204).send()
  })

  // POST /routes/:id/regenerate-qr  – neuen QR-Code generieren (nur Admin)
  app.post('/:id/regenerate-qr', { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await prisma.route.findUnique({ where: { id } })
    if (!existing) {
      return reply.status(404).send({ error: 'Not Found', message: 'Route nicht gefunden' })
    }

    const route = await prisma.route.update({
      where: { id },
      data: { qrCode: randomUUID() },
      select: { id: true, name: true, qrCode: true },
    })

    return reply.send({ route })
  })
}
