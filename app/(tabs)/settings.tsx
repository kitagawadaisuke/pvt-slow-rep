import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, List, Divider, Portal, Dialog, RadioButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useWorkoutStore } from '@/stores/workoutStore';
import { darkTheme } from '@/constants/theme';
import { exportToJson, filterWorkoutsByDateRange } from '@/utils/export';
import { isDurationBasedExercise } from '@/types/workout';

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
    if (hours > 0) return `${hours}時間${mins}分`;
    return `${mins}分`;
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
      <ScrollView style={styles.scrollView}>
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>今年の累計（{new Date().getFullYear()}年）</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{yearlyStats.trainingDays}</Text>
                <Text style={styles.statLabel}>トレーニング日数</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{yearlyStats.totalSets}</Text>
                <Text style={styles.statLabel}>総セット数</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDurationHM(yearlyStats.totalDurationSeconds)}</Text>
                <Text style={styles.statLabel}>筋トレ時間</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDurationHM(yearlyStats.totalExerciseDurationMinutes * 60)}</Text>
                <Text style={styles.statLabel}>有酸素・スタジオ</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 16 }]}>今月の累計</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{monthlyStats.trainingDays}</Text>
                <Text style={styles.statLabel}>トレーニング日数</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{monthlyStats.totalSets}</Text>
                <Text style={styles.statLabel}>総セット数</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDurationHM(monthlyStats.totalDurationSeconds)}</Text>
                <Text style={styles.statLabel}>筋トレ時間</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDurationHM(monthlyStats.totalExerciseDurationMinutes * 60)}</Text>
                <Text style={styles.statLabel}>有酸素・スタジオ</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>データ管理</Text>
          </Card.Content>
          <List.Item
            title="JSONエクスポート"
            description="AI分析用にデータをエクスポート"
            left={(props) => (
              <List.Icon {...props} icon="export" color={darkTheme.colors.primary} />
            )}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setExportDialogVisible(true)}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDescription}
          />
          <Divider style={styles.divider} />
          <List.Item
            title="エクスポート形式"
            description="JSON (AI分析に最適化)"
            left={(props) => (
              <List.Icon {...props} icon="code-json" color={darkTheme.colors.secondary} />
            )}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDescription}
          />
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>アプリ情報</Text>
          </Card.Content>
          <List.Item
            title="バージョン"
            description="1.0.0"
            left={(props) => (
              <List.Icon {...props} icon="information-outline" color={darkTheme.colors.onSurfaceVariant} />
            )}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDescription}
          />
          <Divider style={styles.divider} />
          <List.Item
            title="開発"
            description="Claude Code + Expo"
            left={(props) => (
              <List.Icon {...props} icon="code-tags" color={darkTheme.colors.onSurfaceVariant} />
            )}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDescription}
          />
        </Card>

        <Card style={styles.tipCard}>
          <Card.Content style={styles.tipContent}>
            <MaterialCommunityIcons
              name="lightbulb-outline"
              size={24}
              color={darkTheme.colors.secondary}
            />
            <View style={styles.tipTextContainer}>
              <Text style={styles.tipTitle}>AI分析のヒント</Text>
              <Text style={styles.tipText}>
                エクスポートしたJSONファイルをClaude等のAIに読み込ませることで、
                トレーニングの傾向分析やアドバイスを受けることができます。
              </Text>
            </View>
          </Card.Content>
        </Card>
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
                  [selectedExportDate]: { selected: true, selectedColor: darkTheme.colors.primary },
                }}
                theme={{
                  backgroundColor: darkTheme.colors.surface,
                  calendarBackground: darkTheme.colors.surface,
                  textSectionTitleColor: darkTheme.colors.onSurfaceVariant,
                  dayTextColor: darkTheme.colors.onSurface,
                  todayTextColor: darkTheme.colors.primary,
                  monthTextColor: darkTheme.colors.onSurface,
                  arrowColor: darkTheme.colors.primary,
                  textDisabledColor: '#555',
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
    backgroundColor: darkTheme.colors.background,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  statsCard: {
    backgroundColor: darkTheme.colors.surfaceVariant,
    marginBottom: 16,
  },
  card: {
    backgroundColor: darkTheme.colors.surface,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    rowGap: 20,
    columnGap: 24,
  },
  statItem: {
    alignItems: 'center',
    minWidth: '40%',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '600',
    color: darkTheme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: darkTheme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  listTitle: {
    color: darkTheme.colors.onSurface,
  },
  listDescription: {
    color: darkTheme.colors.onSurfaceVariant,
  },
  divider: {
    backgroundColor: darkTheme.colors.outline,
  },
  tipCard: {
    backgroundColor: darkTheme.colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: darkTheme.colors.secondary,
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipTextContainer: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.colors.onSurface,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: darkTheme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  dialog: {
    backgroundColor: darkTheme.colors.surface,
  },
  dialogText: {
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  radioLabel: {
    color: darkTheme.colors.onSurface,
  },
  exportCalendar: {
    borderRadius: 8,
    marginTop: 8,
  },
});
