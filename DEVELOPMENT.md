# 📱 アプリの起動方法

## これだけ覚えてください

VSCodeのターミナルで：コマンドプロトコル

```bash

```
npx expo start --tunnel

このコマンドを実行すると、ターミナルにQRコードが表示されます。

iPhoneの「Expo Go」アプリでQRコードをスキャンすれば、アプリが起動します。

---

## 初めての場合

1. iPhoneのApp Storeで「Expo Go」をインストール
2. 上記のコマンドを実行
3. QRコードをスキャン

以上です！
---

## ビルド & リリース

### iOS ビルド（TestFlight 経由）

```bash
eas build --profile production --platform ios
```

### App Store Connect へ提出

```bash
eas submit --platform ios
```

ビルド完了後に実行 → 「Select a build from EAS」を選択。
TestFlight でビルドが処理されるまで数分〜数十分かかる。

---

## TestFlight テスター募集

### 個別招待（知り合い向け）

1. appstoreconnect.apple.com → アプリ選択 → 「TestFlight」タブ
2. 「外部テスト」の「+」でグループ作成
3. テスターのメールアドレスを追加 → ビルドを割り当て → 送信
4. 相手側：招待メール → TestFlight アプリをインストール → 承認 → インストール

### パブリックリンク（不特定多数向け・最大10,000人）

1. App Store Connect → TestFlight → 外部テストグループ
2. 「パブリックリンクを有効にする」をオン
3. 生成された `testflight.apple.com/join/xxxxx` のリンクを共有
4. ※ 初回は Apple の審査あり（24〜48時間）

### テスター募集先

- **Reddit** - r/TestFlight, r/iOSBeta, r/fitness
- **X (Twitter)** - `#TestFlight` `#betaapp` ハッシュタグ
- **BetaFamily** (betafamily.com) - テスター募集サイト
- **BetaPage** (betapage.co) - ベータ版アプリ掲載サイト
- **Product Hunt** - 「Coming Soon」として掲載

### ポイント

- アプリの説明とスクリーンショットを添えると反応が良い
- フィードバック用の連絡先（メールやGoogleフォーム等）を用意する
- パブリックリンクは人数上限を設定できる

---

## TestFlight フィードバック確認

appstoreconnect.apple.com にログイン
「マイ App」→「Workout Tracker」を選択
「TestFlight」タブをクリック
左メニューの「フィードバック」または「クラッシュ」
