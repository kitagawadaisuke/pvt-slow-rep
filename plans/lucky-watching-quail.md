# 実装プラン: TestFlight 配布準備

## Context
Apple Developer アカウント登録済み。EAS Build を使って iOS 向けビルドを作成し、TestFlight で配布できるようにする。

- Bundle ID: `com.d.workouttracker`
- Expo SDK: 54 / React Native 0.81.5
- 現状: `bundleIdentifier` 未設定、`eas.json` 未作成

---

## 変更1: app.json に bundleIdentifier を追加

**ファイル:** `app.json`

```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.d.workouttracker"
}
```

---

## 変更2: eas.json を新規作成

**ファイル:** `eas.json`（プロジェクトルートに新規）

```json
{
  "cli": {
    "version": ">= 14.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## ビルド・配布の手順（コマンド）

ファイル変更後、以下をターミナルで実行：

```bash
# 1. EAS CLI をグローバルインストール
npm install -g eas-cli

# 2. Expo アカウントでログイン
eas login

# 3. EAS プロジェクトに紐付け
eas build:configure

# 4. iOS ビルド（初回は証明書を自動生成・登録）
eas build --platform ios --profile production

# 5. App Store Connect に提出（ビルド完了後）
eas submit --platform ios --latest
```

---

## App Store Connect での操作（ブラウザ）

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) にログイン
2. 「マイ App」→「+」→「新規 App」を作成
   - 名前: Workout Tracker
   - Bundle ID: com.d.workouttracker
   - SKU: workouttracker001（任意）
3. 「TestFlight」タブ → アップロードされたビルドを選択
4. 「内部テスト」に自分のメールを追加
5. TestFlight アプリからインストール

---

## 注意点
- ビルド時に Apple Developer ログインを求められる（eas が自動処理）
- 初回ビルドは証明書と Provisioning Profile を自動生成（数分かかる）
- EAS クラウドビルドのため Mac は不要
- TestFlight 配布前に Apple の審査は不要（内部テストの場合）

---

## 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app.json` | `ios.bundleIdentifier` 追加 |
| `eas.json` | 新規作成（ビルドプロファイル定義） |
