# 月次日常点検表アプリ

スマホから運送会社の月次日常点検表を入力するための初版です。  
Excelの点検項目構成に合わせて、車番と運転者ごとに未入力日だけを表示し、送信時にFirebaseへ保存する前提で作っています。

## 実装済み

- 最初の画面で `車番` と `運転者（点検者）` を入力
- 最初の画面に摘要を表示
- `点検開始` で入力画面へ切り替え
- Excel準拠の全点検項目を表示
- `空欄 → レ → × → ▲ → 空欄` の順でタップ切替
- その月の未入力日だけを表示
- 前月以前の未完了月があれば先に表示
- 右方向の横スクロールに対応
- 運行管理者印・整備管理者印の欄は未実装
- 送信時に Firestore 保存
- Firebase 未設定時はローカル保存で画面確認可能

## ファイル

- `index.html`: 画面
- `styles.css`: スタイル
- `app.js`: 画面ロジック、未入力日判定、保存処理
- `firebase-config.js`: Firebase設定

## 起動方法

ブラウザで直接 `index.html` を開くより、簡易サーバーで開く方が確実です。

```powershell
py -m http.server 8080
```

その後、`http://localhost:8080` を開いてください。

## Firebase設定

`firebase-config.js` の各値を、使う Firebase プロジェクトの設定値に置き換えてください。

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

保存先コレクション名は `firebase-config.js` の `collectionName` で変更できます。

## Firestoreの保存構造

コレクション: `monthlyInspectionEntries`

ドキュメントの主な内容:

- `month`: `YYYY-MM`
- `vehicle`: 車番
- `driver`: 運転者
- `checksByDay`: 日付ごとの点検結果

## 現在の制限

- Excelファイルへの直接書き戻しは未実装です
- 認証、ユーザー管理、管理者画面は未実装です
- 過去の複数未完了月は、古い月から順に表示します
