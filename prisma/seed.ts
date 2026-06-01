// prisma/seed.ts
import { PrismaClient, WallType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Admin User ────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin1234', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@boulderwall.de' },
    update: {},
    create: {
      email: 'admin@boulderwall.de',
      passwordHash: adminHash,
      name: 'Admin',
      role: 'ADMIN',
      level: 'Pro',
      avatarColor: '#FF6B6B',
    },
  })
  console.log(`✅ Admin: ${admin.email}`)

  // ─── Demo Users ────────────────────────────────────────────────────────────
  const demoUsers = [
    { email: 'max@demo.de',  name: 'Max',  level: 'Fortgeschritten', avatarColor: '#F58B1F', password: 'demo1234' },
    { email: 'lisa@demo.de', name: 'Lisa', level: 'Pro',             avatarColor: '#41C48B', password: 'demo1234' },
    { email: 'tom@demo.de',  name: 'Tom',  level: 'Intermediate',    avatarColor: '#5F8BFF', password: 'demo1234' },
    { email: 'anna@demo.de', name: 'Anna', level: 'Advanced',        avatarColor: '#D96CFF', password: 'demo1234' },
  ]

  for (const u of demoUsers) {
    const hash = await bcrypt.hash(u.password, 12)
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash: hash,
        name: u.name,
        level: u.level,
        avatarColor: u.avatarColor,
        role: 'USER',
      },
    })
    console.log(`✅ User: ${user.email}`)
  }

  // ─── Demo Routes ───────────────────────────────────────────────────────────
  const routesData = [
    {
      name: 'Velvet Volume',
      grade: 'V4',
      gradeValue: 4,
      location: 'Westwand',
      wallType: WallType.SLAB,
      description: 'Technische Platte mit ruhigen Bewegungen, Balance und sauberem Trittdruck.',
      betaSteps: [
        'Setze den linken Fuss frueh auf die kleine Kante und bleibe nah an der Wand.',
        'Schiebe die Huefte unter den Seitgriff, bevor du in den hohen Tritt steigst.',
        'Druecke geduldig ueber die Beine statt hektisch zum Top zu springen.',
      ],
    },
    {
      name: 'Roof Ritual',
      grade: 'V5',
      gradeValue: 5,
      location: 'Dachbereich',
      wallType: WallType.OVERHANG,
      description: 'Steiler Boulder mit Heel Hook, Core-Spannung und kontrolliertem Finish.',
      betaSteps: [
        'Spanne vom Start an den Core an und lasse die Huefte nicht absacken.',
        'Nutze den rechten Heel Hook frueh, um den langen Zug statisch zu halten.',
        'Atme vor dem letzten Move aus und ziehe ueber den Heel Hook zum Abschluss.',
      ],
    },
    {
      name: 'Mint Traverse',
      grade: 'V2',
      gradeValue: 2,
      location: 'Nordwand',
      wallType: WallType.VERTICAL,
      description: 'Leichte Traverse fuer Rhythmus, Fusstabilitaet und Gewichtsverlagerung.',
      betaSteps: [
        'Bleibe mit den Fuessen aktiv und setze lieber einmal sauber nach.',
        'Drehe die Huefte in Bewegungsrichtung ein, damit die Seitgriffe leichter werden.',
        'Gehe kontrolliert ins Finish statt den letzten Griff zu snappen.',
      ],
    },
    {
      name: 'Granite Pulse',
      grade: 'V6',
      gradeValue: 6,
      location: 'Comp Wall',
      wallType: WallType.COMPETITION,
      description: 'Moderne Volumenlinie mit Compression, Crossover und dynamischem Top.',
      betaSteps: [
        'Baue Druck zwischen den Volumen auf, statt nur an den Armen zu ziehen.',
        'Fange den Crossover ueber die Beine ab und bleibe lang im Oberkoerper.',
        'Setze den letzten Tritt frueh und committe sauber in den dynamischen Abschluss.',
      ],
    },
  ]

  for (const r of routesData) {
    const existing = await prisma.route.findFirst({ where: { name: r.name } })
    if (existing) {
      console.log(`⏭️  Route bereits vorhanden: ${r.name}`)
      continue
    }

    const route = await prisma.route.create({
      data: {
        name: r.name,
        grade: r.grade,
        gradeValue: r.gradeValue,
        location: r.location,
        wallType: r.wallType,
        description: r.description,
        qrCode: randomUUID(), // eindeutiger QR-Code pro Route
        betaSteps: {
          create: r.betaSteps.map((text, index) => ({
            position: index + 1,
            text,
          })),
        },
      },
    })
    console.log(`✅ Route: ${route.name} (QR: ${route.qrCode})`)
  }

  console.log('\n🎉 Seed abgeschlossen!')
  console.log('─────────────────────────────────')
  console.log('Admin Login:  admin@boulderwall.de / admin1234')
  console.log('Demo Login:   max@demo.de / demo1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
