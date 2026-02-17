import { File, Paths } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import { DailyWorkout } from '@/types/workout';

export interface ExportData {
  exportedAt: string;
  version: string;
  workouts: DailyWorkout[];
  summary: {
    totalDays: number;
    totalExercises: number;
    exerciseBreakdown: Record<string, number>;
  };
}

export const generateExportData = (workouts: DailyWorkout[]): ExportData => {
  const exerciseBreakdown: Record<string, number> = {};

  let totalExercises = 0;

  workouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      totalExercises++;
      exerciseBreakdown[exercise.type] = (exerciseBreakdown[exercise.type] || 0) + 1;
    });
  });

  return {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    workouts,
    summary: {
      totalDays: workouts.length,
      totalExercises,
      exerciseBreakdown,
    },
  };
};

export const exportToJson = async (workouts: DailyWorkout[]): Promise<boolean> => {
  try {
    const exportData = generateExportData(workouts);
    const jsonString = JSON.stringify(exportData, null, 2);
    const fileName = `workout-data-${new Date().toISOString().split('T')[0]}.json`;
    const file = new File(Paths.cache, fileName);

    await file.write(jsonString);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'トレーニングデータをエクスポート',
      });
    }

    return true;
  } catch (error) {
    console.error('Export failed:', error);
    return false;
  }
};

export const filterWorkoutsByDateRange = (
  workouts: DailyWorkout[],
  startDate: string,
  endDate: string
): DailyWorkout[] => {
  return workouts.filter((w) => w.date >= startDate && w.date <= endDate);
};
