# 文化祭 来場者数カウンター

GitHub Pagesの静的ページと Firebase Authentication / Realtime Database で動作します。Cloud Functionsは使いません。

## Firebase 初期設定

1. Firebase ConsoleでWebアプリとRealtime Databaseを作成します。
2. Firebaseのプロジェクト設定に表示された `apiKey` と `appId` を `firebase-config.js` に入力します。プロジェクトIDとRealtime Database URLは入力済みです。Web API keyは秘密鍵ではありません。Security Rulesでアクセスを制限します。
3. Authenticationでメール/パスワードを有効にし、管理者ユーザーを作成します。このメールとパスワードはカウント係用です。来場者はログイン不要です。
4. Authentication → Users から管理者のUIDを確認します。現在の管理者UIDは `firebase-config.js` に設定済みです。別アカウントに変更する場合は `adminUid` と `database.rules.json` のUIDを同じ値に変更してください。
5. Realtime Database → Rulesを開き、`database.rules.json` の内容を貼り付けて「公開」します。未ログイン利用者は読み取りのみ、指定UIDの管理者だけが書き込みできます。

## GitHub Pages 公開

このフォルダーの中身を公開リポジトリのルートに置きます。GitHubの Settings → Pages で `main` ブランチ、`/(root)` を公開元に選びます。カウント用ページは `index.html`、表示用ページは `display.html` です。

## 運用

- カウント係は `index.html` で管理者アカウントにログインし、+1または確認付きリセットを実行します。
- 来場者向け端末は `display.html` を開きます。ログインや個人情報の入力は不要です。
- 加算とリセットはRealtime Databaseのトランザクションです。Firebase側のSecurity RulesがUIDを検証します。
- 管理者アカウントを作り直した場合は、新しいUIDに合わせて `firebase-config.js` と `database.rules.json` を更新し、Rulesを再公開してください。

## 公開前の確認

表示ページで0が出ること、管理者ログイン後に加算・リセットが反映されること、複数端末の同時加算でも合計が合うこと、未ログイン利用者の書き込みが拒否されることを確認してください。
