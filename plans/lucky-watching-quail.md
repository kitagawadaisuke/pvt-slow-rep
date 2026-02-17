# 実装プラン: UI改善 + 累計統計拡張 + IME修正

## Context
ユーザーから以下のフィードバックがあった：
- 筋トレ時間の表記が左寄り → 中央にすべき
- タイマー画面のインターバル/メトロノーム切替時にカードサイズ・ボタン位置がずれる
- 筋トレ時間を履歴の「トレーニング内容」と累計に反映させたい
- 累計に有酸素・BODYCOMBAT・LEAPFIGHT・BODYPUMPの時間も表示したい
- カスタム種目を削除できるようにしたい
- カスタム種目名の入力でかな漢字変換ができない（3回目の報告、最重要）

---

## 修正1: 筋トレ時間の表記を中央寄せ
**ファイル:** `app/(tabs)/index.tsx`

- `workoutTimerContainer` に `alignItems: 'center'` 追加
- `workoutTimerButtons` に `width: '100%'` 追加（ボタンが全幅を使うように）

---

## 修正2: タイマー画面のカードサイズ・ボタン位置統一
**ファイル:** `app/(tabs)/timer.tsx`

- `timerCard` に `minHeight: 260` を設定し、両モードで同じカードサイズに
- `timerContent` (interval) の paddingVertical を 40→32 に変更して metronomeContent と統一
- 両方に `flex: 1`, `justifyContent: 'center'` を追加
- `buttonRow` の `marginTop` を 16→`'auto'` に変更し、常に下部に固定

---

## 修正3: 筋トレ時間を履歴の「トレーニング内容」に表示
**ファイル:** `app/(tabs)/history.tsx`

- summaryTitle の後に `durationSeconds > 0` の場合「筋トレ時間」行を追加
- bodypump/bodycombat/leapfight の時間表示も追加（durationMinutes を使用）
- カスタム種目のセット数・回数も表示（customExercises を使用）

---

## 修正4+5: 累計に筋トレ時間・有酸素/スタジオ時間を追加
**ファイル:** `app/(tabs)/settings.tsx`

- `yearlyStats` / `monthlyStats` に `totalDurationSeconds` と `totalExerciseDurationMinutes` を追加
- `formatDurationHM` ヘルパー関数を追加（秒→「X時間Y分」形式）
- statsGrid に「筋トレ時間」「有酸素・スタジオ」の2項目を追加
- statsGrid に `flexWrap: 'wrap'`, statItem に `minWidth: '30%'` を追加（5項目対応）

---

## 修正6: カスタム種目の削除機能
**ファイル:** `app/(tabs)/index.tsx`

- `removeCustomExercise` は store に既存（workoutStore.ts:497-501）
- `Alert` を react-native から追加インポート
- 種目選択ダイアログ内のカスタム種目ボタンの横にゴミ箱アイコンを追加
- 削除前に `Alert.alert` で確認ダイアログを表示

---

## 修正7: カスタム種目名のかな漢字変換（最重要）
**ファイル:** `app/(tabs)/index.tsx`

**根本原因:** React Native の TextInput で `value` prop を使った制御コンポーネントは、iOS の IME 変換状態（markedText）をリセットしてしまう。`onChangeText` で state 更新 → 再レンダリング → `value` 再適用で変換候補がキャンセルされる。

**解決策:** `value` prop を削除し、`defaultValue` + ref ベースの非制御コンポーネントに変更

1. `customExerciseNameRef = useRef('')` でテキスト値を保持（再レンダリングなし）
2. `customExerciseNameEmpty` state はボタン無効化チェック用のみ（boolean だけ更新）
3. `defaultValue=""` で初期値設定（Dialogのmount/unmountで自動リセット）
4. `handleAddCustomExercise` で ref から値を読み取り

```typescript
// 値を ref で保持（再レンダリングを発生させない）
const customExerciseNameRef = useRef('');
const [customExerciseNameEmpty, setCustomExerciseNameEmpty] = useState(true);

// TextInput は非制御（value prop なし）
<RNTextInput
  defaultValue=""
  onChangeText={(text) => {
    customExerciseNameRef.current = text;
    const isEmpty = !text.trim();
    setCustomExerciseNameEmpty(prev => prev !== isEmpty ? isEmpty : prev);
  }}
  ...
/>

// 追加ボタンの disabled チェック
<Button disabled={customExerciseNameEmpty}>追加</Button>

// 保存時は ref から読み取り
const name = customExerciseNameRef.current.trim();
```

---

## 修正対象ファイル一覧

| ファイル | 修正内容 |
|---------|---------|
| `app/(tabs)/index.tsx` | #1 中央寄せ, #6 カスタム種目削除, #7 IME修正 |
| `app/(tabs)/timer.tsx` | #2 カードサイズ統一 |
| `app/(tabs)/history.tsx` | #3 トレーニング内容に時間表示 |
| `app/(tabs)/settings.tsx` | #4+5 累計に時間追加 |

**store/type 変更なし** - 必要な関数・型は全て既存

---

## 実装順序
1. 修正7（IME修正）← 最重要、早めに確認
2. 修正1（中央寄せ）← 簡単
3. 修正2（タイマーカード統一）
4. 修正6（カスタム種目削除）
5. 修正3（履歴にトレーニング時間表示）
6. 修正4+5（累計に時間追加）

---

## 検証方法
- iPhoneでアプリを再読み込みし、カスタム種目追加ダイアログでフリック入力→漢字変換ができることを確認
- タイマー画面でインターバル/メトロノーム切替時にカードとスタートボタンの位置がずれないことを確認
- トレーニング記録後、履歴画面の「トレーニング内容」に筋トレ時間が表示されることを確認
- 設定画面の累計に筋トレ時間と有酸素/スタジオ時間が表示されることを確認
- カスタム種目のゴミ箱アイコンをタップし、確認ダイアログ後に削除できることを確認
