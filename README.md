# CosmicWeave

## 環境変数の設定方法

このプロジェクトでは、Supabase 認証情報などの機密情報を.env ファイルで管理しています。

### 開発環境のセットアップ

1. プロジェクトのルートディレクトリ（Cosmic-Weave ディレクトリ）に`.env`ファイルを作成します
2. 以下の環境変数を設定します：

```
SUPABASE_URL=あなたのSupabase URL
SUPABASE_KEY=あなたのSupabase Key
```

3. 環境変数ファイルから JavaScript を生成します：

```bash
cd flontend
node generate-env.js
```

このコマンドは`flontend/src/env.js`ファイルを生成します。これはブラウザから環境変数にアクセスするために使用されます。

### 本番環境での使用

本番環境では、環境変数を適切に設定し、デプロイ前に環境変数ファイルを生成することをお勧めします。

## 注意

- `.env`ファイルを決してバージョン管理システムにコミットしないでください
- 機密情報が漏洩しないように注意してください
