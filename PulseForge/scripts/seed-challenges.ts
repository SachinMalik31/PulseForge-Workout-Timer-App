/**
 * Seed script — run once to populate the Firestore `challenges` collection.
 *
 *   npx ts-node scripts/seed-challenges.ts
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service-account
 * key file, or run from a Firebase-authenticated environment.
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialise with default credentials (emulator, gcloud auth, or service account)
initializeApp()

const db = getFirestore()

// ── helpers ──────────────────────────────────────────────

type ChallengeDay = { day: number; workoutId: string; workoutName: string }

const buildCardioDays = (): ChallengeDay[] =>
  Array.from({ length: 30 }, (_, i) => {
    const day = i + 1
    if (day % 7 === 0) return { day, workoutId: 'rest', workoutName: 'Active Rest' }
    if (day % 2 === 1)
      return { day, workoutId: 'quick-morning-cardio', workoutName: 'Quick Morning Cardio' }
    return { day, workoutId: 'evening-stretch-flow', workoutName: 'Evening Stretch Flow' }
  })

const buildStrengthDays = (): ChallengeDay[] =>
  Array.from({ length: 30 }, (_, i) => {
    const day = i + 1
    const w = ((day - 1) % 7) + 1
    if (w === 4 || w === 7) return { day, workoutId: 'rest', workoutName: 'Active Rest' }
    if (w <= 3)
      return { day, workoutId: 'core-strength-builder', workoutName: 'Core Strength Builder' }
    return { day, workoutId: 'upper-body-pump', workoutName: 'Upper Body Pump' }
  })

const buildHiitDays = (): ChallengeDay[] =>
  Array.from({ length: 30 }, (_, i) => {
    const day = i + 1
    const w = ((day - 1) % 7) + 1
    if (w === 7) return { day, workoutId: 'rest', workoutName: 'Active Rest' }
    if (w <= 2) return { day, workoutId: 'hiit-blast', workoutName: 'HIIT Blast' }
    if (w === 3)
      return { day, workoutId: 'evening-stretch-flow', workoutName: 'Evening Stretch Flow' }
    if (w <= 5) return { day, workoutId: 'tabata-finisher', workoutName: 'Tabata Finisher' }
    return { day, workoutId: 'core-strength-builder', workoutName: 'Core Strength Builder' }
  })

// ── seed data ────────────────────────────────────────────

const CHALLENGES = [
  {
    name: '30-Day Cardio Blast',
    description: 'Build your cardio base one day at a time.',
    tag: 'CARDIO',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
    difficulty: 'Beginner',
    days: buildCardioDays(),
  },
  {
    name: 'Strength in 30',
    description: 'Get stronger every single day.',
    tag: 'STRENGTH',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    difficulty: 'Intermediate',
    days: buildStrengthDays(),
  },
  {
    name: 'HIIT Warrior',
    description: '30 days. No excuses. Full send.',
    tag: 'HIIT',
    imageUrl: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&q=80',
    difficulty: 'Advanced',
    days: buildHiitDays(),
  },
]

async function seed() {
  const batch = db.batch()

  for (const challenge of CHALLENGES) {
    const ref = db.collection('challenges').doc()
    batch.set(ref, challenge)
    console.log(`  + ${challenge.name}  (${ref.id})`)
  }

  await batch.commit()
  console.log('\nDone — seeded challenges collection.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
