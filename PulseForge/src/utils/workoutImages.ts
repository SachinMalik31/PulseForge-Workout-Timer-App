import { Workout, WorkoutType } from '@types'

export const WORKOUT_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'

const BY_NAME: Record<string, string> = {
  'Quick Morning Cardio':
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  'Core Strength Builder':
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  'HIIT Blast':
    'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&q=80',
  'Evening Stretch Flow':
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
  'Upper Body Pump':
    'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80',
  'Tabata Finisher':
    'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&q=80',
}

const BY_TYPE: Record<WorkoutType, string> = {
  Cardio: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  Strength: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  HIIT: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&q=80',
}

const COACH_IMAGES = [
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
  'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&q=80',
  'https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=800&q=80',
  'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=800&q=80',
]

const getDeterministicIndex = (seed: string, length: number) => {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash % length
}

export const getWorkoutImageUrl = (workout: Workout) => {
  if (workout.name.startsWith('Coach Recommended')) {
    const index = getDeterministicIndex(workout.id || workout.name, COACH_IMAGES.length)
    return COACH_IMAGES[index]
  }

  return BY_NAME[workout.name] ?? BY_TYPE[workout.type]
}
