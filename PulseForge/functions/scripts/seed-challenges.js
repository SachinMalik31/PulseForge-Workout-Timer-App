/* eslint-disable no-console */
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const fs = require('node:fs')
const path = require('node:path')

const CHALLENGES_COLLECTION = 'challenges'

const loadProjectIdFromDotEnv = () => {
  try {
    const envPath = path.resolve(__dirname, '../../.env')
    if (!fs.existsSync(envPath)) return null

    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
    const line = lines.find((item) => item.startsWith('EXPO_PUBLIC_FIREBASE_PROJECT_ID='))
    if (!line) return null

    const value = line.split('=')[1]?.trim()
    return value || null
  } catch {
    return null
  }
}

const buildDays = (workoutNames) =>
  Array.from({ length: 30 }, (_, idx) => {
    const day = idx + 1
    const isRestDay = day % 7 === 0
    const workoutName = isRestDay ? 'Active Rest' : workoutNames[idx % workoutNames.length]
    const workoutId = isRestDay
      ? 'rest'
      : workoutName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')

    return { day, workoutId, workoutName }
  })

const CHALLENGES = [
  {
    id: 'cardio-burn-30',
    name: 'Cardio Burn 30',
    description: 'Build stamina with steady cardio sessions and recovery days.',
    tag: 'CARDIO',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
    difficulty: 'Beginner',
    days: buildDays(['Quick Morning Cardio', 'HIIT Blast', 'Tabata Finisher']),
  },
  {
    id: 'strength-foundation-30',
    name: 'Strength Foundation',
    description: 'Progressive upper-body and core work to build consistent strength.',
    tag: 'STRENGTH',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    difficulty: 'Intermediate',
    days: buildDays(['Core Strength Builder', 'Upper Body Pump', 'HIIT Blast']),
  },
  {
    id: 'mobility-reset-30',
    name: 'Mobility Reset 30',
    description: 'Mobility and cardio blend to improve movement quality every week.',
    tag: 'MIXED',
    imageUrl: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&q=80',
    difficulty: 'Beginner',
    days: buildDays(['Evening Stretch Flow', 'Quick Morning Cardio', 'HIIT Blast']),
  },
]

const getCredential = () => {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
    return cert(serviceAccount)
  }

  return applicationDefault()
}

const getProjectId = () =>
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
  loadProjectIdFromDotEnv()

async function run() {
  const projectId = getProjectId()

  initializeApp({
    credential: getCredential(),
    ...(projectId ? { projectId } : {}),
  })

  if (!projectId) {
    console.warn('Project ID not found in env; relying on ADC project detection.')
  }

  const db = getFirestore()
  const batch = db.batch()

  for (const challenge of CHALLENGES) {
    const { id, ...payload } = challenge
    const ref = db.collection(CHALLENGES_COLLECTION).doc(id)
    batch.set(ref, payload, { merge: true })
    console.log(`Upserted ${CHALLENGES_COLLECTION}/${id}`)
  }

  await batch.commit()
  console.log('Done seeding challenges.')
}

run().catch((err) => {
  console.error('Failed to seed challenges.')
  console.error(err)
  process.exit(1)
})
