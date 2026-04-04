import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyWorkout, Exercise, ExerciseType, TimerSettings, SetEntry, FeedbackMode, isDurationBasedExercise, EXERCISE_NAMES, CustomExerciseType, TimerRecord, WorkoutTemplate } from '@/types/workout';

const generateId = () => Math.random().toString(36).substring(2, 9);

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createEmptyEntry = (): SetEntry => ({ reps: 0 });

interface WorkoutState {
  workouts: DailyWorkout[];
  timerSettings: TimerSettings;
  selectedDate: string;
  workoutTimerRunning: boolean;
  workoutTimerStartedAt: number | null;
  workoutTimerTargetDate: string | null;
  customExercises: CustomExerciseType[];
  templates: WorkoutTemplate[];
  hiddenBuiltinExercises: string[];

  // Actions
  setSelectedDate: (date: string) => void;
  addExercise: (type: ExerciseType) => void;
  removeExercise: (exerciseId: string) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setIndex: number) => void;
  copySet: (exerciseId: string, setIndex: number) => void;
  addSetEntry: (exerciseId: string, setIndex: number) => void;
  removeSetEntry: (exerciseId: string, setIndex: number, entryIndex: number) => void;
  updateEntryReps: (exerciseId: string, setIndex: number, entryIndex: number, reps: number) => void;
  updateEntryWeight: (exerciseId: string, setIndex: number, entryIndex: number, weight: number) => void;
  updateEntryVariation: (exerciseId: string, setIndex: number, entryIndex: number, variation: string) => void;
  updateEntryTempo: (exerciseId: string, setIndex: number, entryIndex: number, tempo: string) => void;
  toggleEntryAssistance: (exerciseId: string, setIndex: number, entryIndex: number) => void;
  toggleSetCompleted: (exerciseId: string, setIndex: number) => void;
  updateCardioDuration: (exerciseId: string, duration: number) => void;
  updateDurationMinutes: (exerciseId: string, minutes: number) => void;
  updateTimerSettings: (settings: Partial<TimerSettings>) => void;
  startWorkoutTimer: () => void;
  stopWorkoutTimer: () => void;
  resetWorkoutTimer: () => void;
  getTodayWorkout: () => DailyWorkout | undefined;
  getWorkoutByDate: (date: string) => DailyWorkout | undefined;
  getSelectedWorkoutDurationSeconds: () => number;
  getAllWorkouts: () => DailyWorkout[];
  addCustomExercise: (exercise: Omit<CustomExerciseType, 'id'>) => void;
  removeCustomExercise: (id: string) => void;
  getCustomExercise: (id: string) => CustomExerciseType | undefined;
  addTimerRecord: (record: Omit<TimerRecord, 'timestamp'>) => void;
  removeTimerRecord: (date: string, index: number) => void;
  removeWorkoutDuration: (date: string) => void;
  copyLatestWorkout: () => void;
  saveTemplate: (name: string) => void;
  getTemplates: () => WorkoutTemplate[];
  deleteTemplate: (id: string) => void;
  updateTemplate: (id: string) => void;
  renameTemplate: (id: string, name: string) => void;
  addExerciseToTemplate: (templateId: string, exerciseType: ExerciseType) => void;
  removeExerciseFromTemplate: (templateId: string, exerciseId: string) => void;
  applyTemplate: (id: string) => void;
  hideBuiltinExercise: (type: string) => void;
  showBuiltinExercise: (type: string) => void;
}

// ヘルパー: 今日のエクササイズのセットのエントリを更新
const updateEntryByDate = (
  state: { workouts: DailyWorkout[] },
  date: string,
  exerciseId: string,
  setIndex: number,
  entryIndex: number,
  updater: (entry: SetEntry) => SetEntry
) => {
  return {
    workouts: state.workouts.map((w) =>
      w.date === date
        ? {
            ...w,
            exercises: w.exercises.map((e) =>
              e.id === exerciseId
                ? {
                    ...e,
                    sets: e.sets.map((s, si) =>
                      si === setIndex
                        ? {
                            ...s,
                            entries: s.entries.map((entry, ei) =>
                              ei === entryIndex ? updater(entry) : entry
                            ),
                          }
                        : s
                    ),
                  }
                : e
            ),
          }
        : w
    ),
  };
};

// 旧フォーマットからの移行
const migrateWorkouts = (workouts: any[]): DailyWorkout[] => {
  return workouts.map((workout) => ({
    ...workout,
    exercises: workout.exercises.map((exercise: any) => ({
      ...exercise,
      sets: exercise.sets.map((set: any) => {
        // 新フォーマット（entries配列あり）ならそのまま
        if (set.entries) return set;
        // 旧フォーマット → 新フォーマットに変換
        const entry: SetEntry = {
          reps: set.reps || 0,
          variation: set.variation,
          tempo: set.tempo,
          assistance: set.assistance,
        };
        return {
          entries: [entry],
          completed: set.completed || false,
          metronome: set.metronome,
        };
      }),
    })),
  }));
};

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      workouts: [],
      timerSettings: {
        intervalSeconds: 60,
        metronomeBpm: 60,
        metronomeBeats: 4,
        feedbackMode: 'both',
      },
      selectedDate: getTodayDate(),
      workoutTimerRunning: false,
      workoutTimerStartedAt: null,
      workoutTimerTargetDate: null,
      customExercises: [],
      templates: [],
      hiddenBuiltinExercises: [],

      setSelectedDate: (date: string) => {
        set({ selectedDate: date });
      },

      addExercise: (type: ExerciseType) => {
        const selectedDate = get().selectedDate;

        // カスタム種目の場合は名前を取得
        const customExercise = get().customExercises.find((e) => e.id === type);
        const exerciseName = EXERCISE_NAMES[type] || customExercise?.name || type;
        const isDuration = customExercise?.isDuration || isDurationBasedExercise(type);

        const newExercise: Exercise = {
          id: generateId(),
          type,
          name: exerciseName,
          sets: isDuration ? [] : [{ entries: [createEmptyEntry()], completed: false }],
          duration: isDuration ? 0 : undefined,
          durationMinutes: undefined,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          const existingWorkout = state.workouts.find((w) => w.date === selectedDate);

          if (existingWorkout) {
            return {
              workouts: state.workouts.map((w) =>
                w.date === selectedDate
                  ? { ...w, exercises: [...w.exercises, newExercise] }
                  : w
              ),
            };
          } else {
            return {
              workouts: [
                ...state.workouts,
                { date: selectedDate, exercises: [newExercise], durationSeconds: 0 },
              ],
            };
          }
        });
      },

      removeExercise: (exerciseId: string) => {
        const selectedDate = get().selectedDate;
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.date === selectedDate
              ? { ...w, exercises: w.exercises.filter((e) => e.id !== exerciseId) }
              : w
          ).filter((w) => w.exercises.length > 0 || (w.durationSeconds || 0) > 0),
        }));
      },

      addSet: (exerciseId: string) => {
        const selectedDate = get().selectedDate;
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.date === selectedDate
              ? {
                  ...w,
                  exercises: w.exercises.map((e) =>
                    e.id === exerciseId
                      ? { ...e, sets: [...e.sets, { entries: [createEmptyEntry()], completed: false }] }
                      : e
                  ),
                }
              : w
          ),
        }));
      },

      removeSet: (exerciseId: string, setIndex: number) => {
        const selectedDate = get().selectedDate;
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.date === selectedDate
              ? {
                  ...w,
                  exercises: w.exercises.map((e) =>
                    e.id === exerciseId
                      ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) }
                      : e
                  ),
                }
              : w
          ),
        }));
      },

      copySet: (exerciseId: string, setIndex: number) => {
        const selectedDate = get().selectedDate;
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.date === selectedDate
              ? {
                  ...w,
                  exercises: w.exercises.map((e) => {
                    if (e.id !== exerciseId) return e;
                    const sourceSet = e.sets[setIndex];
                    if (!sourceSet) return e;
                    const copiedEntries = sourceSet.entries.map((entry) => ({ ...entry }));
                    const newSets = [...e.sets];
                    if (newSets[setIndex + 1]) {
                      // 次のセットが既に存在する → 内容を上書き
                      newSets[setIndex + 1] = {
                        ...newSets[setIndex + 1],
                        entries: copiedEntries,
                      };
                    } else {
                      // 次のセットがない → 新規挿入
                      newSets.splice(setIndex + 1, 0, {
                        entries: copiedEntries,
                        completed: false,
                        metronome: sourceSet.metronome,
                      });
                    }
                    return { ...e, sets: newSets };
                  }),
                }
              : w
          ),
        }));
      },

      addSetEntry: (exerciseId: string, setIndex: number) => {
        const selectedDate = get().selectedDate;
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.date === selectedDate
              ? {
                  ...w,
                  exercises: w.exercises.map((e) =>
                    e.id === exerciseId
                      ? {
                          ...e,
                          sets: e.sets.map((s, si) =>
                            si === setIndex
                              ? { ...s, entries: [...s.entries, createEmptyEntry()] }
                              : s
                          ),
                        }
                      : e
                  ),
                }
              : w
          ),
        }));
      },

      removeSetEntry: (exerciseId: string, setIndex: number, entryIndex: number) => {
        const selectedDate = get().selectedDate;
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.date === selectedDate
              ? {
                  ...w,
                  exercises: w.exercises.map((e) =>
                    e.id === exerciseId
                      ? {
                          ...e,
                          sets: e.sets.map((s, si) =>
                            si === setIndex
                              ? { ...s, entries: s.entries.filter((_, ei) => ei !== entryIndex) }
                              : s
                          ),
                        }
                      : e
                  ),
                }
              : w
          ),
        }));
      },

      updateEntryReps: (exerciseId: string, setIndex: number, entryIndex: number, reps: number) => {
        const selectedDate = get().selectedDate;
        set((state) => updateEntryByDate(state, selectedDate, exerciseId, setIndex, entryIndex, (entry) => ({ ...entry, reps })));
      },

      updateEntryWeight: (exerciseId: string, setIndex: number, entryIndex: number, weight: number) => {
        const selectedDate = get().selectedDate;
        set((state) => updateEntryByDate(state, selectedDate, exerciseId, setIndex, entryIndex, (entry) => ({ ...entry, weight })));
      },

      updateEntryVariation: (exerciseId: string, setIndex: number, entryIndex: number, variation: string) => {
        const selectedDate = get().selectedDate;
        set((state) => updateEntryByDate(state, selectedDate, exerciseId, setIndex, entryIndex, (entry) => ({ ...entry, variation })));
      },

      updateEntryTempo: (exerciseId: string, setIndex: number, entryIndex: number, tempo: string) => {
        const selectedDate = get().selectedDate;
        set((state) => updateEntryByDate(state, selectedDate, exerciseId, setIndex, entryIndex, (entry) => ({ ...entry, tempo })));
      },

      toggleEntryAssistance: (exerciseId: string, setIndex: number, entryIndex: number) => {
        const selectedDate = get().selectedDate;
        set((state) => updateEntryByDate(state, selectedDate, exerciseId, setIndex, entryIndex, (entry) => ({ ...entry, assistance: !entry.assistance })));
      },

      toggleSetCompleted: (exerciseId: string, setIndex: number) => {
        const selectedDate = get().selectedDate;
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.date === selectedDate
              ? {
                  ...w,
                  exercises: w.exercises.map((e) =>
                    e.id === exerciseId
                      ? {
                          ...e,
                          sets: e.sets.map((s, i) =>
                            i === setIndex ? { ...s, completed: !s.completed } : s
                          ),
                        }
                      : e
                  ),
                }
              : w
          ),
        }));
      },

      updateCardioDuration: (exerciseId: string, duration: number) => {
        const selectedDate = get().selectedDate;
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.date === selectedDate
              ? {
                  ...w,
                  exercises: w.exercises.map((e) =>
                    e.id === exerciseId
                      ? {
                          ...e,
                          duration,
                          durationMinutes: duration % 60 === 0 ? duration / 60 : e.durationMinutes,
                        }
                      : e
                  ),
                }
              : w
          ),
        }));
      },

      updateDurationMinutes: (exerciseId: string, minutes: number) => {
        const selectedDate = get().selectedDate;
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.date === selectedDate
              ? {
                  ...w,
                  exercises: w.exercises.map((e) =>
                    e.id === exerciseId
                      ? {
                          ...e,
                          durationMinutes: minutes,
                          duration: minutes * 60,
                        }
                      : e
                  ),
                }
              : w
          ),
        }));
      },

      updateTimerSettings: (settings: Partial<TimerSettings>) => {
        set((state) => ({
          timerSettings: { ...state.timerSettings, ...settings },
        }));
      },

      startWorkoutTimer: () => {
        if (get().workoutTimerRunning) return;
        const { selectedDate } = get();
        set({
          workoutTimerRunning: true,
          workoutTimerStartedAt: Date.now(),
          workoutTimerTargetDate: selectedDate,
        });
      },

      stopWorkoutTimer: () => {
        const { workoutTimerRunning, workoutTimerStartedAt, workoutTimerTargetDate } = get();
        if (!workoutTimerRunning || !workoutTimerStartedAt) {
          set({ workoutTimerRunning: false, workoutTimerStartedAt: null, workoutTimerTargetDate: null });
          return;
        }

        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - workoutTimerStartedAt) / 1000));
        set((state) => {
          if (elapsedSeconds === 0) {
            return { workoutTimerRunning: false, workoutTimerStartedAt: null, workoutTimerTargetDate: null };
          }

          const targetDate = workoutTimerTargetDate;
          if (!targetDate) {
            return { workoutTimerRunning: false, workoutTimerStartedAt: null, workoutTimerTargetDate: null };
          }
          const existingWorkout = state.workouts.find((w) => w.date === targetDate);
          if (existingWorkout) {
            return {
              workoutTimerRunning: false,
              workoutTimerStartedAt: null,
              workoutTimerTargetDate: null,
              workouts: state.workouts.map((w) =>
                w.date === targetDate
                  ? { ...w, durationSeconds: (w.durationSeconds || 0) + elapsedSeconds }
                  : w
              ),
            };
          }

          return {
            workoutTimerRunning: false,
            workoutTimerStartedAt: null,
            workoutTimerTargetDate: null,
            workouts: [
              ...state.workouts,
              { date: targetDate, exercises: [], durationSeconds: elapsedSeconds },
            ],
          };
        });
      },

      removeWorkoutDuration: (date: string) => {
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.date === date ? { ...w, durationSeconds: 0 } : w
          ).filter((w) => w.exercises.length > 0 || (w.timerRecords?.length ?? 0) > 0),
        }));
      },

      resetWorkoutTimer: () => {
        const { selectedDate } = get();
        set((state) => ({
          workoutTimerRunning: false,
          workoutTimerStartedAt: null,
          workoutTimerTargetDate: null,
          workouts: state.workouts.map((w) =>
            w.date === selectedDate ? { ...w, durationSeconds: 0 } : w
          ),
        }));
      },

      getTodayWorkout: () => {
        const today = getTodayDate();
        return get().workouts.find((w) => w.date === today);
      },

      getWorkoutByDate: (date: string) => {
        return get().workouts.find((w) => w.date === date);
      },

      getSelectedWorkoutDurationSeconds: () => {
        const { selectedDate, workoutTimerRunning, workoutTimerStartedAt, workoutTimerTargetDate } = get();
        const existingWorkout = get().workouts.find((w) => w.date === selectedDate);
        const baseSeconds = existingWorkout?.durationSeconds || 0;
        if (!workoutTimerRunning || !workoutTimerStartedAt) return baseSeconds;
        if (workoutTimerTargetDate !== selectedDate) return baseSeconds;
        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - workoutTimerStartedAt) / 1000));
        return baseSeconds + elapsedSeconds;
      },

      getAllWorkouts: () => {
        return get().workouts;
      },

      addCustomExercise: (exercise: Omit<CustomExerciseType, 'id'>) => {
        const newExercise: CustomExerciseType = {
          ...exercise,
          id: `custom-${generateId()}`,
        };
        set((state) => ({
          customExercises: [...state.customExercises, newExercise],
        }));
      },

      removeCustomExercise: (id: string) => {
        set((state) => ({
          customExercises: state.customExercises.filter((e) => e.id !== id),
        }));
      },

      getCustomExercise: (id: string) => {
        return get().customExercises.find((e) => e.id === id);
      },

      addTimerRecord: (record: Omit<TimerRecord, 'timestamp'>) => {
        const selectedDate = get().selectedDate;
        const newRecord: TimerRecord = {
          ...record,
          timestamp: new Date().toISOString(),
        };

        set((state) => {
          const existingWorkout = state.workouts.find((w) => w.date === selectedDate);

          if (existingWorkout) {
            return {
              workouts: state.workouts.map((w) =>
                w.date === selectedDate
                  ? { ...w, timerRecords: [...(w.timerRecords || []), newRecord] }
                  : w
              ),
            };
          } else {
            return {
              workouts: [
                ...state.workouts,
                { date: selectedDate, exercises: [], durationSeconds: 0, timerRecords: [newRecord] },
              ],
            };
          }
        });
      },

      removeTimerRecord: (date: string, index: number) => {
        set((state) => ({
          workouts: state.workouts.map((w) =>
            w.date === date
              ? { ...w, timerRecords: (w.timerRecords || []).filter((_, i) => i !== index) }
              : w
          ),
        }));
      },

      copyLatestWorkout: () => {
        const { selectedDate, workouts } = get();

        // 選択日より前の日付でexercisesがあるworkoutを日付降順でソート
        const pastWorkouts = workouts
          .filter((w) => w.date < selectedDate && w.exercises.length > 0)
          .sort((a, b) => b.date.localeCompare(a.date));

        const latestWorkout = pastWorkouts[0];
        if (!latestWorkout) {
          return;
        }

        const copiedExercises: Exercise[] = latestWorkout.exercises.map((exercise) => ({
          ...exercise,
          id: generateId(),
          createdAt: new Date().toISOString(),
          sets: exercise.sets.map((set) => ({
            ...set,
            completed: false,
          })),
        }));

        set((state) => {
          const existingWorkout = state.workouts.find((w) => w.date === selectedDate);

          if (existingWorkout) {
            return {
              workouts: state.workouts.map((w) =>
                w.date === selectedDate
                  ? { ...w, exercises: [...w.exercises, ...copiedExercises] }
                  : w
              ),
            };
          } else {
            return {
              workouts: [
                ...state.workouts,
                { date: selectedDate, exercises: copiedExercises, durationSeconds: 0 },
              ],
            };
          }
        });
      },

      saveTemplate: (name: string) => {
        const { selectedDate, workouts } = get();
        const workout = workouts.find((w) => w.date === selectedDate);

        if (!workout || workout.exercises.length === 0) {
          return;
        }

        const template: WorkoutTemplate = {
          id: generateId(),
          name,
          exercises: workout.exercises.map((exercise) => ({
            ...exercise,
            id: generateId(),
            createdAt: new Date().toISOString(),
            sets: exercise.sets.map((set) => ({
              ...set,
              completed: false,
            })),
          })),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          templates: [...state.templates, template],
        }));
      },

      getTemplates: () => {
        return get().templates;
      },

      deleteTemplate: (id: string) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        }));
      },

      updateTemplate: (id: string) => {
        const { selectedDate, workouts } = get();
        const workout = workouts.find((w) => w.date === selectedDate);

        if (!workout || workout.exercises.length === 0) {
          return;
        }

        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id
              ? {
                  ...t,
                  exercises: workout.exercises.map((exercise) => ({
                    ...exercise,
                    id: generateId(),
                    createdAt: new Date().toISOString(),
                    sets: exercise.sets.map((set) => ({
                      ...set,
                      completed: false,
                    })),
                  })),
                }
              : t
          ),
        }));
      },

      renameTemplate: (id: string, name: string) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, name } : t
          ),
        }));
      },

      addExerciseToTemplate: (templateId: string, exerciseType: ExerciseType) => {
        const customExercise = get().customExercises.find((e) => e.id === exerciseType);
        const exerciseName = EXERCISE_NAMES[exerciseType] || customExercise?.name || exerciseType;
        const isDuration = customExercise?.isDuration || isDurationBasedExercise(exerciseType);

        const newExercise: Exercise = {
          id: generateId(),
          type: exerciseType,
          name: exerciseName,
          sets: isDuration ? [] : [{ entries: [createEmptyEntry()], completed: false }],
          duration: isDuration ? 0 : undefined,
          durationMinutes: undefined,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === templateId
              ? { ...t, exercises: [...t.exercises, newExercise] }
              : t
          ),
        }));
      },

      removeExerciseFromTemplate: (templateId: string, exerciseId: string) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === templateId
              ? { ...t, exercises: t.exercises.filter((e) => e.id !== exerciseId) }
              : t
          ),
        }));
      },

      applyTemplate: (id: string) => {
        const { selectedDate, templates } = get();
        const template = templates.find((t) => t.id === id);

        if (!template) {
          return;
        }

        const copiedExercises: Exercise[] = template.exercises.map((exercise) => ({
          ...exercise,
          id: generateId(),
          createdAt: new Date().toISOString(),
          sets: exercise.sets.map((set) => ({
            ...set,
            completed: false,
          })),
        }));

        set((state) => {
          const existingWorkout = state.workouts.find((w) => w.date === selectedDate);

          if (existingWorkout) {
            return {
              workouts: state.workouts.map((w) =>
                w.date === selectedDate
                  ? { ...w, exercises: [...w.exercises, ...copiedExercises] }
                  : w
              ),
            };
          } else {
            return {
              workouts: [
                ...state.workouts,
                { date: selectedDate, exercises: copiedExercises, durationSeconds: 0 },
              ],
            };
          }
        });
      },

      hideBuiltinExercise: (type: string) => {
        set((state) => ({
          hiddenBuiltinExercises: [...state.hiddenBuiltinExercises, type],
        }));
      },

      showBuiltinExercise: (type: string) => {
        set((state) => ({
          hiddenBuiltinExercises: state.hiddenBuiltinExercises.filter((t) => t !== type),
        }));
      },
    }),
    {
      name: 'workout-storage',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        const { selectedDate, ...rest } = state;
        return rest;
      },
      migrate: (persistedState: any, version: number) => {
        if (version === 0 || !version) {
          // v0 → v1: セットの旧フォーマットを新フォーマットに移行
          if (persistedState && persistedState.workouts) {
            persistedState.workouts = migrateWorkouts(persistedState.workouts);
          }
        }
        if (persistedState) {
          if (!persistedState.selectedDate) {
            persistedState.selectedDate = getTodayDate();
          }
          persistedState.workoutTimerRunning = false;
          persistedState.workoutTimerStartedAt = null;
          persistedState.workoutTimerTargetDate = null;
        }
        return persistedState as WorkoutState;
      },
    }
  )
);
