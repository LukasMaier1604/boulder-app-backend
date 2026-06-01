// src/plugins/auth.ts
import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export interface JwtPayload {
  sub: string       // userId
  email: string
  role: 'USER' | 'ADMIN'
}

export default fp(async (app: FastifyInstance) => {
  app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'fallback-secret-CHANGE-IN-PRODUCTION',
    sign: {
      expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    },
  })

  // Decorator: Request mit aktuellem User anreichern
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      reply.status(401).send({ error: 'Unauthorized', message: 'Token fehlt oder ist ungültig' })
    }
  })

  app.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      const payload = request.user as JwtPayload
      if (payload.role !== 'ADMIN') {
        reply.status(403).send({ error: 'Forbidden', message: 'Nur Admins haben Zugriff' })
      }
    } catch {
      reply.status(401).send({ error: 'Unauthorized', message: 'Token fehlt oder ist ungültig' })
    }
  })
})

// TypeScript: Fastify-Typen erweitern
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
