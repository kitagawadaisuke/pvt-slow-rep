import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { Calendar, DateData } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWorkoutStore } from '@/stores/workoutStore';
import { darkTheme, calendarTheme, colors } from '@/constants/theme';
import { DailyWorkout, EXERCISE_NAMES, EXERCISE_ICONS } from '@/types/workout';

type MarkedDates = {
  [key: string]: {
    dots?: Array<{ key: string; color: string }>;
    selected?: boolean;
    selectedColor?: string;
  };
};

export default function HistoryScreen() {
  const { getAllWorkouts, getWorkoutByDate, customExercises, removeTimerRecord } = useWorkoutStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handleDeleteTimerRecord = (date: string, index: number, recordType: string) => {
    Alert.alert(
      'タイマー記録の削除',
      `この${recordType === 'interval' ? '休憩時間' : 'メトロノーム'}記録を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => removeTimerRecord(date, index) },
      ]
    );
  };

  const workouts = getAllWorkouts();

  const markedDates = useMemo(() => {
    const marks: MarkedDates = {};

    workouts.forEach((workout) => {
      const uniqueExercises = new Map<string, string>();

      workout.exercises.forEach((exercise) => {
        const customExercise = customExercises.find((e) => e.id === exercise.type);
        const color = customExercise?.color || colors[exercise.type as keyof typeof colors] || colors.strength;
        uniqueExercises.set(exercise.type, color);
      });

      const dots = Array.from(uniqueExercises.entries()).map(([type, color]) => ({
        key: type,
        color: color,
      }));

      marks[workout.date] = {
        dots,
      };
    });

    if (selectedDate) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: darkTheme.colors.primary,
      };
    }

    return marks;
  }, [workouts, selectedDate, customExercises]);

  const selectedWorkout = selectedDate ? getWorkoutByDate(selectedDate) : null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs > 0 ? ` ${secs}秒` : ''}`;
  };

  const getTotalReps = (workout: DailyWorkout, type: string) => {
    return workout.exercises
      .filter((e) => e.type === type)
      .reduce((sum, e) => sum + e.sets.reduce((s, set) => s + set.entries.reduce((es, entry) => es + entry.reps, 0), 0), 0);
  };

  const getTotalSets = (workout: DailyWorkout, type: string) => {
    return workout.exercises
      .filter((e) => e.type === type)
      .reduce((sum, e) => sum + e.sets.length, 0);
  };

  const getExerciseColor = (type: string) => {
    const customExercise = customExercises.find((e) => e.id === type);
    if (customExercise) return customExercise.color;
    return colors[type as keyof typeof colors] || colors.strength;
  };

  const getExerciseIcon = (type: string): string => {
    const customExercise = customExercises.find((e) => e.id === type);
    if (customExercise) return customExercise.icon;
    return EXERCISE_ICONS[type] || 'dumbbell';
  };

  return (
    <View style={styles.container}>
      <Calendar
        theme={calendarTheme}
        markedDates={markedDates}
        markingType="multi-dot"
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        enableSwipeMonths
        style={styles.calendar}
      />

      <ScrollView style={styles.detailsContainer}>
        {selectedDate && (
          <Text style={styles.selectedDateText}>
            {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </Text>
        )}

        {selectedWorkout ? (
          <>
            {selectedWorkout.exercises.map((exercise) => (
              <Card key={exercise.id} style={styles.exerciseCard}>
                <Card.Content>
                  <View style={styles.exerciseHeader}>
                    <MaterialCommunityIcons
                      name={getExerciseIcon(exercise.type) as any}
                      size={20}
                      color={getExerciseColor(exercise.type)}
                    />
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                  </View>

                  {exercise.type === 'cardio' ? (
                    <Text style={styles.statText}>
                      {formatDuration(exercise.duration || 0)}
                    </Text>
                  ) : (
                    <View style={styles.statsRow}>
                      <Chip style={styles.statChip} textStyle={styles.statChipText}>
                        {exercise.sets.length} セット
                      </Chip>
                      <Chip style={styles.statChip} textStyle={styles.statChipText}>
                        合計 {exercise.sets.reduce((sum, s) => sum + s.entries.reduce((es, entry) => es + entry.reps, 0), 0)} 回
                      </Chip>
                    </View>
                  )}

                  {exercise.type !== 'cardio' && exercise.sets.length > 0 && (
                    <View style={styles.setsDetail}>
                      {exercise.sets.map((set, index) => (
                        <View key={index} style={{ marginBottom: 4 }}>
                          <Text style={styles.setDetailText}>
                            {index + 1}セット {set.completed ? '完了' : ''}
                          </Text>
                          {set.entries.map((entry, ei) => (
                            <Text key={ei} style={[styles.setDetailText, { marginLeft: 12 }]}
                            >
                              {entry.reps}回{entry.weight ? ` ${entry.weight}kg` : ''}{entry.variation ? ` ${entry.variation}` : ''}{entry.tempo ? ` (${entry.tempo})` : ''}
                            </Text>
                          ))}
                        </View>
                      ))}
                    </View>
                  )}
                </Card.Content>
              </Card>
            ))}

            <Card style={styles.summaryCard}>
              <Card.Content>
                <Text style={styles.summaryTitle}>トレーニング内容</Text>
                {(selectedWorkout.durationSeconds ?? 0) > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>筋トレ時間</Text>
                    <Text style={styles.summaryValue}>
                      {formatDuration(selectedWorkout.durationSeconds!)}
                    </Text>
                  </View>
                )}
                {['pushup', 'squat', 'pullup'].map((type) => {
                  const totalReps = getTotalReps(selectedWorkout, type);
                  const totalSets = getTotalSets(selectedWorkout, type);
                  if (totalReps === 0) return null;
                  return (
                    <View key={type} style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        {EXERCISE_NAMES[type as keyof typeof EXERCISE_NAMES]}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {totalSets}セット / {totalReps}回
                      </Text>
                    </View>
                  );
                })}
                {customExercises.map((custom) => {
                  const totalReps = getTotalReps(selectedWorkout, custom.id);
                  const totalSets = getTotalSets(selectedWorkout, custom.id);
                  if (totalReps === 0 && totalSets === 0) return null;
                  return (
                    <View key={custom.id} style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{custom.name}</Text>
                      <Text style={styles.summaryValue}>
                        {totalSets}セット / {totalReps}回
                      </Text>
                    </View>
                  );
                })}
                {selectedWorkout.exercises
                  .filter((e) => e.type === 'cardio')
                  .map((e) => (
                    <View key={e.id} style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>有酸素運動</Text>
                      <Text style={styles.summaryValue}>
                        {formatDuration(e.duration || 0)}
                      </Text>
                    </View>
                  ))}
                {['bodypump', 'bodycombat', 'leapfight'].map((type) => {
                  const exercises = selectedWorkout.exercises.filter((e) => e.type === type);
                  if (exercises.length === 0) return null;
                  const totalMinutes = exercises.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
                  if (totalMinutes === 0) return null;
                  return (
                    <View key={type} style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        {EXERCISE_NAMES[type as keyof typeof EXERCISE_NAMES]}
                      </Text>
                      <Text style={styles.summaryValue}>{totalMinutes}分</Text>
                    </View>
                  );
                })}

                {selectedWorkout.timerRecords && selectedWorkout.timerRecords.length > 0 && (
                  <>
                    <Text style={[styles.summaryTitle, { marginTop: 12 }]}>タイマー記録</Text>
                    {selectedWorkout.timerRecords.map((record, index) => (
                      <Pressable
                        key={index}
                        onPress={() => handleDeleteTimerRecord(selectedDate, index, record.type)}
                        style={styles.summaryRow}
                      >
                        <Text style={styles.summaryLabel}>
                          {record.type === 'interval' ? '休憩時間' : 'メトロノーム'}
                        </Text>
                        <Text style={styles.summaryValue}>
                          {record.type === 'interval'
                            ? formatDuration(record.intervalSeconds || 0)
                            : `${record.metronomeBpm} BPM (${record.metronomeBeats}拍子)`}
                        </Text>
                      </Pressable>
                    ))}
                  </>
                )}
              </Card.Content>
            </Card>
          </>
        ) : selectedDate ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons
                name="calendar-blank"
                size={48}
                color={darkTheme.colors.onSurfaceVariant}
              />
              <Text style={styles.emptyText}>この日の記録はありません</Text>
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons
                name="gesture-tap"
                size={48}
                color={darkTheme.colors.onSurfaceVariant}
              />
              <Text style={styles.emptyText}>日付をタップして詳細を表示</Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.outline,
  },
  detailsContainer: {
    flex: 1,
    padding: 16,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: darkTheme.colors.surface,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    backgroundColor: darkTheme.colors.surfaceVariant,
  },
  statChipText: {
    color: darkTheme.colors.onSurface,
  },
  statText: {
    fontSize: 18,
    color: darkTheme.colors.primary,
    fontWeight: '600',
  },
  setsDetail: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.outline,
  },
  setDetailText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  summaryCard: {
    backgroundColor: darkTheme.colors.surfaceVariant,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    color: darkTheme.colors.onSurfaceVariant,
  },
  summaryValue: {
    color: darkTheme.colors.onSurface,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: darkTheme.colors.surface,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    color: darkTheme.colors.onSurfaceVariant,
    fontSize: 16,
  },
});

