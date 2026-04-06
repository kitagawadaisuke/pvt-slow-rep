import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Alert, Pressable } from 'react-native';
import { Text, Button, List, Portal, Dialog, RadioButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useWorkoutStore } from '@/stores/workoutStore';
import { darkTheme } from '@/constants/theme';
import { exportToJson, filterWorkoutsByDateRange } from '@/utils/export';
import { isDurationBasedExercise } from '@/types/workout';

// --- StatBlock component ---
const StatBlock = ({ value, label, compact }: { value: string; label: string; compact?: boolean }) => (
  <View style={[statStyles.block, compact && statStyles.blockCompact]}>
    <Text style={[statStyles.value, compact && statStyles.valueCompact]}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  block: {
    alignItems: 'center',
    minWidth: '45%',
  },
  blockCompact: {
    minWidth: '22%',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F0F0F5',
    letterSpacing: -0.5,
  },
  valueCompact: {
    fontSize: 22,
  },
  label: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default function SettingsScreen() {
  const { getAllWorkouts } = useWorkoutStore();
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [exportRange, setExportRange] = useState<'all' | 'week' | 'month' | 'day'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedExportDate, setSelectedExportDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const workouts = getAllWorkouts();

  const toLocalDateString = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDateRange = (range: 'all' | 'week' | 'month' | 'day') => {
    const today = new Date();
    const endDate = toLocalDateString(today);

    if (range === 'all') {
      return { start: '1970-01-01', end: endDate };
    }

    if (range === 'day') {
      return { start: selectedExportDate, end: selectedExportDate };
    }

    const startDate = new Date();
    if (range === 'week') {
      startDate.setDate(today.getDate() - 7);
    } else {
      startDate.setMonth(today.getMonth() - 1);
    }

    return {
      start: toLocalDateString(startDate),
      end: endDate,
    };
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { start, end } = getDateRange(exportRange);
      const filteredWorkouts = exportRange === 'all' && start === '1970-01-01'
        ? workouts
        : filterWorkoutsByDateRange(workouts, start, end);

      if (filteredWorkouts.length === 0) {
        Alert.alert('エクスポート', 'エクスポートするデータがありません');
        return;
      }

      const success = await exportToJson(filteredWorkouts);
      if (success) {
        setExportDialogVisible(false);
      } else {
        Alert.alert('エラー', 'エクスポートに失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', 'エクスポート中にエラーが発生しました');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDurationHM = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const calcStats = (targetWorkouts: typeof workouts) => {
    return {
      trainingDays: targetWorkouts.length,
      totalSets: targetWorkouts.reduce(
        (sum, w) => sum + w.exercises.reduce((s, e) => s + e.sets.length, 0),
        0
      ),
      totalDurationSeconds: targetWorkouts.reduce(
        (sum, w) => sum + (w.durationSeconds || 0),
        0
      ),
      totalExerciseDurationMinutes: targetWorkouts.reduce(
        (sum, w) => sum + w.exercises
          .filter((e) => isDurationBasedExercise(e.type))
          .reduce((s, e) => s + (e.durationMinutes || 0), 0),
        0
      ),
    };
  };

  const yearlyStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearWorkouts = workouts.filter((w) => w.date.startsWith(String(currentYear)));
    return calcStats(yearWorkouts);
  }, [workouts]);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthWorkouts = workouts.filter((w) => w.date.startsWith(currentMonth));
    return calcStats(monthWorkouts);
  }, [workouts]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* --- 今年の統計 --- */}
        <Text style={styles.sectionHeader}>今年の実績</Text>
        <View style={styles.card}>
          <View style={styles.statsRow}>
            <StatBlock value={String(yearlyStats.trainingDays)} label="日数" />
            <View style={styles.statDivider} />
            <StatBlock value={String(yearlyStats.totalSets)} label="セット" />
          </View>
          <View style={styles.statsRowSecondary}>
            <View style={styles.statChip}>
              <MaterialCommunityIcons name="dumbbell" size={14} color="#6366f1" />
              <Text style={styles.statChipText}>{formatDurationHM(yearlyStats.totalDurationSeconds)}</Text>
              <Text style={styles.statChipLabel}>筋トレ</Text>
            </View>
            <View style={styles.statChip}>
              <MaterialCommunityIcons name="run" size={14} color="#6366f1" />
              <Text style={styles.statChipText}>{formatDurationHM(yearlyStats.totalExerciseDurationMinutes * 60)}</Text>
              <Text style={styles.statChipLabel}>有酸素</Text>
            </View>
          </View>
        </View>

        {/* --- 今月の統計 --- */}
        <Text style={styles.sectionHeader}>今月の実績</Text>
        <View style={styles.card}>
          <View style={styles.statsRow}>
            <StatBlock value={String(monthlyStats.trainingDays)} label="日数" />
            <View style={styles.statDivider} />
            <StatBlock value={String(monthlyStats.totalSets)} label="セット" />
          </View>
          <View style={styles.statsRowSecondary}>
            <View style={styles.statChip}>
              <MaterialCommunityIcons name="dumbbell" size={14} color="#6366f1" />
              <Text style={styles.statChipText}>{formatDurationHM(monthlyStats.totalDurationSeconds)}</Text>
              <Text style={styles.statChipLabel}>筋トレ</Text>
            </View>
            <View style={styles.statChip}>
              <MaterialCommunityIcons name="run" size={14} color="#6366f1" />
              <Text style={styles.statChipText}>{formatDurationHM(monthlyStats.totalExerciseDurationMinutes * 60)}</Text>
              <Text style={styles.statChipLabel}>有酸素</Text>
            </View>
          </View>
        </View>

        {/* --- データ --- */}
        <Text style={styles.sectionHeader}>データ</Text>
        <View style={styles.card}>
          <Pressable style={styles.listRow} onPress={() => setExportDialogVisible(true)}>
            <View style={styles.listIconWrap}>
              <MaterialCommunityIcons name="export" size={18} color="#6366f1" />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={styles.listTitle}>JSONエクスポート</Text>
              <Text style={styles.listDesc}>AI分析用にデータを出力</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#4B5563" />
          </Pressable>
        </View>

        {/* --- アプリ情報 --- */}
        <Text style={styles.sectionHeader}>アプリ</Text>
        <View style={styles.card}>
          <View style={styles.listRow}>
            <View style={styles.listIconWrap}>
              <MaterialCommunityIcons name="information-outline" size={18} color="#6B7280" />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={styles.listTitle}>バージョン</Text>
              <Text style={styles.listDesc}>1.0.1</Text>
            </View>
          </View>
          <View style={styles.listSeparator} />
          <View style={styles.listRow}>
            <View style={styles.listIconWrap}>
              <MaterialCommunityIcons name="code-tags" size={18} color="#6B7280" />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={styles.listTitle}>開発</Text>
              <Text style={styles.listDesc}>Claude Code + Expo</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Portal>
        <Dialog
          visible={exportDialogVisible}
          onDismiss={() => setExportDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>データをエクスポート</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>エクスポート範囲を選択</Text>
            <RadioButton.Group
              value={exportRange}
              onValueChange={(value) => setExportRange(value as 'all' | 'week' | 'month' | 'day')}
            >
              <RadioButton.Item
                label="すべてのデータ"
                value="all"
                labelStyle={styles.radioLabel}
              />
              <RadioButton.Item
                label="過去1週間"
                value="week"
                labelStyle={styles.radioLabel}
              />
              <RadioButton.Item
                label="過去1ヶ月"
                value="month"
                labelStyle={styles.radioLabel}
              />
              <RadioButton.Item
                label="日付指定"
                value="day"
                labelStyle={styles.radioLabel}
              />
            </RadioButton.Group>
            {exportRange === 'day' && (
              <Calendar
                current={selectedExportDate}
                onDayPress={(day: { dateString: string }) => setSelectedExportDate(day.dateString)}
                markedDates={{
                  [selectedExportDate]: { selected: true, selectedColor: '#6366f1' },
                }}
                theme={{
                  backgroundColor: '#1C1C26',
                  calendarBackground: '#1C1C26',
                  textSectionTitleColor: '#6B7280',
                  dayTextColor: '#F0F0F5',
                  todayTextColor: '#6366f1',
                  monthTextColor: '#F0F0F5',
                  arrowColor: '#6366f1',
                  textDisabledColor: '#4B5563',
                }}
                style={styles.exportCalendar}
              />
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setExportDialogVisible(false)}>キャンセル</Button>
            <Button
              mode="contained"
              onPress={handleExport}
              loading={isExporting}
              disabled={isExporting}
            >
              エクスポート
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C12',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#1C1C26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A36',
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    paddingVertical: 8,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#2A2A36',
  },
  statsRowSecondary: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2A36',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252530',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  statChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F0F0F5',
  },
  statChipLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  listIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#252530',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTextWrap: {
    flex: 1,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F0F0F5',
  },
  listDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  listSeparator: {
    height: 1,
    backgroundColor: '#2A2A36',
    marginLeft: 44,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1C1C26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A36',
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  dialog: {
    backgroundColor: '#1C1C26',
  },
  dialogText: {
    color: '#6B7280',
    marginBottom: 8,
  },
  radioLabel: {
    color: '#F0F0F5',
  },
  exportCalendar: {
    borderRadius: 16,
    marginTop: 8,
  },
});
