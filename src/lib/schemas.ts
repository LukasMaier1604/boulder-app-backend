// src/lib/schemas.ts
import { z } from 'zod'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben').max(50),
})

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
})

// ─── User ─────────────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  avatarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Ungültige Hex-Farbe').optional(),
  level: z.string().max(50).optional(),
})

// ─── Routes ───────────────────────────────────────────────────────────────────

export const WallTypeEnum = z.enum(['SLAB', 'VERTICAL', 'OVERHANG', 'COMPETITION', 'CAVE'])

export const CreateRouteSchema = z.object({
  name: z.string().min(2).max(100),
  grade: z.string().min(1).max(10),
  gradeValue: z.number().int().min(0).max(17),
  location: z.string().min(1).max(100),
  wallType: WallTypeEnum,
  description: z.string().min(1).max(1000),
  betaSteps: z.array(z.string().min(1).max(500)).min(1).max(10),
})

export const UpdateRouteSchema = CreateRouteSchema.partial().extend({
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
})

// ─── Climbing Tracking ────────────────────────────────────────────────────────

export const IncrementAttemptSchema = z.object({
  routeId: z.string().cuid(),
})

export const CompleteRouteSchema = z.object({
  routeId: z.string().cuid(),
})

export const ResetAttemptsSchema = z.object({
  routeId: z.string().cuid(),
})

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const StartSessionSchema = z.object({})  // kein Body nötig

// ─── Types (abgeleitet aus Schemas) ───────────────────────────────────────────

export type RegisterInput     = z.infer<typeof RegisterSchema>
export type LoginInput        = z.infer<typeof LoginSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type CreateRouteInput  = z.infer<typeof CreateRouteSchema>
export type UpdateRouteInput  = z.infer<typeof UpdateRouteSchema>
