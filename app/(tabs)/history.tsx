import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { Calendar, DateData } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWorkoutStore } from '@/stores/workoutStore';
import { darkTheme, calendarTheme, colors } from '@/constants/theme';
import { EXERCISE_ICONS } from '@/types/workout';

type MarkedDates = {
  [key: string]: {
    dots?: Array<{ key: string; color: string }>;
    selected?: boolean;
    selectedColor?: string;
  };
};

export default function HistoryScreen() {
  const { getAllWorkouts, getWorkoutByDate, customExercises, removeTimerRecord, removeWorkoutDuration } = useWorkoutStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handleDeleteWorkoutDuration = (date: string) => {
    Alert.alert(
      '筋トレ時間の削除',
      'この筋トレ時間の記録を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => removeWorkoutDuration(date) },
      ]
    );
  };

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
        selectedColor: '#334155',
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

      <ScrollView style={styles.detailsContainer} contentContainerStyle={styles.detailsContent}>
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
            <Card style={styles.summaryCard}>
              <Card.Content>
                <Text style={styles.summaryTitle}>トレーニング内容</Text>

                {selectedWorkout.exercises.map((exercise) => (
                  <View key={exercise.id} style={styles.exerciseBlock}>
                    {/* 種目ヘッダー（名前＋サマリー） */}
                    <View style={styles.exerciseHeaderRow}>
                      <View style={styles.exerciseHeaderLeft}>
                        <MaterialCommunityIcons
                          name={getExerciseIcon(exercise.type) as any}
                          size={16}
                          color={getExerciseColor(exercise.type)}
                        />
                        <Text style={[styles.summaryLabel, { fontWeight: '600', color: darkTheme.colors.onSurface }]}>
                          {exercise.name}
                        </Text>
                      </View>
                      <Text style={styles.summaryValue}>
                        {exercise.durationMinutes
                          ? `${exercise.durationMinutes}分`
                          : exercise.duration
                          ? formatDuration(exercise.duration)
                          : `${exercise.sets.length}セット / ${exercise.sets.reduce((sum, s) => sum + s.entries.reduce((es, e) => es + e.reps, 0), 0)}回`}
                      </Text>
                    </View>

                    {/* セット詳細 */}
                    {exercise.sets.length > 0 && !exercise.durationMinutes && !exercise.duration && (
                      <View style={styles.setsDetail}>
                        {exercise.sets.map((set, index) => (
                          <View key={index} style={styles.setDetailRow}>
                            <Text style={styles.setDetailLabel}>
                              {index + 1}セット目
                            </Text>
                            <Text style={styles.setDetailText}>
                              {set.entries.map((entry) =>
                                `${entry.reps}回${entry.weight ? ` ${entry.weight}kg` : ''}${entry.variation ? ` ${entry.variation}` : ''}${entry.tempo ? ` (${entry.tempo})` : ''}`
                              ).join(' / ')}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}

                {((selectedWorkout.durationSeconds ?? 0) > 0 || (selectedWorkout.timerRecords && selectedWorkout.timerRecords.length > 0)) && (
                  <>
                    <Text style={[styles.summaryTitle, { marginTop: 16 }]}>タイマー記録</Text>
                    {(selectedWorkout.durationSeconds ?? 0) > 0 && (
                      <Pressable
                        onPress={() => handleDeleteWorkoutDuration(selectedDate!)}
                        style={styles.summaryRow}
                      >
                        <Text style={styles.summaryLabel}>筋トレ時間</Text>
                        <Text style={styles.summaryValue}>
                          {formatDuration(selectedWorkout.durationSeconds!)}
                        </Text>
                      </Pressable>
                    )}
                    {selectedWorkout.timerRecords?.map((record, index) => (
                      <Pressable
                        key={index}
                        onPress={() => handleDeleteTimerRecord(selectedDate!, index, record.type)}
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
  },
  detailsContent: {
    padding: 16,
    paddingBottom: 120,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginBottom: 16,
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
  exerciseBlock: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.outline,
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  exerciseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setsDetail: {
    marginTop: 8,
    paddingLeft: 22,
  },
  setDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  setDetailLabel: {
    fontSize: 13,
    color: darkTheme.colors.onSurfaceVariant,
    marginRight: 8,
  },
  setDetailText: {
    fontSize: 13,
    color: darkTheme.colors.onSurfaceVariant,
    flexShrink: 1,
    textAlign: 'right',
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
