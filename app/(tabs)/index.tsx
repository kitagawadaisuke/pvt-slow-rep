import React, { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react';
import { View, ScrollView, StyleSheet, TextInput as RNTextInput, Alert, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Swipeable } from 'react-native-gesture-handler';
import { Text, Card, Button, IconButton, TextInput, Portal, Dialog } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useShallow } from 'zustand/react/shallow';
import { darkTheme, colors, calendarTheme } from '@/constants/theme';
import { ExerciseType, BuiltinExerciseType, Exercise, EXERCISE_ICONS, isDurationBasedExercise, DURATION_PRESETS, BUILTIN_EXERCISE_NAMES } from '@/types/workout';

const EMPTY_EXERCISES: Exercise[] = [];

// --- Helper functions (hoisted, stable references) ---

const getExerciseColor = (type: ExerciseType, customExercises: { id: string; color: string }[]): string => {
  const custom = customExercises.find((e) => e.id === type);
  if (custom) return custom.color;
  return (colors as Record<string, string>)[type] || colors.strength;
};

const getExerciseIcon = (type: ExerciseType, customExercises: { id: string; icon: string }[]): string => {
  const custom = customExercises.find((e) => e.id === type);
  if (custom) return custom.icon;
  return (EXERCISE_ICONS as Record<string, string>)[type] || 'dumbbell';
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// --- IME対応TextInputコンポーネント ---
interface IMESafeTextInputProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  style?: any;
  outlineColor?: string;
  activeOutlineColor?: string;
}

const IMESafeTextInput = memo<IMESafeTextInputProps>(({
  label,
  value,
  onSave,
  placeholder,
  style,
  outlineColor,
  activeOutlineColor,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleEndEditing = useCallback(() => {
    const trimmedValue = localValue.trim();
    if (trimmedValue !== value) {
      onSave(trimmedValue);
    }
  }, [localValue, value, onSave]);

  const handleFocus = useCallback(() => { isFocusedRef.current = true; }, []);
  const handleBlur = useCallback(() => { isFocusedRef.current = false; }, []);

  return (
    <TextInput
      mode="outlined"
      label={label}
      value={localValue}
      onChangeText={setLocalValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onEndEditing={handleEndEditing}
      placeholder={placeholder}
      style={style}
      outlineColor={outlineColor}
      activeOutlineColor={activeOutlineColor}
      dense
    />
  );
});

// --- SetEntryRow コンポーネント ---
interface SetEntryRowProps {
  exerciseId: string;
  exerciseType: ExerciseType;
  setIndex: number;
  entryIndex: number;
  reps: number;
  weight?: number;
  variation?: string;
  tempo?: string;
  showEntryHeader: boolean;
  exerciseColor: string;
}

const SetEntryRow = memo<SetEntryRowProps>(({
  exerciseId,
  exerciseType,
  setIndex,
  entryIndex,
  reps,
  weight,
  variation,
  tempo,
  showEntryHeader,
  exerciseColor,
}) => {
  const updateEntryReps = useWorkoutStore((s) => s.updateEntryReps);
  const updateEntryWeight = useWorkoutStore((s) => s.updateEntryWeight);
  const updateEntryVariation = useWorkoutStore((s) => s.updateEntryVariation);
  const updateEntryTempo = useWorkoutStore((s) => s.updateEntryTempo);
  const removeSetEntry = useWorkoutStore((s) => s.removeSetEntry);

  const [isOpen, setIsOpen] = useState(false);
  const toggleDetail = useCallback(() => setIsOpen((prev) => !prev), []);

  const handleRepsChange = useCallback((text: string) => {
    updateEntryReps(exerciseId, setIndex, entryIndex, parseInt(text, 10) || 0);
  }, [exerciseId, setIndex, entryIndex, updateEntryReps]);

  const handleWeightChange = useCallback((text: string) => {
    const w = parseFloat(text);
    updateEntryWeight(exerciseId, setIndex, entryIndex, Number.isFinite(w) ? w : 0);
  }, [exerciseId, setIndex, entryIndex, updateEntryWeight]);

  const handleVariationSave = useCallback((text: string) => {
    updateEntryVariation(exerciseId, setIndex, entryIndex, text);
  }, [exerciseId, setIndex, entryIndex, updateEntryVariation]);

  const handleTempoSave = useCallback((text: string) => {
    updateEntryTempo(exerciseId, setIndex, entryIndex, text);
  }, [exerciseId, setIndex, entryIndex, updateEntryTempo]);

  const handleRemoveEntry = useCallback(() => {
    removeSetEntry(exerciseId, setIndex, entryIndex);
  }, [exerciseId, setIndex, entryIndex, removeSetEntry]);

  return (
    <View style={styles.entryContainer}>
      {showEntryHeader ? (
        <View style={styles.entryHeader}>
          <Text style={styles.entryLabel}>種目 {entryIndex + 1}</Text>
          <IconButton
            icon="close-circle-outline"
            iconColor={darkTheme.colors.onSurfaceVariant}
            size={16}
            onPress={handleRemoveEntry}
          />
        </View>
      ) : null}

      <View style={styles.compactRow}>
        <TextInput
          mode="outlined"
          label="回数"
          value={reps > 0 ? reps.toString() : ''}
          onChangeText={handleRepsChange}
          placeholder="0"
          keyboardType="number-pad"
          style={styles.compactInput}
          outlineColor={darkTheme.colors.outline}
          activeOutlineColor={exerciseColor}
          dense
        />
        <TextInput
          mode="outlined"
          label="重量"
          value={weight ? weight.toString() : ''}
          onChangeText={handleWeightChange}
          placeholder="kg"
          keyboardType="decimal-pad"
          style={styles.compactInput}
          outlineColor={darkTheme.colors.outline}
          activeOutlineColor={exerciseColor}
          dense
        />
      </View>

      <Button
        mode="text"
        onPress={toggleDetail}
        compact
        textColor={darkTheme.colors.onSurfaceVariant}
        style={styles.detailToggle}
        icon={isOpen ? 'chevron-up' : 'chevron-down'}
      >
        詳細
      </Button>

      {isOpen ? (
        <View style={styles.detailBlock}>
          <View style={styles.setRow}>
            <IMESafeTextInput
              label="バリエーション"
              value={variation || ''}
              onSave={handleVariationSave}
              placeholder="例: ナロー"
              style={styles.variationInput}
              outlineColor={darkTheme.colors.outline}
              activeOutlineColor={exerciseColor}
            />
          </View>
          <View style={styles.setRow}>
            <IMESafeTextInput
              label="テンポ"
              value={tempo || ''}
              onSave={handleTempoSave}
              placeholder="例: 2-1-2"
              style={styles.tempoInput}
              outlineColor={darkTheme.colors.outline}
              activeOutlineColor={exerciseColor}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
});

// --- ExerciseCard コンポーネント ---
interface ExerciseCardProps {
  exercise: Exercise;
  exerciseColor: string;
  exerciseIcon: string;
}

const ExerciseCard = memo<ExerciseCardProps>(({ exercise, exerciseColor, exerciseIcon }) => {
  const removeExercise = useWorkoutStore((s) => s.removeExercise);
  const addSet = useWorkoutStore((s) => s.addSet);
  const removeSet = useWorkoutStore((s) => s.removeSet);
  const copySet = useWorkoutStore((s) => s.copySet);
  const addSetEntry = useWorkoutStore((s) => s.addSetEntry);
  const updateDurationMinutes = useWorkoutStore((s) => s.updateDurationMinutes);

  const handleRemove = useCallback(() => removeExercise(exercise.id), [exercise.id, removeExercise]);
  const handleAddSet = useCallback(() => addSet(exercise.id), [exercise.id, addSet]);

  const cardStyle = useMemo(
    () => [styles.exerciseCard, { borderLeftColor: exerciseColor }],
    [exerciseColor]
  );

  const renderLeft = useCallback(
    () => <MaterialCommunityIcons name={exerciseIcon as any} size={24} color={exerciseColor} />,
    [exerciseIcon, exerciseColor]
  );

  const renderRight = useCallback(
    () => <IconButton icon="delete-outline" iconColor={darkTheme.colors.error} onPress={handleRemove} />,
    [handleRemove]
  );

  return (
    <Card style={cardStyle}>
      <Card.Title
        title={exercise.name}
        titleStyle={styles.exerciseTitle}
        left={renderLeft}
        right={renderRight}
      />
      <Card.Content>
        {isDurationBasedExercise(exercise.type) ? (
          <View style={styles.durationContainer}>
            <View style={styles.durationButtons}>
              {DURATION_PRESETS.map((mins) => (
                <Button
                  key={mins}
                  mode={exercise.durationMinutes === mins ? 'contained' : 'outlined'}
                  onPress={() => updateDurationMinutes(exercise.id, mins)}
                  style={styles.durationChip}
                  buttonColor={exercise.durationMinutes === mins ? exerciseColor : undefined}
                  compact
                >
                  {mins}分
                </Button>
              ))}
            </View>
          </View>
        ) : (
          <>
            {exercise.sets.map((set, setIndex) => (
              <View key={setIndex} style={styles.setContainer}>
                <View style={styles.setHeader}>
                  <Text style={styles.setLabel}>セット {setIndex + 1}</Text>
                  <View style={styles.setActions}>
                    <IconButton
                      icon="content-copy"
                      iconColor={darkTheme.colors.onSurfaceVariant}
                      size={18}
                      onPress={() => copySet(exercise.id, setIndex)}
                    />
                    <IconButton
                      icon="close"
                      iconColor={darkTheme.colors.error}
                      size={18}
                      onPress={() => removeSet(exercise.id, setIndex)}
                    />
                  </View>
                </View>

                {set.entries.map((entry, entryIndex) => (
                  <SetEntryRow
                    key={entryIndex}
                    exerciseId={exercise.id}
                    exerciseType={exercise.type}
                    setIndex={setIndex}
                    entryIndex={entryIndex}
                    reps={entry.reps}
                    weight={entry.weight}
                    variation={entry.variation}
                    tempo={entry.tempo}
                    showEntryHeader={set.entries.length > 1}
                    exerciseColor={exerciseColor}
                  />
                ))}

                <Button
                  mode="text"
                  icon="plus"
                  onPress={() => addSetEntry(exercise.id, setIndex)}
                  textColor={darkTheme.colors.onSurfaceVariant}
                  compact
                  style={styles.addEntryButton}
                >
                  セット内追加
                </Button>
              </View>
            ))}
            <Button
              mode="text"
              icon="plus"
              onPress={handleAddSet}
              textColor={darkTheme.colors.primary}
            >
              セット追加
            </Button>
          </>
        )}
      </Card.Content>
    </Card>
  );
});

// --- ExerciseSelectDialog コンポーネント ---
interface ExerciseSelectDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onOpenCustomDialog: () => void;
}

const ExerciseSelectDialog = memo<ExerciseSelectDialogProps>(({ visible, onDismiss, onOpenCustomDialog }) => {
  const addExercise = useWorkoutStore((s) => s.addExercise);
  const customExercises = useWorkoutStore((s) => s.customExercises);
  const hiddenBuiltinExercises = useWorkoutStore((s) => s.hiddenBuiltinExercises);
  const hideBuiltinExercise = useWorkoutStore((s) => s.hideBuiltinExercise);
  const showBuiltinExercise = useWorkoutStore((s) => s.showBuiltinExercise);
  const removeCustomExercise = useWorkoutStore((s) => s.removeCustomExercise);

  const allBuiltinExerciseTypes: BuiltinExerciseType[] = ['pushup', 'squat', 'pullup', 'bodypump', 'bodycombat', 'leapfight'];
  const exerciseTypes = useMemo(
    () => allBuiltinExerciseTypes.filter((t) => !hiddenBuiltinExercises.includes(t)),
    [hiddenBuiltinExercises]
  );

  const handleAddExercise = useCallback((type: ExerciseType) => {
    addExercise(type);
    onDismiss();
  }, [addExercise, onDismiss]);

  const handleOpenCustom = useCallback(() => {
    onDismiss();
    onOpenCustomDialog();
  }, [onDismiss, onOpenCustomDialog]);

  return (
    <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
      <Dialog.Title>種目を選択</Dialog.Title>
      <Dialog.Content>
        <ScrollView style={styles.exerciseList}>
          {exerciseTypes.map((type) => {
            const color = getExerciseColor(type, customExercises);
            const icon = getExerciseIcon(type, customExercises);
            return (
              <Swipeable
                key={type}
                renderRightActions={() => (
                  <Pressable style={styles.swipeDeleteAction} onPress={() => hideBuiltinExercise(type)}>
                    <MaterialCommunityIcons name="delete-outline" size={22} color="white" />
                  </Pressable>
                )}
                overshootRight={false}
              >
                <Button
                  mode="outlined"
                  onPress={() => handleAddExercise(type)}
                  style={[styles.exerciseButton, { borderColor: color }]}
                  labelStyle={{ color }}
                  icon={() => <MaterialCommunityIcons name={icon as any} size={20} color={color} />}
                  contentStyle={styles.exerciseButtonContent}
                >
                  {BUILTIN_EXERCISE_NAMES[type]}
                </Button>
              </Swipeable>
            );
          })}
          {customExercises.map((custom) => (
            <Swipeable
              key={custom.id}
              renderRightActions={() => (
                <Pressable
                  style={styles.swipeDeleteAction}
                  onPress={() => {
                    Alert.alert(
                      'カスタム種目の削除',
                      `「${custom.name}」を削除しますか？`,
                      [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: '削除', style: 'destructive', onPress: () => removeCustomExercise(custom.id) },
                      ]
                    );
                  }}
                >
                  <MaterialCommunityIcons name="delete-outline" size={22} color="white" />
                </Pressable>
              )}
              overshootRight={false}
            >
              <Button
                mode="outlined"
                onPress={() => handleAddExercise(custom.id)}
                style={[styles.exerciseButton, { borderColor: custom.color }]}
                labelStyle={{ color: custom.color }}
                icon={() => <MaterialCommunityIcons name={custom.icon as any} size={20} color={custom.color} />}
                contentStyle={styles.exerciseButtonContent}
              >
                {custom.name}
              </Button>
            </Swipeable>
          ))}
          {hiddenBuiltinExercises.length > 0 ? (
            <View style={styles.hiddenExercisesSection}>
              <Text style={styles.hiddenExercisesLabel}>非表示の種目</Text>
              {hiddenBuiltinExercises.map((type) => (
                <Button
                  key={type}
                  mode="outlined"
                  onPress={() => showBuiltinExercise(type)}
                  style={styles.hiddenExerciseButton}
                  icon="eye-outline"
                >
                  {BUILTIN_EXERCISE_NAMES[type as keyof typeof BUILTIN_EXERCISE_NAMES] || type}
                </Button>
              ))}
            </View>
          ) : null}
          <Button
            mode="contained"
            onPress={handleOpenCustom}
            style={styles.addCustomButton}
            icon="plus"
          >
            カスタム種目を追加
          </Button>
        </ScrollView>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>キャンセル</Button>
      </Dialog.Actions>
    </Dialog>
  );
});

// --- CustomExerciseDialog コンポーネント ---
interface CustomExerciseDialogProps {
  visible: boolean;
  onDismiss: () => void;
}

const ICON_OPTIONS = ['dumbbell', 'arm-flex', 'human', 'human-handsup', 'run', 'boxing-glove', 'karate', 'weight-lifter', 'yoga', 'bike'];
const COLOR_OPTIONS = ['#3b82f6', '#22c55e', '#f59e0b', '#f472b6', '#a855f7', '#ef4444', '#14b8a6', '#6366f1', '#ec4899', '#06b6d4'];

const CustomExerciseDialog = memo<CustomExerciseDialogProps>(({ visible, onDismiss }) => {
  const addCustomExercise = useWorkoutStore((s) => s.addCustomExercise);
  const [customExerciseIcon, setCustomExerciseIcon] = useState('dumbbell');
  const [customExerciseColor, setCustomExerciseColor] = useState('#3b82f6');
  const [customExerciseNameEmpty, setCustomExerciseNameEmpty] = useState(true);
  const customExerciseNameRef = useRef('');

  const handleAdd = useCallback(() => {
    const name = customExerciseNameRef.current.trim();
    if (!name) return;
    addCustomExercise({
      name,
      icon: customExerciseIcon,
      color: customExerciseColor,
      hasWeight: true,
      isDuration: false,
    });
    customExerciseNameRef.current = '';
    setCustomExerciseNameEmpty(true);
    setCustomExerciseIcon('dumbbell');
    setCustomExerciseColor('#3b82f6');
    onDismiss();
  }, [customExerciseIcon, customExerciseColor, addCustomExercise, onDismiss]);

  const handleNameChange = useCallback((text: string) => {
    customExerciseNameRef.current = text;
    const isEmpty = !text.trim();
    setCustomExerciseNameEmpty((prev) => (prev !== isEmpty ? isEmpty : prev));
  }, []);

  return (
    <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
      <Dialog.Title>カスタム種目を追加</Dialog.Title>
      <Dialog.Content>
        <Text style={styles.customExerciseLabel}>種目名</Text>
        <RNTextInput
          defaultValue=""
          onChangeText={handleNameChange}
          placeholder="例: ベンチプレス"
          placeholderTextColor={darkTheme.colors.onSurfaceVariant}
          style={styles.customExerciseNativeInput}
          autoFocus={true}
          returnKeyType="done"
          blurOnSubmit={true}
        />
        <Text style={styles.customExerciseLabel}>アイコン</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
          {ICON_OPTIONS.map((icon) => (
            <IconButton
              key={icon}
              icon={icon}
              iconColor={customExerciseIcon === icon ? darkTheme.colors.primary : darkTheme.colors.onSurfaceVariant}
              containerColor={customExerciseIcon === icon ? darkTheme.colors.primaryContainer : 'transparent'}
              onPress={() => setCustomExerciseIcon(icon)}
              size={24}
            />
          ))}
        </ScrollView>
        <Text style={styles.customExerciseLabel}>カラー</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
          {COLOR_OPTIONS.map((color) => (
            <IconButton
              key={color}
              icon={customExerciseColor === color ? 'check' : 'circle'}
              iconColor={color}
              containerColor={customExerciseColor === color ? `${color}20` : 'transparent'}
              onPress={() => setCustomExerciseColor(color)}
              size={24}
            />
          ))}
        </ScrollView>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>キャンセル</Button>
        <Button onPress={handleAdd} disabled={customExerciseNameEmpty}>追加</Button>
      </Dialog.Actions>
    </Dialog>
  );
});

// --- TemplateDialog コンポーネント ---
interface TemplateDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onStartEditing?: (info: { id: string; name: string }) => void;
}

const TemplateSelectDialog = memo<TemplateDialogProps>(({ visible, onDismiss, onStartEditing }) => {
  const templates = useWorkoutStore((s) => s.templates);
  const customExercises = useWorkoutStore((s) => s.customExercises);
  const applyTemplate = useWorkoutStore((s) => s.applyTemplate);
  const deleteTemplate = useWorkoutStore((s) => s.deleteTemplate);
  const renameTemplate = useWorkoutStore((s) => s.renameTemplate);
  const addExerciseToTemplate = useWorkoutStore((s) => s.addExerciseToTemplate);
  const removeExerciseFromTemplate = useWorkoutStore((s) => s.removeExerciseFromTemplate);
  const hiddenBuiltinExercises = useWorkoutStore((s) => s.hiddenBuiltinExercises);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const renameRef = useRef('');

  const allBuiltinTypes: BuiltinExerciseType[] = ['pushup', 'squat', 'pullup', 'bodypump', 'bodycombat', 'leapfight'];
  const availableTypes = useMemo(
    () => allBuiltinTypes.filter((t) => !hiddenBuiltinExercises.includes(t)),
    [hiddenBuiltinExercises]
  );

  const editingTemplate = useMemo(
    () => templates.find((t) => t.id === editingId),
    [templates, editingId]
  );

  const handleApply = useCallback((id: string) => {
    const template = templates.find((t) => t.id === id);
    applyTemplate(id);
    if (onStartEditing && template) {
      onStartEditing({ id, name: template.name });
    }
    onDismiss();
  }, [applyTemplate, onDismiss, templates, onStartEditing]);

  const handleStartRename = useCallback((id: string, currentName: string) => {
    renameRef.current = currentName;
    setRenameId(id);
  }, []);

  const handleConfirmRename = useCallback(() => {
    if (renameId && renameRef.current.trim()) {
      renameTemplate(renameId, renameRef.current.trim());
    }
    setRenameId(null);
  }, [renameId, renameTemplate]);

  const handleBack = useCallback(() => {
    setEditingId(null);
    setShowAddExercise(false);
  }, []);

  const handleDismiss = useCallback(() => {
    setEditingId(null);
    setShowAddExercise(false);
    setRenameId(null);
    onDismiss();
  }, [onDismiss]);

  // 編集モード
  if (editingId && editingTemplate) {
    return (
      <Dialog visible={visible} onDismiss={handleDismiss} style={styles.dialog}>
        <Dialog.Title>「{editingTemplate.name}」を編集</Dialog.Title>
        <Dialog.Content>
          <ScrollView style={styles.templateList}>
            {editingTemplate.exercises.map((exercise) => {
              const color = getExerciseColor(exercise.type, customExercises);
              const icon = getExerciseIcon(exercise.type, customExercises);
              return (
                <View key={exercise.id} style={styles.templateEditItem}>
                  <MaterialCommunityIcons name={icon as any} size={20} color={color} />
                  <Text style={[styles.templateExerciseName, { color }]}>{exercise.name}</Text>
                  <IconButton
                    icon="close-circle-outline"
                    size={20}
                    iconColor={darkTheme.colors.error}
                    onPress={() => removeExerciseFromTemplate(editingId, exercise.id)}
                  />
                </View>
              );
            })}
            {editingTemplate.exercises.length === 0 ? (
              <Text style={styles.emptyTemplateText}>種目がありません</Text>
            ) : null}

            {showAddExercise ? (
              <View style={styles.addExerciseSection}>
                <Text style={styles.addExerciseSectionLabel}>種目を追加</Text>
                {availableTypes.map((type) => {
                  const color = getExerciseColor(type, customExercises);
                  const icon = getExerciseIcon(type, customExercises);
                  return (
                    <Button
                      key={type}
                      mode="outlined"
                      onPress={() => { addExerciseToTemplate(editingId, type); setShowAddExercise(false); }}
                      style={[styles.exerciseButton, { borderColor: color }]}
                      labelStyle={{ color }}
                      icon={() => <MaterialCommunityIcons name={icon as any} size={18} color={color} />}
                      contentStyle={styles.exerciseButtonContent}
                      compact
                    >
                      {BUILTIN_EXERCISE_NAMES[type]}
                    </Button>
                  );
                })}
                {customExercises.map((custom) => (
                  <Button
                    key={custom.id}
                    mode="outlined"
                    onPress={() => { addExerciseToTemplate(editingId, custom.id); setShowAddExercise(false); }}
                    style={[styles.exerciseButton, { borderColor: custom.color }]}
                    labelStyle={{ color: custom.color }}
                    icon={() => <MaterialCommunityIcons name={custom.icon as any} size={18} color={custom.color} />}
                    contentStyle={styles.exerciseButtonContent}
                    compact
                  >
                    {custom.name}
                  </Button>
                ))}
              </View>
            ) : (
              <Button
                mode="text"
                icon="plus"
                onPress={() => setShowAddExercise(true)}
                textColor={darkTheme.colors.primary}
                style={styles.addExerciseButton}
              >
                種目を追加
              </Button>
            )}
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleBack}>戻る</Button>
        </Dialog.Actions>
      </Dialog>
    );
  }

  // 一覧モード
  return (
    <Dialog visible={visible} onDismiss={handleDismiss} style={styles.dialog}>
      <Dialog.Title>テンプレートを選択</Dialog.Title>
      <Dialog.Content>
        {templates.length === 0 ? (
          <Text style={styles.emptyTemplateText}>保存されたテンプレートがありません</Text>
        ) : (
          <ScrollView style={styles.templateList}>
            {templates.map((template) => (
              <View key={template.id} style={styles.templateItem}>
                {renameId === template.id ? (
                  <View style={styles.renameRow}>
                    <RNTextInput
                      defaultValue={template.name}
                      onChangeText={(text) => { renameRef.current = text; }}
                      style={[styles.textInput, styles.renameInput]}
                      autoFocus
                      onSubmitEditing={handleConfirmRename}
                    />
                    <IconButton icon="check" size={20} onPress={handleConfirmRename} />
                  </View>
                ) : (
                  <>
                    <Button
                      mode="outlined"
                      onPress={() => handleApply(template.id)}
                      style={styles.templateButton}
                    >
                      {template.name}
                    </Button>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => handleStartRename(template.id, template.name)}
                    />
                    <IconButton
                      icon="playlist-edit"
                      size={20}
                      onPress={() => setEditingId(template.id)}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => {
                        Alert.alert(
                          'テンプレートの削除',
                          `「${template.name}」を削除しますか？`,
                          [
                            { text: 'キャンセル', style: 'cancel' },
                            { text: '削除', style: 'destructive', onPress: () => deleteTemplate(template.id) },
                          ]
                        );
                      }}
                    />
                  </>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={handleDismiss}>閉じる</Button>
      </Dialog.Actions>
    </Dialog>
  );
});

// --- SaveTemplateDialog コンポーネント ---
const SaveTemplateDialog = memo<TemplateDialogProps>(({ visible, onDismiss }) => {
  const saveTemplate = useWorkoutStore((s) => s.saveTemplate);
  const updateTemplate = useWorkoutStore((s) => s.updateTemplate);
  const templates = useWorkoutStore((s) => s.templates);
  const templateNameRef = useRef('');
  const [templateNameEmpty, setTemplateNameEmpty] = useState(true);

  const handleDismiss = useCallback(() => {
    templateNameRef.current = '';
    setTemplateNameEmpty(true);
    onDismiss();
  }, [onDismiss]);

  const handleSave = useCallback(() => {
    const name = templateNameRef.current.trim();
    if (name) {
      saveTemplate(name);
      templateNameRef.current = '';
      setTemplateNameEmpty(true);
      onDismiss();
    }
  }, [saveTemplate, onDismiss]);

  const handleOverwrite = useCallback((id: string, name: string) => {
    Alert.alert(
      'テンプレートの上書き',
      `「${name}」を今のメニューで上書きしますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '上書き', onPress: () => { updateTemplate(id); onDismiss(); } },
      ]
    );
  }, [updateTemplate, onDismiss]);

  const handleNameChange = useCallback((text: string) => {
    templateNameRef.current = text;
    const isEmpty = !text.trim();
    setTemplateNameEmpty((prev) => (prev !== isEmpty ? isEmpty : prev));
  }, []);

  return (
    <Dialog visible={visible} onDismiss={handleDismiss} style={styles.dialog}>
      <Dialog.Title>テンプレートとして保存</Dialog.Title>
      <Dialog.Content>
        <RNTextInput
          defaultValue=""
          onChangeText={handleNameChange}
          placeholder="新しいテンプレート名（例: 胸の日）"
          style={styles.textInput}
        />
        {templates.length > 0 ? (
          <View style={styles.overwriteSection}>
            <Text style={styles.overwriteLabel}>既存テンプレートに上書き</Text>
            {templates.map((t) => (
              <Button
                key={t.id}
                mode="outlined"
                onPress={() => handleOverwrite(t.id, t.name)}
                style={styles.overwriteButton}
                icon="content-save-edit"
                compact
              >
                {t.name}
              </Button>
            ))}
          </View>
        ) : null}
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={handleDismiss}>キャンセル</Button>
        <Button onPress={handleSave} disabled={templateNameEmpty}>新規保存</Button>
      </Dialog.Actions>
    </Dialog>
  );
});

// --- メインHomeScreen ---

export default function HomeScreen() {
  const {
    selectedDate,
    setSelectedDate,
    workoutTimerRunning,
    customExercises,
    startWorkoutTimer,
    stopWorkoutTimer,
    resetWorkoutTimer,
    getWorkoutByDate,
    getSelectedWorkoutDurationSeconds,
  } = useWorkoutStore();

  const selectedWorkout = getWorkoutByDate(selectedDate);
  const exercises = selectedWorkout?.exercises ?? EMPTY_EXERCISES;

  // テンプレート編集中の状態
  const [editingTemplateInfo, setEditingTemplateInfo] = useState<{ id: string; name: string } | null>(null);
  const updateTemplate = useWorkoutStore((s) => s.updateTemplate);

  // Dialog visibility states
  const [dialogVisible, setDialogVisible] = useState(false);
  const [customExerciseDialogVisible, setCustomExerciseDialogVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [templateDialogVisible, setTemplateDialogVisible] = useState(false);
  const [saveTemplateDialogVisible, setSaveTemplateDialogVisible] = useState(false);

  // Timer tick for duration display
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    if (!workoutTimerRunning) return;
    const intervalId = setInterval(() => {
      setTimerTick((tick) => tick + 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [workoutTimerRunning]);

  // Date formatting (memoized)
  const { formattedDate, isToday, todayDate } = useMemo(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const formatted = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    return { formattedDate: formatted, isToday: selectedDate === today, todayDate: today };
  }, [selectedDate]);

  const workoutDurationSeconds = getSelectedWorkoutDurationSeconds();

  // Stable callbacks
  const handleGoToToday = useCallback(() => setSelectedDate(todayDate), [setSelectedDate, todayDate]);
  const handleOpenDatePicker = useCallback(() => setDatePickerVisible(true), []);
  const handleOpenDialog = useCallback(() => setDialogVisible(true), []);
  const handleCloseDialog = useCallback(() => setDialogVisible(false), []);
  const handleOpenCustomExerciseDialog = useCallback(() => setCustomExerciseDialogVisible(true), []);
  const handleCloseCustomExerciseDialog = useCallback(() => setCustomExerciseDialogVisible(false), []);
  const handleCloseDatePicker = useCallback(() => setDatePickerVisible(false), []);
  const handleOpenTemplateDialog = useCallback(() => setTemplateDialogVisible(true), []);
  const handleCloseTemplateDialog = useCallback(() => setTemplateDialogVisible(false), []);
  const handleStartEditing = useCallback((info: { id: string; name: string }) => {
    setEditingTemplateInfo(info);
  }, []);
  const handleFinishEditing = useCallback(() => {
    if (editingTemplateInfo) {
      updateTemplate(editingTemplateInfo.id);
      setEditingTemplateInfo(null);
    }
  }, [editingTemplateInfo, updateTemplate]);
  const handleCancelEditing = useCallback(() => {
    setEditingTemplateInfo(null);
  }, []);
  const handleOpenSaveTemplateDialog = useCallback(() => setSaveTemplateDialogVisible(true), []);
  const handleCloseSaveTemplateDialog = useCallback(() => setSaveTemplateDialogVisible(false), []);

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate(day.dateString);
    setDatePickerVisible(false);
  }, [setSelectedDate]);

  // Calendar marked dates (memoized)
  const markedDates = useMemo(() => ({
    [selectedDate]: { selected: true, selectedColor: darkTheme.colors.primary },
  }), [selectedDate]);

  // FlashList renderItem
  const renderExerciseItem = useCallback(({ item }: { item: Exercise }) => {
    const color = getExerciseColor(item.type, customExercises);
    const icon = getExerciseIcon(item.type, customExercises);
    return <ExerciseCard exercise={item} exerciseColor={color} exerciseIcon={icon} />;
  }, [customExercises]);

  const keyExtractor = useCallback((item: Exercise) => item.id, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{formattedDate}</Text>
          <View style={styles.dateActions}>
            {!isToday ? (
              <Button mode="text" onPress={handleGoToToday} compact textColor={darkTheme.colors.primary}>
                今日
              </Button>
            ) : null}
            <Button mode="text" onPress={handleOpenDatePicker} compact textColor={darkTheme.colors.onSurfaceVariant}>
              日付変更
            </Button>
          </View>
        </View>
        <Button
          mode="outlined"
          icon="file-document-outline"
          onPress={handleOpenTemplateDialog}
          style={styles.copyButton}
          labelStyle={styles.copyButtonLabel}
          compact
        >
          テンプレート
        </Button>
        {editingTemplateInfo ? (
          <View style={styles.editingBanner}>
            <MaterialCommunityIcons name="playlist-edit" size={18} color="#d4a054" />
            <Text style={styles.editingBannerText}>「{editingTemplateInfo.name}」を編集中</Text>
            <Button mode="text" onPress={handleCancelEditing} compact textColor="#d4a054">
              取消
            </Button>
          </View>
        ) : null}
        <View style={styles.workoutTimerContainer}>
          <Text style={styles.durationText}>筋トレ時間 {formatDuration(workoutDurationSeconds)}</Text>
          <View style={styles.workoutTimerButtons}>
            <IconButton
              icon={workoutTimerRunning ? 'pause-circle' : 'play-circle'}
              mode="contained"
              iconColor={darkTheme.colors.onPrimary}
              containerColor={darkTheme.colors.primary}
              size={32}
              onPress={workoutTimerRunning ? stopWorkoutTimer : startWorkoutTimer}
            />
            <IconButton
              icon="refresh-circle"
              mode="contained-tonal"
              iconColor="#94a3b8"
              containerColor="#334155"
              size={32}
              onPress={resetWorkoutTimer}
            />
            <IconButton
              icon="check-circle"
              mode="contained"
              iconColor={darkTheme.colors.onPrimary}
              containerColor={darkTheme.colors.primary}
              size={32}
              onPress={stopWorkoutTimer}
            />
          </View>
        </View>
      </View>

      {exercises.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="dumbbell" size={48} color={darkTheme.colors.onSurfaceVariant} />
              <Text style={styles.emptyText}>今日のトレーニングを追加しましょう</Text>
            </Card.Content>
          </Card>
        </View>
      ) : (
        <FlashList
          data={exercises}
          renderItem={renderExerciseItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
        />
      )}

      <View style={styles.bottomButtons}>
        <Button
          mode="contained"
          icon="plus"
          onPress={handleOpenDialog}
          style={styles.addButtonFlex}
          contentStyle={styles.addButtonContent}
          buttonColor="#10b981"
        >
          種目追加
        </Button>
        {exercises.length > 0 ? (
          editingTemplateInfo ? (
            <Button
              mode="contained"
              icon="content-save-check"
              onPress={handleFinishEditing}
              style={styles.saveButtonFlex}
              contentStyle={styles.addButtonContent}
              buttonColor="#2a1f0e"
              textColor="#d4a054"
            >
              テンプレ更新
            </Button>
          ) : (
            <Button
              mode="outlined"
              icon="bookmark-plus-outline"
              onPress={handleOpenSaveTemplateDialog}
              style={styles.saveButtonFlex}
              contentStyle={styles.addButtonContent}
            >
              メニュー保存
            </Button>
          )
        ) : null}
      </View>

      <Portal>
        <ExerciseSelectDialog
          visible={dialogVisible}
          onDismiss={handleCloseDialog}
          onOpenCustomDialog={handleOpenCustomExerciseDialog}
        />
        <CustomExerciseDialog
          visible={customExerciseDialogVisible}
          onDismiss={handleCloseCustomExerciseDialog}
        />
        <Dialog visible={datePickerVisible} onDismiss={handleCloseDatePicker} style={styles.dialog}>
          <Dialog.Title>日付を選択</Dialog.Title>
          <Dialog.Content>
            <Calendar
              theme={calendarTheme}
              markedDates={markedDates}
              onDayPress={handleDayPress}
              enableSwipeMonths
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCloseDatePicker}>キャンセル</Button>
          </Dialog.Actions>
        </Dialog>
        <TemplateSelectDialog
          visible={templateDialogVisible}
          onDismiss={handleCloseTemplateDialog}
          onStartEditing={handleStartEditing}
        />
        <SaveTemplateDialog
          visible={saveTemplateDialogVisible}
          onDismiss={handleCloseSaveTemplateDialog}
        />
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  headerSection: {
    padding: 16,
    paddingBottom: 0,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    padding: 16,
  },
  dateText: {
    fontSize: 18,
    color: darkTheme.colors.onSurface,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyButton: {
    marginBottom: 12,
    borderColor: '#64748b',
  },
  copyButtonLabel: {
    color: '#94a3b8',
  },
  durationText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  workoutTimerContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  workoutTimerButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  exerciseCard: {
    backgroundColor: darkTheme.colors.surface,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  exerciseTitle: {
    color: darkTheme.colors.onSurface,
    fontWeight: '600',
  },
  setContainer: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.outline,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  setActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryContainer: {
    marginBottom: 4,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  entryLabel: {
    color: darkTheme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  compactInput: {
    flex: 1,
    height: 40,
    backgroundColor: darkTheme.colors.surfaceVariant,
  },
  detailToggle: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  detailBlock: {
    marginBottom: 4,
  },
  setLabel: {
    color: darkTheme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  variationInput: {
    flex: 1,
    height: 40,
    backgroundColor: darkTheme.colors.surfaceVariant,
  },
  tempoInput: {
    flex: 1,
    height: 40,
    backgroundColor: darkTheme.colors.surfaceVariant,
  },
  addEntryButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  durationContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    width: '100%',
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    justifyContent: 'center',
    width: '100%',
  },
  durationChip: {
    flex: 1,
  },
  addButtonFlex: {
    flex: 1,
  },
  saveButtonFlex: {
    flex: 1,
    marginLeft: 8,
  },
  addButtonContent: {
    paddingVertical: 8,
  },
  dialog: {
    backgroundColor: darkTheme.colors.surface,
  },
  exerciseList: {
    maxHeight: 400,
  },
  exerciseButton: {
    marginBottom: 8,
    marginHorizontal: 16,
    borderWidth: 1,
  },
  exerciseButtonContent: {
    justifyContent: 'flex-start',
    paddingVertical: 4,
  },
  addCustomButton: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: darkTheme.colors.primary,
  },
  customExerciseNativeInput: {
    backgroundColor: darkTheme.colors.surfaceVariant,
    color: darkTheme.colors.onSurface,
    borderWidth: 1,
    borderColor: darkTheme.colors.outline,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  customExerciseLabel: {
    color: darkTheme.colors.onSurface,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  iconScroll: {
    marginBottom: 16,
  },
  colorScroll: {
    marginBottom: 8,
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    gap: 8,
    backgroundColor: darkTheme.colors.background,
  },
  templateList: {
    maxHeight: 300,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateButton: {
    flex: 1,
  },
  emptyTemplateText: {
    color: darkTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 20,
  },
  textInput: {
    backgroundColor: darkTheme.colors.surfaceVariant,
    color: darkTheme.colors.onSurface,
    borderWidth: 1,
    borderColor: darkTheme.colors.outline,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  swipeDeleteAction: {
    backgroundColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    marginBottom: 8,
    borderRadius: 8,
  },
  hiddenExercisesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.outline,
  },
  hiddenExercisesLabel: {
    fontSize: 12,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: 6,
  },
  hiddenExerciseButton: {
    marginBottom: 8,
    opacity: 0.6,
  },
  renameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  renameInput: {
    flex: 1,
  },
  templateEditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 8,
  },
  templateExerciseName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  addExerciseButton: {
    marginTop: 8,
  },
  addExerciseSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.outline,
  },
  addExerciseSectionLabel: {
    fontSize: 12,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  overwriteSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.outline,
  },
  overwriteLabel: {
    fontSize: 12,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  overwriteButton: {
    marginBottom: 6,
  },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1f0e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    gap: 8,
  },
  editingBannerText: {
    flex: 1,
    color: '#d4a054',
    fontSize: 13,
    fontWeight: '600',
  },
});
