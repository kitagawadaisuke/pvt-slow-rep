import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Vibration } from 'react-native';
import { Text, Button, SegmentedButtons, Card, IconButton } from 'react-native-paper';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { deactivateKeepAwake, activateKeepAwake } from 'expo-keep-awake';
import { useWorkoutStore } from '@/stores/workoutStore';
import { darkTheme } from '@/constants/theme';
import { FeedbackMode } from '@/types/workout';

export default function TimerScreen() {
  const {
    timerSettings,
    updateTimerSettings,
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
  // タイミング精度向上のためにrefでビートを管理
  const currentBeatRef = useRef(0);
  const beatsRef = useRef(beats);

  // カウントダウン
  const [countdownSeconds, setCountdownSeconds] = useState(0); // 0=なし
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // メトロノーム連携（インターバル残り10秒でメトロノーム準備カウントダウン自動開始）
  const [metronomeLink, setMetronomeLink] = useState(false);
  const metronomeLinkTriggeredRef = useRef(false);

  // Feedback mode
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>(timerSettings.feedbackMode || 'both');

  // Audio
  const soundRef = useRef<Audio.Sound | null>(null);
  const clickSoundRef = useRef<Audio.Sound | null>(null);
  const accentSoundRef = useRef<Audio.Sound | null>(null);

  const intervalOptions = [30, 60, 90];

  useEffect(() => {
    beatsRef.current = beats;
  }, [beats]);

  // タイマーまたはメトロノーム動作中はスリープ防止
  useEffect(() => {
    if (isRunning || isMetronomeRunning || isCountingDown) {
      activateKeepAwake();
    } else {
      deactivateKeepAwake();
    }
    return () => deactivateKeepAwake();
  }, [isRunning, isMetronomeRunning, isCountingDown]);

  useEffect(() => {
    setupAudio();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (metronomeRef.current) clearInterval(metronomeRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
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
            setIsCountingDown(false);
            if (metronomeLink) {
              // メトロノーム連携: カウントダウンから直接メトロノーム開始
              setIsMetronomeRunning(true);
              setMode('metronome');
              resetBarCount();
            }
            playTimerEnd();
            metronomeLinkTriggeredRef.current = false;
            return intervalTime;
          }
          const nextRemaining = prev - 1;
          // メトロノーム連携: 残り10秒でカウントダウン自動開始
          if (metronomeLink && nextRemaining === 10 && !metronomeLinkTriggeredRef.current) {
            metronomeLinkTriggeredRef.current = true;
            setCountdownRemaining(10);
            setIsCountingDown(true);
          }
          // 残り10秒以下でビープ音
          if (nextRemaining <= 10 && nextRemaining > 0) {
            if (nextRemaining <= 3) {
              const enNums = ['One', 'Two', 'Three'];
              Speech.speak(enNums[nextRemaining - 1], { language: 'en-US', rate: 1.1, pitch: 1.05 });
              playBeep(true);
            } else {
              playBeep(false);
            }
          }
          // メトロノーム連携カウントダウン表示を同期
          if (metronomeLinkTriggeredRef.current && nextRemaining <= 10) {
            setCountdownRemaining(nextRemaining);
            if (nextRemaining <= 0) {
              setIsCountingDown(false);
            }
          }
          return nextRemaining;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, intervalTime, playTimerEnd, playBeep, metronomeLink]);

  // Metronome Logic（refでビートを管理しタイミング精度を向上）
  useEffect(() => {
    if (isMetronomeRunning) {
      // beats-1 から始めることで最初のtickがbeat 0（アクセント）になる
      currentBeatRef.current = beatsRef.current - 1;
      const intervalMs = (60 / bpm) * 1000;
      metronomeRef.current = setInterval(() => {
        const nextBeat = (currentBeatRef.current + 1) % beatsRef.current;
        currentBeatRef.current = nextBeat;
        const isAccent = nextBeat === 0 || (beatsRef.current === 8 && nextBeat === 4);
        // playBeepをstate setter外で直接呼び出し（タイミング精度向上）
        playBeep(isAccent);

        if (nextBeat === beatsRef.current - 1) {
          // 小節の最後のビートでセット数を読み上げ
          setBarCount((prevBars) => {
            const newBarCount = prevBars + 1;
            Speech.speak(`${newBarCount}`, { language: 'en-US', rate: 1.1, pitch: 1.05 });
            return newBarCount;
          });
        }

        setCurrentBeat(nextBeat);
      }, intervalMs);
    } else {
      if (metronomeRef.current) clearInterval(metronomeRef.current);
      currentBeatRef.current = 0;
      setCurrentBeat(0);
    }

    return () => {
      if (metronomeRef.current) clearInterval(metronomeRef.current);
    };
  }, [isMetronomeRunning, bpm, playBeep]);

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
    metronomeLinkTriggeredRef.current = false;
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
    currentBeatRef.current = 0;
  };

  const startMetronomeWithCountdown = () => {
    if (countdownSeconds > 0) {
      setCountdownRemaining(countdownSeconds);
      setIsCountingDown(true);
      countdownRef.current = setInterval(() => {
        setCountdownRemaining((prev) => {
          if (prev - 1 > 0) {
            if (prev - 1 <= 3) {
              // ラスト3秒は読み上げ + アクセント音
              const enNumbers = ['One', 'Two', 'Three'];
              Speech.speak(enNumbers[prev - 2], { language: 'en-US', rate: 1.1, pitch: 1.05 });
              playBeep(true);
            } else if (prev - 1 <= 10) {
              // 10秒前からビープ音
              playBeep(false);
            }
          }
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            setIsCountingDown(false);
            setIsMetronomeRunning(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setIsMetronomeRunning(true);
    }
  };

  const stopMetronome = () => {
    if (isCountingDown) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setIsCountingDown(false);
      setCountdownRemaining(0);
    } else {
      setIsMetronomeRunning(false);
    }
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

      <View style={styles.content}>
        {/* カード（固定高さで両モード統一） */}
        {mode === 'interval' ? (
          <Card style={styles.timerCard}>
            <View style={styles.timerContent}>
              <Text style={styles.timerDisplay}>{formatTime(remainingTime)}</Text>
              <Text style={styles.timerLabel}>
                {isRunning
                  ? isCountingDown && remainingTime <= 10
                    ? `メトロノーム準備 ${remainingTime}`
                    : '残り時間'
                  : '設定時間'}
              </Text>
              {metronomeLink && !isRunning && (
                <Text style={styles.metronomeLinkHint}>🎵 残り10秒でメトロノーム開始</Text>
              )}
              <IconButton
                icon="bookmark-outline"
                mode="contained-tonal"
                iconColor="#94a3b8"
                containerColor="#334155"
                onPress={recordIntervalTime}
                style={styles.recordButton}
                size={20}
              />
            </View>
          </Card>
        ) : (
          <Card style={styles.timerCard}>
            <View style={styles.metronomeContent}>
              {isCountingDown ? (
                <>
                  <Text style={styles.countdownDisplay}>{countdownRemaining}</Text>
                  <Text style={styles.bpmLabel}>準備中...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.bpmDisplay}>{bpm}</Text>
                  <Text style={styles.bpmLabel}>BPM</Text>
                  <Text style={styles.barCountLabel}>セット数: {barCount}</Text>
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
                </>
              )}
            </View>
          </Card>
        )}

        {/* モード固有オプション（固定高さで位置を安定化） */}
        <View style={styles.modeOptions}>
          {mode === 'interval' ? (
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
              <Button
                mode={metronomeLink ? 'contained' : 'outlined'}
                onPress={() => setMetronomeLink(!metronomeLink)}
                style={styles.intervalButton}
                compact
                icon="metronome"
              >
                連携
              </Button>
            </View>
          ) : (
            <View style={styles.metronomeOptions}>
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
              <View style={styles.countdownRow}>
                <Text style={styles.countdownSettingLabel}>準備</Text>
                {[0, 10, 15, 20].map((sec) => (
                  <Button
                    key={sec}
                    mode={countdownSeconds === sec ? 'contained' : 'outlined'}
                    onPress={() => setCountdownSeconds(sec)}
                    style={styles.countdownOptionButton}
                    compact
                  >
                    {sec === 0 ? 'なし' : `${sec}s`}
                  </Button>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* +-ボタン（スタートの直上・共通） */}
        <View style={styles.adjustControls}>
          <IconButton
            icon="minus"
            mode="contained"
            onPress={mode === 'interval' ? () => adjustIntervalTime(-10) : () => adjustBpm(-1)}
            size={28}
          />
          <IconButton
            icon="plus"
            mode="contained"
            onPress={mode === 'interval' ? () => adjustIntervalTime(10) : () => adjustBpm(1)}
            size={28}
          />
        </View>

        {/* スタートボタン（常に最下部・固定高さ） */}
        <View style={styles.buttonRow}>
          {mode === 'interval' ? (
            isRunning ? (
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
                  mode="contained-tonal"
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
            )
          ) : (
            <Button
              mode="contained"
              onPress={isMetronomeRunning || isCountingDown ? stopMetronome : startMetronomeWithCountdown}
              style={[styles.mainButton, (isMetronomeRunning || isCountingDown) && styles.stopButton]}
              contentStyle={styles.mainButtonContent}
              icon={isMetronomeRunning || isCountingDown ? 'stop' : 'play'}
            >
              {isMetronomeRunning ? 'ストップ' : isCountingDown ? 'キャンセル' : 'スタート'}
            </Button>
          )}
        </View>
      </View>
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
  // Eメジャートライアド上昇チャイム（E5→G#5→B5）
  const sampleRate = 22050;
  const duration = 1.5;
  const samples = Math.floor(sampleRate * duration);
  const data: number[] = [];

  const tones = [
    { freq: 659.3, delay: 0.0, amp: 0.65 },   // E5
    { freq: 830.6, delay: 0.45, amp: 0.65 },   // G#5
    { freq: 987.8, delay: 0.90, amp: 0.75 },   // B5
  ];

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    let value = 0;
    for (const tone of tones) {
      if (t >= tone.delay) {
        const localT = t - tone.delay;
        const envelope = Math.exp(-localT * 3.5) * tone.amp;
        value += Math.sin(2 * Math.PI * tone.freq * localT) * envelope;
        value += Math.sin(2 * Math.PI * tone.freq * 2 * localT) * envelope * 0.15;
      }
    }
    const clipped = Math.max(-1, Math.min(1, value));
    data.push(Math.floor((clipped + 1) * 127.5));
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
    marginBottom: 16,
    height: 260,
  },
  timerContent: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metronomeContent: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeOptions: {
    height: 88,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 8,
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
  metronomeLinkHint: {
    fontSize: 12,
    color: darkTheme.colors.primary,
    marginTop: 6,
  },
  bpmDisplay: {
    fontSize: 68,
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
    marginTop: 12,
    gap: 10,
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
  adjustControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metronomeOptions: {
    width: '100%',
    gap: 6,
  },
  metronomeActions: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  beatsButton: {
    marginBottom: 0,
    flex: 1,
  },
  resetButton: {
    flex: 1,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  countdownSettingLabel: {
    fontSize: 12,
    color: darkTheme.colors.onSurfaceVariant,
    marginRight: 2,
  },
  countdownOptionButton: {
    flex: 1,
    minWidth: 0,
  },
  countdownDisplay: {
    fontSize: 80,
    fontWeight: '200',
    color: darkTheme.colors.secondary,
    fontVariant: ['tabular-nums'],
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
    width: '100%',
  },
  mainButton: {
    flex: 1,
    backgroundColor: darkTheme.colors.primary,
  },
  mainButtonContent: {
    paddingVertical: 8,
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
    width: '100%',
  },
  intervalButton: {
    minWidth: 70,
  },
});
