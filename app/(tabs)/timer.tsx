import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Vibration } from 'react-native';
import { Text, Button, SegmentedButtons, Card, IconButton, TextInput } from 'react-native-paper';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useWorkoutStore } from '@/stores/workoutStore';
import { darkTheme } from '@/constants/theme';
import { FeedbackMode } from '@/types/workout';

export default function TimerScreen() {
  const {
    timerSettings,
    updateTimerSettings,
    startWorkoutTimer,
    stopWorkoutTimer,
    workoutTimerRunning,
    getSelectedWorkoutDurationSeconds,
    addTimerRecord,
  } = useWorkoutStore();
  const [mode, setMode] = useState<'interval' | 'metronome'>('interval');

  // Interval Timer State
  const [intervalTime, setIntervalTime] = useState(timerSettings.intervalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(timerSettings.intervalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, setDurationTick] = useState(0);

  // Metronome State
  const [bpm, setBpm] = useState(timerSettings.metronomeBpm);
  const [beats, setBeats] = useState<4 | 8>(timerSettings.metronomeBeats);
  const [isMetronomeRunning, setIsMetronomeRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [barCount, setBarCount] = useState(0);
  const metronomeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Feedback mode
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>(timerSettings.feedbackMode || 'both');

  // Audio
  const soundRef = useRef<Audio.Sound | null>(null);
  const clickSoundRef = useRef<Audio.Sound | null>(null);
  const accentSoundRef = useRef<Audio.Sound | null>(null);

  const intervalOptions = [30, 60, 90];

  useEffect(() => {
    setupAudio();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (metronomeRef.current) clearInterval(metronomeRef.current);
      cleanupAudio();
      Speech.stop();
    };
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
      });
    } catch {
      // Silently fail
    }
  };

  const cleanupAudio = async () => {
    try {
      if (soundRef.current) await soundRef.current.unloadAsync();
      if (clickSoundRef.current) await clickSoundRef.current.unloadAsync();
      if (accentSoundRef.current) await accentSoundRef.current.unloadAsync();
    } catch {
      // Silently fail
    }
  };

  const playBeep = useCallback(async (isAccent: boolean) => {
    const shouldVibrate = feedbackMode === 'vibration' || feedbackMode === 'both';
    const shouldSound = feedbackMode === 'sound' || feedbackMode === 'both';

    if (shouldVibrate) {
      Vibration.vibrate(isAccent ? 30 : 10);
    }

    if (shouldSound) {
      try {
        // 柔らかめのクリック音
        const { sound } = await Audio.Sound.createAsync(
          { uri: `data:audio/wav;base64,${isAccent ? generateAccentBeep() : generateNormalBeep()}` },
          { shouldPlay: true, volume: isAccent ? 0.75 : 0.45 }
        );
        sound.setOnPlaybackStatusUpdate((status) => {
          if ('didJustFinish' in status && status.didJustFinish) {
            sound.unloadAsync();
          }
        });
      } catch {
        // 音が出ない場合はバイブレーションでフォールバック
        if (!shouldVibrate) {
          Vibration.vibrate(isAccent ? 30 : 10);
        }
      }
    }
  }, [feedbackMode]);

  const playTimerEnd = useCallback(async () => {
    const shouldVibrate = feedbackMode === 'vibration' || feedbackMode === 'both';
    const shouldSound = feedbackMode === 'sound' || feedbackMode === 'both';

    if (shouldVibrate) {
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    }

    if (shouldSound) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: `data:audio/wav;base64,${generateTimerEndBeep()}` },
          { shouldPlay: true, volume: 1.0 }
        );
        sound.setOnPlaybackStatusUpdate((status) => {
          if ('didJustFinish' in status && status.didJustFinish) {
            sound.unloadAsync();
          }
        });
      } catch {
        // Silently fail
      }
    }
  }, [feedbackMode]);

  // Interval Timer Logic
  useEffect(() => {
    if (isRunning && remainingTime > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playTimerEnd();
            return intervalTime;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, intervalTime, playTimerEnd]);

  // Metronome Logic
  useEffect(() => {
    if (isMetronomeRunning) {
      const intervalMs = (60 / bpm) * 1000;
      metronomeRef.current = setInterval(() => {
        setCurrentBeat((prev) => {
          const nextBeat = (prev + 1) % beats;
          const isAccent = nextBeat === 0 || (beats === 8 && nextBeat === 4);
          playBeep(isAccent);

          if (nextBeat === 0) {
            setBarCount((prevBars) => {
              const newBarCount = prevBars + 1;
              Speech.speak(`${newBarCount}`);
              return newBarCount;
            });
          }

          return nextBeat;
        });
      }, intervalMs);
    } else {
      if (metronomeRef.current) clearInterval(metronomeRef.current);
      setCurrentBeat(0);
    }

    return () => {
      if (metronomeRef.current) clearInterval(metronomeRef.current);
    };
  }, [isMetronomeRunning, bpm, beats, playBeep]);

  useEffect(() => {
    if (isMetronomeRunning) {
      startWorkoutTimer();
    } else {
      stopWorkoutTimer();
    }
  }, [isMetronomeRunning, startWorkoutTimer, stopWorkoutTimer]);

  useEffect(() => {
    if (!workoutTimerRunning) return;
    const intervalId = setInterval(() => {
      setDurationTick((tick) => tick + 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [workoutTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startInterval = () => {
    setRemainingTime(intervalTime);
    setIsRunning(true);
  };

  const pauseInterval = () => {
    setIsRunning(false);
  };

  const resumeInterval = () => {
    setIsRunning(true);
  };

  const resetInterval = () => {
    setIsRunning(false);
    setRemainingTime(intervalTime);
  };

  const selectIntervalTime = (seconds: number) => {
    setIntervalTime(seconds);
    setRemainingTime(seconds);
    updateTimerSettings({ intervalSeconds: seconds });
  };

  const adjustIntervalTime = (delta: number) => {
    const newTime = Math.max(10, intervalTime + delta);
    selectIntervalTime(newTime);
  };

  const adjustBpm = (delta: number) => {
    const newBpm = Math.max(40, Math.min(200, bpm + delta));
    setBpm(newBpm);
    updateTimerSettings({ metronomeBpm: newBpm });
  };

  const toggleBeats = () => {
    const newBeats: 4 | 8 = beats === 4 ? 8 : 4;
    setBeats(newBeats);
    updateTimerSettings({ metronomeBeats: newBeats });
  };

  const resetBarCount = () => {
    setBarCount(0);
    setCurrentBeat(0);
  };

  const cycleFeedbackMode = () => {
    const modes: FeedbackMode[] = ['both', 'vibration', 'sound'];
    const currentIndex = modes.indexOf(feedbackMode);
    const newMode = modes[(currentIndex + 1) % modes.length];
    setFeedbackMode(newMode);
    updateTimerSettings({ feedbackMode: newMode });
  };

  const recordIntervalTime = () => {
    addTimerRecord({
      type: 'interval',
      intervalSeconds: intervalTime,
    });
  };

  const recordMetronome = () => {
    addTimerRecord({
      type: 'metronome',
      metronomeBpm: bpm,
      metronomeBeats: beats,
    });
  };

  const feedbackModeLabel: Record<FeedbackMode, string> = {
    vibration: '振動のみ',
    sound: '音のみ',
    both: '振動+音',
  };

  const feedbackModeIcon: Record<FeedbackMode, string> = {
    vibration: 'vibrate',
    sound: 'volume-high',
    both: 'bell-ring',
  };

  const isAccentBeat = (beatIndex: number) => {
    if (beatIndex === 0) return true;
    if (beats === 8 && beatIndex === 4) return true;
    return false;
  };

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={mode}
        onValueChange={(value) => setMode(value as 'interval' | 'metronome')}
        buttons={[
          { value: 'interval', label: 'インターバル' },
          { value: 'metronome', label: 'メトロノーム' },
        ]}
        style={styles.segmentedButtons}
      />

      <Text style={styles.workoutDurationText}>
        筋トレ時間 {formatTime(getSelectedWorkoutDurationSeconds())}
      </Text>

      <Button
        mode="outlined"
        icon={feedbackModeIcon[feedbackMode]}
        onPress={cycleFeedbackMode}
        style={styles.feedbackButton}
        compact
      >
        {feedbackModeLabel[feedbackMode]}
      </Button>

      {mode === 'interval' ? (
        <View style={styles.content}>
          <Card style={styles.timerCard}>
            <Card.Content style={styles.timerContent}>
              <Text style={styles.timerDisplay}>{formatTime(remainingTime)}</Text>
              <Text style={styles.timerLabel}>
                {isRunning ? '残り時間' : '設定時間'}
              </Text>
              <IconButton
                icon="bookmark-outline"
                mode="contained-tonal"
                iconColor="#94a3b8"
                containerColor="#334155"
                onPress={recordIntervalTime}
                style={styles.recordButton}
                size={20}
              />
            </Card.Content>
          </Card>

          <View style={styles.intervalOptions}>
            {intervalOptions.map((seconds) => (
              <Button
                key={seconds}
                mode={intervalTime === seconds ? 'contained' : 'outlined'}
                onPress={() => selectIntervalTime(seconds)}
                style={styles.intervalButton}
                compact
              >
                {formatTime(seconds)}
              </Button>
            ))}
          </View>

          <View style={styles.intervalAdjustControls}>
            <IconButton
              icon="minus"
              mode="contained"
              onPress={() => adjustIntervalTime(-10)}
              size={28}
            />
            <IconButton
              icon="plus"
              mode="contained"
              onPress={() => adjustIntervalTime(10)}
              size={28}
            />
          </View>

          <View style={styles.buttonRow}>
            {isRunning ? (
              <Button
                mode="contained"
                onPress={pauseInterval}
                style={[styles.mainButton, styles.stopButton]}
                contentStyle={styles.mainButtonContent}
                icon="pause"
              >
                一時停止
              </Button>
            ) : remainingTime < intervalTime ? (
              <>
                <Button
                  mode="contained"
                  onPress={resumeInterval}
                  style={[styles.mainButton, { flex: 1 }]}
                  contentStyle={styles.mainButtonContent}
                  icon="play"
                >
                  再開
                </Button>
                <Button
                  mode="outlined"
                  onPress={resetInterval}
                  style={[styles.mainButton, { flex: 1, marginLeft: 8 }]}
                  contentStyle={styles.mainButtonContent}
                  icon="refresh"
                >
                  リセット
                </Button>
              </>
            ) : (
              <Button
                mode="contained"
                onPress={startInterval}
                style={styles.mainButton}
                contentStyle={styles.mainButtonContent}
                icon="play"
              >
                スタート
              </Button>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <Card style={styles.timerCard}>
            <Card.Content style={styles.metronomeContent}>
              <Text style={styles.bpmDisplay}>{bpm}</Text>
              <Text style={styles.bpmLabel}>BPM</Text>
              <Text style={styles.barCountLabel}>小節数: {barCount}</Text>

              <View style={styles.beatIndicators}>
                {Array.from({ length: beats }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.beatDot,
                      currentBeat === i && isMetronomeRunning && styles.beatDotActive,
                      isAccentBeat(i) && styles.beatDotAccent,
                      currentBeat === i && isMetronomeRunning && isAccentBeat(i) && styles.beatDotAccentActive,
                    ]}
                  />
                ))}
              </View>

              <IconButton
                icon="bookmark-outline"
                mode="contained-tonal"
                iconColor="#94a3b8"
                containerColor="#334155"
                onPress={recordMetronome}
                style={styles.recordButton}
                size={20}
              />
            </Card.Content>
          </Card>

          <View style={styles.bpmControls}>
            <IconButton
              icon="minus"
              mode="contained"
              onPress={() => adjustBpm(-1)}
              size={28}
            />
            <IconButton
              icon="plus"
              mode="contained"
              onPress={() => adjustBpm(1)}
              size={28}
            />
          </View>

          <View style={styles.metronomeActions}>
            <Button
              mode="outlined"
              onPress={toggleBeats}
              style={styles.beatsButton}
            >
              {beats}拍子
            </Button>
            <Button
              mode="outlined"
              onPress={resetBarCount}
              style={styles.resetButton}
            >
              リセット
            </Button>
          </View>

          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={() => setIsMetronomeRunning(!isMetronomeRunning)}
              style={[styles.mainButton, isMetronomeRunning && styles.stopButton]}
              contentStyle={styles.mainButtonContent}
              icon={isMetronomeRunning ? 'stop' : 'play'}
            >
              {isMetronomeRunning ? 'ストップ' : 'スタート'}
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}

// WAVサウンド生成ヘルパー
const generateWavHeader = (dataLength: number, sampleRate: number = 22050): number[] => {
  const header = [];
  const totalLength = 44 + dataLength;

  // RIFF header
  header.push(0x52, 0x49, 0x46, 0x46); // "RIFF"
  pushInt32LE(header, totalLength - 8);
  header.push(0x57, 0x41, 0x56, 0x45); // "WAVE"

  // fmt chunk
  header.push(0x66, 0x6D, 0x74, 0x20); // "fmt "
  pushInt32LE(header, 16); // chunk size
  pushInt16LE(header, 1); // PCM format
  pushInt16LE(header, 1); // mono
  pushInt32LE(header, sampleRate);
  pushInt32LE(header, sampleRate); // byte rate (8-bit mono)
  pushInt16LE(header, 1); // block align
  pushInt16LE(header, 8); // bits per sample

  // data chunk
  header.push(0x64, 0x61, 0x74, 0x61); // "data"
  pushInt32LE(header, dataLength);

  return header;
};

const pushInt16LE = (arr: number[], value: number) => {
  arr.push(value & 0xFF, (value >> 8) & 0xFF);
};

const pushInt32LE = (arr: number[], value: number) => {
  arr.push(value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF);
};

const arrayToBase64 = (bytes: number[]): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const generateNormalBeep = (): string => {
  const sampleRate = 22050;
  const duration = 0.035; // 35ms
  const frequency = 620;
  const samples = Math.floor(sampleRate * duration);
  const data: number[] = [];

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 55);
    const value = Math.sin(2 * Math.PI * frequency * t) * 0.6 * envelope;
    data.push(Math.floor((value + 1) * 127.5));
  }

  const header = generateWavHeader(data.length, sampleRate);
  return arrayToBase64([...header, ...data]);
};

const generateAccentBeep = (): string => {
  const sampleRate = 22050;
  const duration = 0.045; // 45ms
  const frequency = 900;
  const samples = Math.floor(sampleRate * duration);
  const data: number[] = [];

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 45);
    const value = Math.sin(2 * Math.PI * frequency * t) * 0.75 * envelope;
    data.push(Math.floor((value + 1) * 127.5));
  }

  const header = generateWavHeader(data.length, sampleRate);
  return arrayToBase64([...header, ...data]);
};

const generateTimerEndBeep = (): string => {
  const sampleRate = 22050;
  const duration = 0.8;
  const samples = Math.floor(sampleRate * duration);
  const data: number[] = [];

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    // 3拍のビープ音
    const beepPhase = (t * 3) % 1;
    const isOn = beepPhase < 0.4;
    const frequency = 1000;
    const envelope = isOn ? 1 : 0;
    const value = Math.sin(2 * Math.PI * frequency * t) * 0.8 * envelope;
    data.push(Math.floor((value + 1) * 127.5));
  }

  const header = generateWavHeader(data.length, sampleRate);
  return arrayToBase64([...header, ...data]);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
    padding: 16,
  },
  segmentedButtons: {
    marginBottom: 12,
  },
  feedbackButton: {
    marginBottom: 16,
    alignSelf: 'center',
  },
  workoutDurationText: {
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
    alignSelf: 'center',
    marginBottom: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  timerCard: {
    backgroundColor: darkTheme.colors.surface,
    width: '100%',
    marginBottom: 24,
    minHeight: 260,
  },
  timerContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  metronomeContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  timerDisplay: {
    fontSize: 72,
    fontWeight: '200',
    color: darkTheme.colors.primary,
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 16,
    color: darkTheme.colors.onSurfaceVariant,
    marginTop: 8,
  },
  recordButton: {
    marginTop: 12,
  },
  bpmDisplay: {
    fontSize: 80,
    fontWeight: '200',
    color: darkTheme.colors.primary,
  },
  bpmLabel: {
    fontSize: 18,
    color: darkTheme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  barCountLabel: {
    marginTop: 8,
    fontSize: 14,
    color: darkTheme.colors.onSurfaceVariant,
  },
  beatIndicators: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  beatDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: darkTheme.colors.surfaceVariant,
  },
  beatDotActive: {
    backgroundColor: darkTheme.colors.primary,
    transform: [{ scale: 1.3 }],
  },
  beatDotAccent: {
    backgroundColor: darkTheme.colors.secondary,
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  beatDotAccentActive: {
    backgroundColor: '#f59e0b',
    transform: [{ scale: 1.4 }],
  },
  bpmControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  metronomeActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  beatsButton: {
    marginBottom: 0,
    flex: 1,
  },
  resetButton: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 'auto' as any,
    paddingTop: 16,
    width: '100%',
  },
  mainButton: {
    flex: 1,
    backgroundColor: darkTheme.colors.primary,
  },
  mainButtonContent: {
    paddingVertical: 12,
  },
  stopButton: {
    backgroundColor: darkTheme.colors.error,
  },
  sectionTitle: {
    fontSize: 16,
    color: darkTheme.colors.onSurfaceVariant,
    marginBottom: 12,
    alignSelf: 'center',
  },
  intervalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intervalButton: {
    minWidth: 70,
  },
  intervalAdjustControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
});
