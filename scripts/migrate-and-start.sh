#!/bin/sh
# scripts/migrate-and-start.sh
# Wird auf Railway als startCommand genutzt, wenn Migrationen automatisch laufen sollen

set -e

echo "🔄 Prisma Migrationen ausführen..."
npx prisma migrate deploy

echo "🌱 Seed ausführen (nur wenn DB leer)..."
npx tsx prisma/seed.ts || echo "⚠️ Seed übersprungen (bereits vorhanden)"

echo "🚀 Server starten..."
node dist/server.js
