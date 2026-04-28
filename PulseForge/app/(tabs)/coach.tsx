import React, { useCallback, useMemo, useRef } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAppTheme } from '@context/ThemeContext'
import { useUser } from '@hooks/useUser'
import { useWorkout } from '@context/WorkoutContext'
import { useToast } from '@context/ToastContext'
import { BORDER_RADIUS, FONTS, SPACING } from '@constants'
import { useChat } from '@hooks/useChat'
import { type AppColors } from '@constants'
import type { Difficulty, Exercise, Workout, WorkoutType } from '@types'

interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sourceIndex: number
}

const QUICK_PROMPTS = [
  'Build a 4-week beginner plan',
  'Best exercises for fat loss',
  'How to improve my squat?',
  'Quick 20-min home workout',
]

export default function CoachScreen() {
  const { colors } = useAppTheme()
  const { firstName, user } = useUser()
  const { addWorkout } = useWorkout()
  const { showToast } = useToast()
  const router = useRouter()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [input, setInput] = React.useState('')
  const [savingMessageId, setSavingMessageId] = React.useState<string | null>(null)
  const { messages: chatMessages, isLoading, error, sendMessage: sendChatMessage } = useChat()
  const flatListRef = useRef<FlatList<DisplayMessage>>(null)

  const generateId = () => Math.random().toString(36).slice(2, 11)

  const inferWorkoutType = (text: string): WorkoutType => {
    const normalized = text.toLowerCase()
    if (normalized.includes('hiit') || normalized.includes('interval') || normalized.includes('tabata')) {
      return 'HIIT'
    }
    if (normalized.includes('strength') || normalized.includes('muscle') || normalized.includes('dumbbell')) {
      return 'Strength'
    }
    return 'Cardio'
  }

  const inferDifficulty = (text: string): Difficulty => {
    const normalized = text.toLowerCase()
    if (normalized.includes('advanced')) return 'Advanced'
    if (normalized.includes('intermediate')) return 'Intermediate'
    return 'Beginner'
  }

  const extractExerciseNames = (text: string): string[] => {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const parsed = lines
      .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
      .filter((line) => line.length >= 3)
      .filter((line) => line.length <= 50)
      .filter((line) => !line.includes(':'))

    if (parsed.length === 0) {
      return ['Coach Circuit', 'Mobility Flow', 'Core Finisher']
    }

    return parsed.slice(0, 6)
  }

  const buildCoachWorkout = (content: string): Workout => {
    const names = extractExerciseNames(content)
    const exercises: Exercise[] = names.map((name, index) => ({
      id: generateId(),
      name,
      description: 'Auto-generated from AI Coach recommendation',
      workDuration: 40,
      restDuration: 20,
      reps: 1,
      sets: index < 3 ? 3 : 2,
    }))

    return {
      id: generateId(),
      name: `Coach Recommended ${new Date().toLocaleDateString()}`,
      difficulty: inferDifficulty(content),
      type: inferWorkoutType(content),
      exercises,
      userId: user?.uid ?? '',
    }
  }

  const handleAddToWorkoutPlan = useCallback(async (message: DisplayMessage) => {
    if (!user?.uid) {
      showToast('Sign in required to save workouts')
      return
    }

    setSavingMessageId(message.id)

    try {
      const workout = buildCoachWorkout(message.content)
      await addWorkout(workout)
      showToast('Added to workout plan')
    } catch {
      showToast('Could not save workout')
    } finally {
      setSavingMessageId(null)
    }
  }, [addWorkout, showToast, user?.uid])

  // Convert chat messages to display format
  const displayMessages: DisplayMessage[] = useMemo(
    () =>
      chatMessages
        .filter((m) => m.role !== 'system')
        .map((m, i) => ({
          id: `${m.role}-${i}`,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          sourceIndex: i,
        })),
    [chatMessages]
  )

  // Append error as assistant message if present
  const allMessages: DisplayMessage[] = useMemo(() => {
    if (!error) return displayMessages
    return [
      ...displayMessages,
      {
        id: 'chat-error',
        role: 'assistant' as const,
        content: `⚠️ ${error}`,
        sourceIndex: -1,
      },
    ]
  }, [displayMessages, error])

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return
      setInput('')
      await sendChatMessage(trimmed)
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    },
    [isLoading, sendChatMessage]
  )

  const renderMessage = ({ item }: { item: DisplayMessage }) => {
    const isUser = item.role === 'user'
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAI]}>
        {!isUser && (
          <View style={styles.avatarWrap}>
            <MaterialCommunityIcons name="robot-outline" size={18} color={colors.primary} />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAI,
          ]}
        >
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
            {item.content}
          </Text>
          {!isUser && item.sourceIndex >= 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.addPlanButton,
                savingMessageId === item.id && styles.addPlanButtonDisabled,
                pressed && styles.pressed,
              ]}
              onPress={() => handleAddToWorkoutPlan(item)}
              disabled={savingMessageId === item.id}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.addPlanButtonText}>
                {savingMessageId === item.id ? 'Adding...' : 'Add to workout plan'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    )
  }

  const isEmpty = allMessages.length === 0

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.black} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>AI COACH</Text>
            <Text style={styles.subtitle}>Powered by GPT-4o</Text>
          </View>
          <View style={styles.onlineDot} />
        </View>

        {/* Message list */}
        <FlatList
          ref={flatListRef}
          data={allMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.listContent, isEmpty && styles.listContentEmpty]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="robot-happy-outline" size={56} color={colors.primary} />
              <Text style={styles.emptyTitle}>Hey, {firstName}!</Text>
              <Text style={styles.emptySubtitle}>
                I'm PulseCoach. Ask me anything about workouts, nutrition, or reaching your goals.
              </Text>
              {/* Quick prompts */}
              <View style={styles.quickGrid}>
                {QUICK_PROMPTS.map((prompt) => (
                  <Pressable
                    key={prompt}
                    style={({ pressed }) => [styles.quickChip, pressed && styles.pressed]}
                    onPress={() => handleSend(prompt)}
                  >
                    <Text style={styles.quickChipText}>{prompt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
        />

        {/* Typing indicator */}
        {isLoading && (
          <View style={styles.typingRow}>
            <View style={styles.avatarWrap}>
              <MaterialCommunityIcons name="robot-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.typingText}>Thinking...</Text>
            </View>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your fitness question..."
            placeholderTextColor={colors.grayMid}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => handleSend(input)}
            blurOnSubmit
            editable={!isLoading}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              (!input.trim() || isLoading) && styles.sendBtnDisabled,
              pressed && styles.pressed,
            ]}
            onPress={() => handleSend(input)}
            disabled={!input.trim() || isLoading}
          >
            <MaterialCommunityIcons
              name="send"
              size={20}
              color={!input.trim() || isLoading ? colors.grayMid : colors.white}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: colors.background ?? colors.white },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.base,
      paddingTop: SPACING.base,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    title: {
      fontFamily: FONTS.condensed800,
      fontSize: 22,
      color: colors.black,
      letterSpacing: 0.6,
    },
    subtitle: {
      fontFamily: FONTS.inter400,
      fontSize: 11,
      color: colors.grayMid,
      marginTop: 1,
    },
    onlineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#00C896',
    },

    // List
    listContent: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.base,
      gap: SPACING.md,
    },
    listContentEmpty: {
      flexGrow: 1,
      justifyContent: 'center',
    },

    // Empty state
    emptyWrap: {
      alignItems: 'center',
      paddingHorizontal: SPACING.xl,
      gap: SPACING.md,
    },
    emptyTitle: {
      fontFamily: FONTS.condensed800,
      fontSize: 28,
      color: colors.black,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontFamily: FONTS.inter400,
      fontSize: 15,
      color: colors.grayMid,
      textAlign: 'center',
      lineHeight: 22,
    },
    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: SPACING.sm,
      marginTop: SPACING.sm,
    },
    quickChip: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    quickChipText: {
      fontFamily: FONTS.inter500,
      fontSize: 13,
      color: colors.grayDark,
    },

    // Messages
    msgRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: SPACING.sm,
    },
    msgRowUser: {
      justifyContent: 'flex-end',
    },
    msgRowAI: {
      justifyContent: 'flex-start',
    },
    avatarWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    bubble: {
      maxWidth: '78%',
      borderRadius: BORDER_RADIUS.xl,
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.md,
    },
    bubbleUser: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    bubbleAI: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 4,
    },
    bubbleText: {
      fontSize: 15,
      lineHeight: 22,
    },
    bubbleTextUser: {
      fontFamily: FONTS.inter400,
      color: '#FFFFFF',
    },
    bubbleTextAI: {
      fontFamily: FONTS.inter400,
      color: colors.black,
    },
    addPlanButton: {
      marginTop: SPACING.sm,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 6,
      backgroundColor: colors.background ?? colors.white,
    },
    addPlanButtonDisabled: {
      opacity: 0.6,
    },
    addPlanButtonText: {
      fontFamily: FONTS.inter600,
      fontSize: 12,
      color: colors.primary,
    },

    // Typing
    typingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.sm,
    },
    typingBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.xl,
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.sm,
    },
    typingText: {
      fontFamily: FONTS.inter400,
      fontSize: 13,
      color: colors.grayMid,
    },

    // Input bar
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.base,
      borderTopWidth: 1,
      borderTopColor: colors.surface,
      backgroundColor: colors.background ?? colors.white,
    },
    input: {
      flex: 1,
      backgroundColor: colors.inputBg,
      borderRadius: BORDER_RADIUS.xl,
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.md,
      fontFamily: FONTS.inter400,
      fontSize: 15,
      color: colors.black,
      maxHeight: 120,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      backgroundColor: colors.surface,
    },

    pressed: { opacity: 0.75 },
  })
