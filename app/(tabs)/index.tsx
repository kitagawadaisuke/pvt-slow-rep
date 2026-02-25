import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, TextInput as RNTextInput, Alert, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Text, Card, Button, IconButton, TextInput, Portal, Dialog } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { useWorkoutStore } from '@/stores/workoutStore';
import { darkTheme, colors, calendarTheme } from '@/constants/theme';
import { ExerciseType, BuiltinExerciseType, EXERCISE_ICONS, isDurationBasedExercise, DURATION_PRESETS, BUILTIN_EXERCISE_NAMES } from '@/types/workout';

// IME対応TextInputコンポーネント
interface IMESafeTextInputProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  style?: any;
  outlineColor?: string;
  activeOutlineColor?: string;
}

const IMESafeTextInput: React.FC<IMESafeTextInputProps> = ({
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

  // 親からのvalue変更を反映（初期値設定時のみ）
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  // フォーカスが外れたときにstoreへ保存
  const handleEndEditing = () => {
    const trimmedValue = localValue.trim();
    if (trimmedValue !== value) {
      onSave(trimmedValue);
    }
  };

  return (
    <TextInput
      mode="outlined"
      label={label}
      value={localValue}
      onChangeText={setLocalValue}
      onFocus={() => {
        isFocusedRef.current = true;
      }}
      onBlur={() => {
        isFocusedRef.current = false;
      }}
      onEndEditing={handleEndEditing}
      placeholder={placeholder}
      style={style}
      outlineColor={outlineColor}
      activeOutlineColor={activeOutlineColor}
      dense
    />
  );
};

export default function HomeScreen() {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [customExerciseDialogVisible, setCustomExerciseDialogVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [templateDialogVisible, setTemplateDialogVisible] = useState(false);
  const [saveTemplateDialogVisible, setSaveTemplateDialogVisible] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});
  const [, setTimerTick] = useState(0);
  const customExerciseNameRef = useRef('');
  const [customExerciseNameEmpty, setCustomExerciseNameEmpty] = useState(true);
  const [customExerciseIcon, setCustomExerciseIcon] = useState('dumbbell');
  const [customExerciseColor, setCustomExerciseColor] = useState('#3b82f6');
  const templateNameRef = useRef('');
  const [templateNameEmpty, setTemplateNameEmpty] = useState(true);
  const {
    selectedDate,
    setSelectedDate,
    workoutTimerRunning,
    getWorkoutByDate,
    getSelectedWorkoutDurationSeconds,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    copySet,
    addSetEntry,
    removeSetEntry,
    updateEntryReps,
    updateEntryWeight,
    updateEntryVariation,
    updateEntryTempo,
    updateDurationMinutes,
    customExercises,
    addCustomExercise,
    startWorkoutTimer,
    stopWorkoutTimer,
    resetWorkoutTimer,
    removeCustomExercise,
    saveTemplate,
    getTemplates,
    deleteTemplate,
    applyTemplate,
    hiddenBuiltinExercises,
    hideBuiltinExercise,
    showBuiltinExercise,
  } = useWorkoutStore();

  const selectedWorkout = getWorkoutByDate(selectedDate);
  const exercises = selectedWorkout?.exercises || [];

  const allBuiltinExerciseTypes: BuiltinExerciseType[] = ['pushup', 'squat', 'pullup', 'bodypump', 'bodycombat', 'leapfight'];
  const exerciseTypes = allBuiltinExerciseTypes.filter((t) => !hiddenBuiltinExercises.includes(t));

  const handleAddExercise = (type: ExerciseType) => {
    addExercise(type);
    setDialogVisible(false);
  };

  const getExerciseColor = (type: ExerciseType) => {
    const customExercise = customExercises.find((e) => e.id === type);
    if (customExercise) return customExercise.color;
    return (colors as Record<string, string>)[type] || colors.strength;
  };

  const getExerciseIcon = (type: ExerciseType): string => {
    const customExercise = customExercises.find((e) => e.id === type);
    if (customExercise) return customExercise.icon;
    return (EXERCISE_ICONS as Record<string, string>)[type] || 'dumbbell';
  };

  const handleAddCustomExercise = () => {
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
    setCustomExerciseDialogVisible(false);
  };

  useEffect(() => {
    if (!workoutTimerRunning) return;
    const intervalId = setInterval(() => {
      setTimerTick((tick) => tick + 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [workoutTimerRunning]);

  const now = new Date();
  const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = selectedDate === todayDate;

  const formattedDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const workoutDurationSeconds = getSelectedWorkoutDurationSeconds();

  const toggleEntryDetail = (key: string) => {
    setExpandedEntries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{formattedDate}</Text>
          <View style={styles.dateActions}>
            {!isToday && (
              <Button
                mode="text"
                onPress={() => setSelectedDate(todayDate)}
                compact
                textColor={darkTheme.colors.primary}
              >
                今日
              </Button>
            )}
            <Button
              mode="text"
              onPress={() => setDatePickerVisible(true)}
              compact
              textColor={darkTheme.colors.onSurfaceVariant}
            >
              日付変更
            </Button>
          </View>
        </View>
        {exercises.length === 0 && (
          <Button
            mode="outlined"
            icon="file-document-outline"
            onPress={() => setTemplateDialogVisible(true)}
            style={styles.copyButton}
            labelStyle={styles.copyButtonLabel}
            compact
          >
            テンプレート
          </Button>
        )}
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

        {exercises.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="dumbbell" size={48} color={darkTheme.colors.onSurfaceVariant} />
              <Text style={styles.emptyText}>今日のトレーニングを追加しましょう</Text>
            </Card.Content>
          </Card>
        ) : (
          exercises.map((exercise) => (
            <Card key={exercise.id} style={[styles.exerciseCard, { borderLeftColor: getExerciseColor(exercise.type) }]}>
              <Card.Title
                title={exercise.name}
                titleStyle={styles.exerciseTitle}
                left={() => (
                  <MaterialCommunityIcons
                    name={getExerciseIcon(exercise.type) as any}
                    size={24}
                    color={getExerciseColor(exercise.type)}
                  />
                )}
                right={() => (
                  <IconButton
                    icon="delete-outline"
                    iconColor={darkTheme.colors.error}
                    onPress={() => removeExercise(exercise.id)}
                  />
                )}
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
                          buttonColor={exercise.durationMinutes === mins ? getExerciseColor(exercise.type) : undefined}
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

                        {set.entries.map((entry, entryIndex) => {
                          const key = `${exercise.id}-${setIndex}-${entryIndex}`;
                          const isOpen = !!expandedEntries[key];
                          return (
                            <View key={entryIndex} style={styles.entryContainer}>
                              {set.entries.length > 1 && (
                                <View style={styles.entryHeader}>
                                  <Text style={styles.entryLabel}>種目 {entryIndex + 1}</Text>
                                  <IconButton
                                    icon="close-circle-outline"
                                    iconColor={darkTheme.colors.onSurfaceVariant}
                                    size={16}
                                    onPress={() => removeSetEntry(exercise.id, setIndex, entryIndex)}
                                  />
                                </View>
                              )}

                              <View style={styles.compactRow}>
                                <TextInput
                                  mode="outlined"
                                  label="回数"
                                  value={entry.reps > 0 ? entry.reps.toString() : ''}
                                  onChangeText={(text) => updateEntryReps(exercise.id, setIndex, entryIndex, parseInt(text, 10) || 0)}
                                  placeholder="0"
                                  keyboardType="number-pad"
                                  style={styles.compactInput}
                                  outlineColor={darkTheme.colors.outline}
                                  activeOutlineColor={getExerciseColor(exercise.type)}
                                  dense
                                />

                                <TextInput
                                  mode="outlined"
                                  label="重量"
                                  value={entry.weight ? entry.weight.toString() : ''}
                                  onChangeText={(text) => {
                                    const weight = parseFloat(text);
                                    updateEntryWeight(
                                      exercise.id,
                                      setIndex,
                                      entryIndex,
                                      Number.isFinite(weight) ? weight : 0
                                    );
                                  }}
                                  placeholder="kg"
                                  keyboardType="decimal-pad"
                                  style={styles.compactInput}
                                  outlineColor={darkTheme.colors.outline}
                                  activeOutlineColor={getExerciseColor(exercise.type)}
                                  dense
                                />
                              </View>

                              <Button
                                mode="text"
                                onPress={() => toggleEntryDetail(key)}
                                compact
                                textColor={darkTheme.colors.onSurfaceVariant}
                                style={styles.detailToggle}
                                icon={isOpen ? 'chevron-up' : 'chevron-down'}
                              >
                                詳細
                              </Button>

                              {isOpen && (
                                <View style={styles.detailBlock}>
                                  <View style={styles.setRow}>
                                    <IMESafeTextInput
                                      label="バリエーション"
                                      value={entry.variation || ''}
                                      onSave={(text) => updateEntryVariation(exercise.id, setIndex, entryIndex, text)}
                                      placeholder="例: ナロー"
                                      style={styles.variationInput}
                                      outlineColor={darkTheme.colors.outline}
                                      activeOutlineColor={getExerciseColor(exercise.type)}
                                    />
                                  </View>

                                  <View style={styles.setRow}>
                                    <IMESafeTextInput
                                      label="テンポ"
                                      value={entry.tempo || ''}
                                      onSave={(text) => updateEntryTempo(exercise.id, setIndex, entryIndex, text)}
                                      placeholder="例: 2-1-2"
                                      style={styles.tempoInput}
                                      outlineColor={darkTheme.colors.outline}
                                      activeOutlineColor={getExerciseColor(exercise.type)}
                                    />
                                  </View>
                                </View>
                              )}
                            </View>
                          );
                        })}

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
                      onPress={() => addSet(exercise.id)}
                      textColor={darkTheme.colors.primary}
                    >
                      セット追加
                    </Button>
                  </>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <View style={styles.bottomButtons}>
        <Button
          mode="contained"
          icon="plus"
          onPress={() => setDialogVisible(true)}
          style={[styles.addButton, { flex: 1 }]}
          contentStyle={styles.addButtonContent}
          buttonColor="#10b981"
        >
          種目追加
        </Button>
        {exercises.length > 0 && (
          <Button
            mode="outlined"
            icon="bookmark-plus-outline"
            onPress={() => setSaveTemplateDialogVisible(true)}
            style={[styles.addButton, { flex: 1, marginLeft: 8 }]}
            contentStyle={styles.addButtonContent}
          >
            メニュー保存
          </Button>
        )}
      </View>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title>種目を選択</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={styles.exerciseList}>
              {exerciseTypes.map((type) => (
                <Swipeable
                  key={type}
                  renderRightActions={() => (
                    <Pressable
                      style={styles.swipeDeleteAction}
                      onPress={() => hideBuiltinExercise(type)}
                    >
                      <MaterialCommunityIcons name="delete-outline" size={22} color="white" />
                    </Pressable>
                  )}
                  overshootRight={false}
                >
                  <Button
                    mode="outlined"
                    onPress={() => handleAddExercise(type)}
                    style={[styles.exerciseButton, { borderColor: getExerciseColor(type) }]}
                    labelStyle={{ color: getExerciseColor(type) }}
                    icon={() => (
                      <MaterialCommunityIcons
                        name={getExerciseIcon(type) as any}
                        size={20}
                        color={getExerciseColor(type)}
                      />
                    )}
                    contentStyle={styles.exerciseButtonContent}
                  >
                    {BUILTIN_EXERCISE_NAMES[type]}
                  </Button>
                </Swipeable>
              ))}
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
                    icon={() => (
                      <MaterialCommunityIcons
                        name={custom.icon as any}
                        size={20}
                        color={custom.color}
                      />
                    )}
                    contentStyle={styles.exerciseButtonContent}
                  >
                    {custom.name}
                  </Button>
                </Swipeable>
              ))}
              {hiddenBuiltinExercises.length > 0 && (
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
              )}
              <Button
                mode="contained"
                onPress={() => {
                  setDialogVisible(false);
                  setCustomExerciseDialogVisible(true);
                }}
                style={styles.addCustomButton}
                icon="plus"
              >
                カスタム種目を追加
              </Button>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>キャンセル</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog visible={datePickerVisible} onDismiss={() => setDatePickerVisible(false)} style={styles.dialog}>
          <Dialog.Title>日付を選択</Dialog.Title>
          <Dialog.Content>
            <Calendar
              theme={calendarTheme}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: darkTheme.colors.primary,
                },
              }}
              onDayPress={(day: DateData) => {
                setSelectedDate(day.dateString);
                setDatePickerVisible(false);
              }}
              enableSwipeMonths
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDatePickerVisible(false)}>キャンセル</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog visible={customExerciseDialogVisible} onDismiss={() => setCustomExerciseDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title>カスタム種目を追加</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.customExerciseLabel}>種目名</Text>
            <RNTextInput
              defaultValue=""
              onChangeText={(text) => {
                customExerciseNameRef.current = text;
                const isEmpty = !text.trim();
                setCustomExerciseNameEmpty((prev) => (prev !== isEmpty ? isEmpty : prev));
              }}
              placeholder="例: ベンチプレス"
              placeholderTextColor={darkTheme.colors.onSurfaceVariant}
              style={styles.customExerciseNativeInput}
              autoFocus={true}
              returnKeyType="done"
              blurOnSubmit={true}
            />
            <Text style={styles.customExerciseLabel}>アイコン</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
              {['dumbbell', 'arm-flex', 'human', 'human-handsup', 'run', 'boxing-glove', 'karate', 'weight-lifter', 'yoga', 'bike'].map((icon) => (
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
              {['#3b82f6', '#22c55e', '#f59e0b', '#f472b6', '#a855f7', '#ef4444', '#14b8a6', '#6366f1', '#ec4899', '#06b6d4'].map((color) => (
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
            <Button onPress={() => setCustomExerciseDialogVisible(false)}>キャンセル</Button>
            <Button onPress={handleAddCustomExercise} disabled={customExerciseNameEmpty}>追加</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={templateDialogVisible}
          onDismiss={() => setTemplateDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>テンプレートを選択</Dialog.Title>
          <Dialog.Content>
            {getTemplates().length === 0 ? (
              <Text style={styles.emptyTemplateText}>
                保存されたテンプレートがありません
              </Text>
            ) : (
              <ScrollView style={styles.templateList}>
                {getTemplates().map((template) => (
                  <View key={template.id} style={styles.templateItem}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        applyTemplate(template.id);
                        setTemplateDialogVisible(false);
                      }}
                      style={styles.templateButton}
                    >
                      {template.name}
                    </Button>
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => {
                        Alert.alert(
                          'テンプレートの削除',
                          `「${template.name}」を削除しますか？`,
                          [
                            { text: 'キャンセル', style: 'cancel' },
                            {
                              text: '削除',
                              style: 'destructive',
                              onPress: () => deleteTemplate(template.id),
                            },
                          ]
                        );
                      }}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setTemplateDialogVisible(false)}>閉じる</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={saveTemplateDialogVisible}
          onDismiss={() => {
            setSaveTemplateDialogVisible(false);
            templateNameRef.current = '';
            setTemplateNameEmpty(true);
          }}
          style={styles.dialog}
        >
          <Dialog.Title>テンプレートとして保存</Dialog.Title>
          <Dialog.Content>
            <RNTextInput
              defaultValue=""
              onChangeText={(text) => {
                templateNameRef.current = text;
                const isEmpty = !text.trim();
                setTemplateNameEmpty((prev) => (prev !== isEmpty ? isEmpty : prev));
              }}
              placeholder="テンプレート名（例: 胸の日）"
              style={styles.textInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setSaveTemplateDialogVisible(false);
                templateNameRef.current = '';
                setTemplateNameEmpty(true);
              }}
            >
              キャンセル
            </Button>
            <Button
              onPress={() => {
                const name = templateNameRef.current.trim();
                if (name) {
                  saveTemplate(name);
                  setSaveTemplateDialogVisible(false);
                  templateNameRef.current = '';
                  setTemplateNameEmpty(true);
                }
              }}
              disabled={templateNameEmpty}
            >
              保存
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
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
  repsInput: {
    width: 80,
    height: 40,
    backgroundColor: darkTheme.colors.surfaceVariant,
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
  addButton: {
    // position moved to bottomButtons
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
  customExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  customExerciseButton: {
    flex: 1,
    marginBottom: 0,
    marginHorizontal: 0,
  },
  addCustomButton: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: darkTheme.colors.primary,
  },
  customExerciseInput: {
    marginBottom: 16,
    backgroundColor: darkTheme.colors.surfaceVariant,
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
});
