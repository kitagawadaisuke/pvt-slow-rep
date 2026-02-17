export type BuiltinExerciseType = 'pushup' | 'squat' | 'pullup' | 'cardio' | 'bodypump' | 'bodycombat' | 'leapfight';
export type ExerciseType = BuiltinExerciseType | string;

export interface SetEntry {
  reps: number;
  weight?: number; // 重量（kg）
  variation?: string; // バリエーション名（例: ナロー, ワイド, ブルガリアン右など）
  tempo?: string; // テンポ表記（例: "2-1-2"）
  assistance?: boolean; // 懸垂の補助あり/なし
}

export interface MetronomeSettings {
  enabled: boolean;
  bpm: number;
  beatsPerBar: number;
}

export interface WorkoutSet {
  entries: SetEntry[];
  completed: boolean;
  variation?: string;
  tempo?: string;
  assistance?: boolean;
  durationMinutes?: number;
  metronome?: boolean | MetronomeSettings; // このセットでメトロノームを使うか
}

export interface Exercise {
  id: string;
  type: ExerciseType;
  name: string;
  sets: WorkoutSet[];
  duration?: number; // seconds (for cardio)
  durationMinutes?: number; // 分（有酸素やBODYPUMP用、30/45/60など）
  createdAt: string;
}

export interface TimerRecord {
  type: 'interval' | 'metronome';
  timestamp: string;
  intervalSeconds?: number;
  metronomeBpm?: number;
  metronomeBeats?: 4 | 8;
}

export interface DailyWorkout {
  date: string; // YYYY-MM-DD
  exercises: Exercise[];
  durationSeconds?: number;
  timerRecords?: TimerRecord[];
}

// カスタム種目の定義
export interface CustomExerciseType {
  id: string; // ユニークID
  name: string;
  icon: string; // MaterialCommunityIcons名
  color: string; // HEXカラー
  hasWeight: boolean; // 重量入力を使うか
  isDuration: boolean; // 時間ベースか
}

export type FeedbackMode = 'vibration' | 'sound' | 'both';

export interface TimerSettings {
  intervalSeconds: number;
  metronomeBpm: number;
  metronomeBeats: 4 | 8;
  feedbackMode: FeedbackMode;
}

// ワークアウトテンプレート（種目構成を保存）
export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: Exercise[]; // セット構成を含む種目リスト
  createdAt: string;
}

export const BUILTIN_EXERCISE_NAMES: Record<BuiltinExerciseType, string> = {
  pushup: '腕立て伏せ',
  squat: 'スクワット',
  pullup: '懸垂',
  cardio: '有酸素運動',
  bodypump: 'BODYPUMP',
  bodycombat: 'BODYCOMBAT',
  leapfight: 'LEAP FIGHT',
};

// 後方互換のためにエイリアスを残す
export const EXERCISE_NAMES = BUILTIN_EXERCISE_NAMES as Record<string, string>;

export const BUILTIN_EXERCISE_ICONS: Record<BuiltinExerciseType, string> = {
  pushup: 'arm-flex',
  squat: 'human',
  pullup: 'human-handsup',
  cardio: 'run',
  bodypump: 'dumbbell',
  bodycombat: 'boxing-glove',
  leapfight: 'karate',
};

export const EXERCISE_ICONS = BUILTIN_EXERCISE_ICONS as Record<string, string>;

// 時間ベースの種目かどうか
export const isDurationBasedExercise = (type: ExerciseType): boolean => {
  return ['cardio', 'bodypump', 'bodycombat', 'leapfight'].includes(type);
};

// プリセット時間オプション（分）
export const DURATION_PRESETS = [30, 45, 60];

// アイコン候補リスト
export const AVAILABLE_ICONS = [
  'dumbbell', 'arm-flex', 'human', 'human-handsup', 'run', 'boxing-glove',
  'karate', 'weight-lifter', 'yoga', 'bike', 'swim', 'walk',
  'jump-rope', 'bench', 'kettlebell', 'rowing', 'meditation',
  'heart-pulse', 'fire', 'lightning-bolt', 'target', 'trophy',
];

// カラー候補リスト
export const AVAILABLE_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#f472b6', '#a855f7',
  '#ef4444', '#14b8a6', '#6366f1', '#ec4899', '#06b6d4',
  '#f97316', '#84cc16', '#8b5cf6', '#e11d48', '#0ea5e9',
];

