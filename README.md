# 文化祭 来場者数カウンター

GitHub Pagesの静的ページと Firebase Authentication / Realtime Database で動作します。Cloud Functionsを使わないため、Cloud Functionsを理由にBlazeプランへ変更する必要はありません。Firebaseの各サービスの無償枠・条件は変更される場合があるので、公開前に料金ページを確認してください。

## Firebase 初期設定

1. Firebase Consoleでプロジェクトを作成します。
2. プロジェクト設定 → 全般 → Webアプリを登録し、表示された値を `firebase-config.js` に設定します。Web API keyは秘密鍵ではありません。アクセス制御はSecurity Rulesで行います。
3. Authenticationでメール/パスワードを有効にし、Usersから管理者ユーザーを作成します。
4. Authentication → Settings → Authorized domains に `<ユーザー名>.github.io` を追加します。
5. Realtime Databaseを作成し、コンソールに表示されたURLを `firebase-config.js` の `databaseURL` に設定します。
6. Node.js 20以降とFirebase CLIを用意し、このフォルダーで実行します。

   ```powershell
   npm install -g firebase-tools
   firebase login
   Copy-Item .firebaserc.example .firebaserc
   # .firebaserc のプロジェクトIDを実際の値に編集
   ```

7. 管理者ユーザーに管理者カスタムクレームを付けます。Google Cloud CLIのローカル認証を使い、サービスアカウント秘密鍵はリポジトリに置きません。

   ```powershell
   $env:GCLOUD_PROJECT = "YOUR_PROJECT_ID"
   gcloud auth application-default login
   cd tools
   npm install
   node set-admin.js "管理者のFirebase Auth UID"
   cd ..
   ```

   UIDはFirebase ConsoleのAuthentication → Usersで確認します。権限付与後は管理者がログアウトして再ログインしてください。解除は `node set-admin.js <UID> --revoke` です。

8. Security Rulesをデプロイします。

   ```powershell
   firebase deploy --only database
   ```

## GitHub Pages 公開

このフォルダーを既存リポジトリに追加（例: `visitor-counter/`）し、`firebase-config.js` を設定してコミット・pushします。GitHubの Settings → Pages で公開ブランチとフォルダーを選びます。カウント用URLは `/visitor-counter/index.html`、表示用URLは `/visitor-counter/display.html` です。

## 動作と権限

- カウント係は `index.html` で管理者ログインし、+1または確認付きリセットを行います。
- 表示端末は `display.html` を開きます。未ログインの閲覧者は人数の読み取りのみ可能です。
- 加算とリセットはRealtime Databaseのトランザクションです。Firebase側のSecurity Rulesが書き込みごとに管理者クレームを検証します。Firebase Security Rulesはサーバー側でアクセスを判定します。
- 管理者にはデータベースへの書き込み権限があるため、通常のボタン以外の変更もできます。管理者アカウントは信頼できる担当者だけに発行してください。

## 公開前の確認

1. 表示ページで初期値0が表示される。
2. 管理者の+1とリセットが別端末にも反映される。
3. 複数端末の同時加算と連打で合計が合う。
4. 未ログインユーザーまたは管理者権限のないユーザーの書き込みが拒否される。
5. リセット確認をキャンセルすると値が変わらない。

Firebaseプロジェクト作成前のため、実環境のデプロイと端末間接続は未確認です。