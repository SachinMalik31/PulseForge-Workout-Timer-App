// User and Auth Types
export interface User {
  id: string
  fullName: string
  email: string
}

// Firestore user document shape (stored in /users/{uid})
export interface FirestoreUser {
  uid: string
  fullName: string
  email: string
  photoURL: string | null
  createdAt: string // ISO date
  updatedAt: string // ISO date
}

// Exercise Types
export interface Exercise {
  id: string
  name: string
  description: string
  workDuration: number // seconds
  restDuration: number // seconds
  reps: number
  sets: number
}

// Workout Types
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type WorkoutType = 'Cardio' | 'Strength' | 'HIIT'

export interface Workout {
  id: string
  name: string
  difficulty: Difficulty
  type: WorkoutType
  exercises: Exercise[]
  totalDuration?: number // calculated in minutes
  userId: string // owner uid
  createdAt?: string // ISO date
}

// Workout History
export interface WorkoutHistory {
  id: string
  workoutId: string
  workoutName: string
  completedAt: string // ISO date
  durationSeconds: number
  exercisesCompleted: number
  userId: string // owner uid
}

// Settings
export interface AppSettings {
  audioAlerts: boolean
  voiceGuidance: boolean
  vibration: boolean
  theme: 'light' | 'dark' | 'system'
  keepScreenOn: boolean
  countdownBeforeStart: number // 0-10 seconds
}

// Timer states
export type TimerState = 'idle' | 'countdown' | 'exercise' | 'rest' | 'complete'

export interface TimerStatus {
  state: TimerState
  currentExerciseIndex: number
  timeRemaining: number // seconds
  isRunning: boolean
  completedExercises: number
}

// Chat types (for OpenAI Cloud Function)
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  message: string
}

// Service result wrapper
export interface ServiceResult<T> {
  data: T | null
  error: string | null
}

// Challenge types (Explore screen)
export type ChallengeTag = 'CARDIO' | 'STRENGTH' | 'HIIT' | 'MIXED'

export interface ChallengeDay {
  day: number
  workoutId: string
  workoutName: string
}

export interface Challenge {
  id: string
  name: string
  description: string
  tag: ChallengeTag
  imageUrl: string
  days: ChallengeDay[]
  difficulty: Difficulty
}

export interface UserChallenge {
  id: string
  userId: string
  challengeId: string
  startDate: string // ISO date
  completedDays: number[]
  isActive: boolean
}

// Generated program types
export type ProgramGoal = 'Lose Weight' | 'Build Muscle' | 'Get Flexible' | 'Boost Cardio'

export interface ProgramDay {
  day: number
  week: number
  workoutName: string | 'Rest'
  completed: boolean
}

export interface GeneratedProgram {
  id: string
  userId: string
  goal: ProgramGoal
  daysPerWeek: number
  durationWeeks: number
  generatedAt: string // ISO date
  currentDay: number
  schedule: ProgramDay[]
}
