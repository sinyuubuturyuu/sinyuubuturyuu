# driver-points

ポイント付与機能を既存処理から切り離すための独立フォルダーです。

- `driver-points.js`
  送信時のポイント加算、Firebase 保存、ランチャー上のポイント表示、設定 ON/OFF をまとめています。

削除する場合は次の読み込みだけ外せば動作停止できます。

- `/index.html`
- `/getujinitijyoutenkenhyou/index.html`
- `/getjityretenkenhyou/index.html`
