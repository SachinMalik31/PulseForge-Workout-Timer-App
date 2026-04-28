export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`
}

export const formatMinutes = (seconds: number): string => {
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} min`
}

export const getDifficultyColor = (
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
) => {
  switch (difficulty) {
    case 'Beginner':
      return '#DBEAFE'
    case 'Intermediate':
      return '#FEF3C7'
    case 'Advanced':
      return '#FECACA'
    default:
      return '#E5E7EB'
  }
}

export const getDifficultyTextColor = (
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
) => {
  switch (difficulty) {
    case 'Beginner':
      return '#1E40AF'
    case 'Intermediate':
      return '#92400E'
    case 'Advanced':
      return '#7F1D1D'
    default:
      return '#000000'
  }
}

export const getWorkoutTypeIcon = (
  type: 'Cardio' | 'Strength' | 'HIIT'
): string => {
  switch (type) {
    case 'Cardio':
      return '🏃'
    case 'Strength':
      return '💪'
    case 'HIIT':
      return '⚡'
    default:
      return '🏋️'
  }
}

export const calculateWorkoutDuration = (
  exercises: Array<{ workDuration: number; restDuration: number }>
): number => {
  let total = 0
  exercises.forEach((ex) => {
    total += ex.workDuration + ex.restDuration
  })
  return total
}
