import React, { useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useWorkout } from '@context/WorkoutContext'
import { useAppTheme } from '@context/ThemeContext'
import { BORDER_RADIUS, FONTS, SPACING } from '@constants'
import { calculateWorkoutDuration, formatTime } from '@utils/helpers'
import { Exercise } from '@types'

export default function StartWorkoutScreen() {
  const router = useRouter()
  const {
    currentWorkout,
    addExerciseToWorkout,
    updateExerciseInWorkout,
    deleteExerciseFromWorkout,
  } = useWorkout()
  const { colors } = useAppTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [exerciseName, setExerciseName] = useState('')
  const [workDuration, setWorkDuration] = useState('')
  const [restDuration, setRestDuration] = useState('')
  const [reps, setReps] = useState('')
  const [sets, setSets] = useState('')
  const [description, setDescription] = useState('')

  if (!currentWorkout) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>NO WORKOUT SELECTED</Text>
        </View>
      </SafeAreaView>
    )
  }

  const resetForm = () => {
    setExerciseName('')
    setWorkDuration('')
    setRestDuration('')
    setReps('')
    setSets('')
    setDescription('')
  }

  const handleAddExercise = () => {
    resetForm()
    setEditingExercise(null)
    setIsModalVisible(true)
  }

  const handleEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setExerciseName(exercise.name)
    setWorkDuration(exercise.workDuration.toString())
    setRestDuration(exercise.restDuration.toString())
    setReps(exercise.reps.toString())
    setSets(exercise.sets.toString())
    setDescription(exercise.description)
    setIsModalVisible(true)
  }

  const handleDeleteExercise = (exerciseId: string) => {
    Alert.alert('Delete Exercise', 'Are you sure?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: () => deleteExerciseFromWorkout(currentWorkout.id, exerciseId),
      },
    ])
  }

  const handleSaveExercise = async () => {
    if (!exerciseName || !workDuration) {
      Alert.alert('Missing Fields', 'Exercise name and work duration are required')
      return
    }

    const newExercise: Exercise = {
      id: editingExercise?.id || Math.random().toString(36).substr(2, 9),
      name: exerciseName,
      description,
      workDuration: parseInt(workDuration, 10),
      restDuration: parseInt(restDuration, 10) || 0,
      reps: parseInt(reps, 10) || 1,
      sets: parseInt(sets, 10) || 1,
    }

    try {
      if (editingExercise) {
        await updateExerciseInWorkout(currentWorkout.id, editingExercise.id, newExercise)
      } else {
        await addExerciseToWorkout(currentWorkout.id, newExercise)
      }
      setIsModalVisible(false)
      resetForm()
    } catch (error) {
      console.error('Error saving exercise:', error)
      Alert.alert('Error', 'Failed to save exercise')
    }
  }

  const handleStartWorkout = () => {
    if (currentWorkout.exercises.length === 0) {
      Alert.alert('No Exercises', 'Please add at least one exercise before starting')
      return
    }

    router.push('/timer')
  }

  const totalDuration = calculateWorkoutDuration(currentWorkout.exercises)

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && styles.pressedScale]}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.black} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>{currentWorkout.name.toUpperCase()}</Text>
            <Text style={styles.headerSub}>
              {currentWorkout.exercises.length} EXERCISES Â· {formatTime(totalDuration).toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.headerDivider} />

        <FlatList
          data={currentWorkout.exercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <Pressable
              style={({ pressed }) => [styles.addRow, pressed && styles.pressedScale]}
              onPress={handleAddExercise}
            >
              <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
              <Text style={styles.addRowText}>ADD EXERCISE</Text>
            </Pressable>
          }
          renderItem={({ item, index }) => (
            <View>
              <View style={styles.exerciseRow}>
                <Text style={styles.exerciseNumber}>{`${String(index + 1).padStart(2, '0')}`}</Text>

                <View style={styles.exerciseMiddle}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
                  <View style={styles.chipWrap}>
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>{item.workDuration}s WORK</Text>
                    </View>
                    {item.restDuration > 0 ? (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{item.restDuration}s REST</Text>
                      </View>
                    ) : null}
                    {item.reps > 1 ? (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{item.reps} REPS</Text>
                      </View>
                    ) : null}
                    {item.sets > 1 ? (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{item.sets} SETS</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.exerciseActions}>
                  <Pressable
                    onPress={() => handleEditExercise(item)}
                    style={({ pressed }) => [styles.iconButton, pressed && styles.pressedScale]}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.grayLight} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteExercise(item.id)}
                    style={({ pressed }) => [styles.iconButton, pressed && styles.pressedScale]}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.grayLight} />
                  </Pressable>
                </View>
              </View>
              {item.description ? <Text style={styles.descriptionRow}>{item.description}</Text> : null}
            </View>
          )}
        />

        <View style={styles.bottomCtaWrap}>
          <Pressable
            onPress={handleStartWorkout}
            style={({ pressed }) => [styles.startButton, pressed && styles.pressedScale]}
          >
            <MaterialCommunityIcons name="circle-medium" size={16} color={colors.primary} />
            <Text style={styles.startButtonText}>START WORKOUT</Text>
          </Pressable>
        </View>

        <Modal
          visible={isModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingExercise ? 'EDIT EXERCISE' : 'NEW EXERCISE'}
                  </Text>
                  <Pressable onPress={() => setIsModalVisible(false)}>
                    <MaterialCommunityIcons name="close" size={22} color={colors.black} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>EXERCISE NAME *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Push-ups"
                      placeholderTextColor={colors.textSecondary}
                      value={exerciseName}
                      onChangeText={setExerciseName}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>WORK DURATION (SECONDS) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 45"
                      placeholderTextColor={colors.textSecondary}
                      value={workDuration}
                      onChangeText={setWorkDuration}
                      keyboardType="number-pad"
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, styles.halfInput]}>
                      <Text style={styles.label}>REST</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="15"
                        placeholderTextColor={colors.textSecondary}
                        value={restDuration}
                        onChangeText={setRestDuration}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={[styles.inputGroup, styles.halfInput]}>
                      <Text style={styles.label}>REPS</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="10"
                        placeholderTextColor={colors.textSecondary}
                        value={reps}
                        onChangeText={setReps}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={[styles.inputGroup, styles.halfInput]}>
                      <Text style={styles.label}>SETS</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="3"
                        placeholderTextColor={colors.textSecondary}
                        value={sets}
                        onChangeText={setSets}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>DESCRIPTION</Text>
                    <TextInput
                      style={[styles.input, styles.textarea]}
                      placeholder="Add notes or form tips"
                      placeholderTextColor={colors.textSecondary}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                    />
                  </View>
                </ScrollView>

                <Pressable onPress={handleSaveExercise} style={({ pressed }) => [styles.saveButton, pressed && styles.pressedScale]}>
                  <Text style={styles.saveButtonText}>
                    {editingExercise ? 'SAVE CHANGES' : 'ADD EXERCISE'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  )
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONTS.condensed800,
    fontSize: 32,
    color: colors.black,
  },
  headerSub: {
    marginTop: 2,
    fontFamily: FONTS.inter500,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  headerDivider: {
    height: 1,
    backgroundColor: colors.surface,
    marginBottom: SPACING.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 140,
  },
  exerciseRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.grayFaint,
    paddingVertical: 10,
  },
  exerciseNumber: {
    width: 34,
    fontFamily: FONTS.condensed700,
    fontSize: 20,
    color: colors.grayLight,
  },
  exerciseMiddle: {
    flex: 1,
    paddingRight: 8,
  },
  exerciseName: {
    fontFamily: FONTS.inter600,
    fontSize: 16,
    color: colors.black,
  },
  chipWrap: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: colors.offWhite,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontFamily: FONTS.inter500,
    fontSize: 11,
    color: colors.grayMid,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionRow: {
    marginBottom: 8,
    marginLeft: 34,
    fontFamily: FONTS.inter400,
    fontSize: 14,
    color: colors.grayMid,
  },
  addRow: {
    marginTop: 10,
    minHeight: 72,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: colors.surface,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addRowText: {
    fontFamily: FONTS.inter600,
    fontSize: 14,
    color: colors.black,
    letterSpacing: 0.6,
  },
  bottomCtaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    paddingHorizontal: SPACING.lg,
    paddingTop: 12,
    paddingBottom: SPACING.xl,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  startButton: {
    height: 56,
    borderRadius: BORDER_RADIUS.xxl,
    backgroundColor: colors.black,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  startButtonText: {
    fontFamily: FONTS.condensed700,
    fontSize: 18,
    color: colors.white,
    letterSpacing: 1.5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,10,10,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    maxHeight: '85%',
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontFamily: FONTS.condensed800,
    fontSize: 28,
    color: colors.black,
  },
  modalBody: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    fontFamily: FONTS.inter500,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: colors.offWhite,
    paddingHorizontal: 14,
    fontFamily: FONTS.inter500,
    fontSize: 15,
    color: colors.black,
  },
  textarea: {
    height: 92,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 8,
    marginHorizontal: SPACING.lg,
    height: 56,
    borderRadius: BORDER_RADIUS.xxl,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontFamily: FONTS.condensed700,
    fontSize: 18,
    color: colors.white,
    letterSpacing: 1.1,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: FONTS.condensed700,
    fontSize: 28,
    color: colors.grayLight,
  },
  pressedScale: {
    transform: [{ scale: 0.97 }],
  },
})
