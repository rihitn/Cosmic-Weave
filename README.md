# Cosmic Weave

> ウェブサイトを3D空間の星座として可視化するサービス

[![Frontend](https://img.shields.io/badge/Frontend-Cloud%20Run-4285F4?logo=googlecloud)](https://frontend-604389536871.us-central1.run.app/)

## 概要

Cosmic Weave は、登録したウェブサイトを **3D宇宙空間の星** として表示するビジュアライゼーションサービスです。

AIがサイトの内容を解析し、**内容が似ているサイトほど近くに配置**されます。
星を眺めることで、ウェブ上の知識の繋がりを直感的に把握できます。

![screenshot](https://frontend-604389536871.us-central1.run.app/CosmicWeaveLogo.png)

---

## 主な機能

| 機能 | 説明 |
|---|---|
| **3D星座ビュー** | Three.js による3D空間でサイトを星として表示。ドラッグで回転、スクロールでズーム |
| **類似度配置** | OpenAI Embedding + MDS で類似サイトを近くに配置 |
| **URL追加** | 単体追加・一括追加（複数URLをまとめて登録）に対応 |
| **検索** | キーワードでサイトを検索、該当の星をハイライト |
| **お気に入り** | 星をお気に入り登録すると金色でパルス表示。自分で解除しない限り削除不可 |
| **Googleログイン** | Supabase Auth による Google OAuth 認証 |
| **URL重複チェック** | 入力中にリアルタイムで重複確認 |

---

## アーキテクチャ

```
┌──────────────────────────────────────────────────────┐
│  Frontend (Vite + Three.js)  Cloud Run / us-central1 │
│  - 3D描画 (Three.js + WebGL)                         │
│  - 認証 (Supabase Auth / Google OAuth)               │
│  - データ取得 (Supabase JS Client)                   │
└─────────────────────┬────────────────────────────────┘
                      │ POST /process_pipeline
┌─────────────────────▼────────────────────────────────┐
│  Backend (Flask)            Cloud Run / asia-northeast1│
│  1. main.py       URLからタイトル・本文をスクレイピング│
│  2. embedding.py  OpenAI Embedding でベクトル化        │
│  3. similarity.py コサイン距離 + MDS で3D座標計算      │
└─────────────────────┬────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────┐
│  Supabase (PostgreSQL)                                │
│  - websites テーブル (url, title, content,            │
│                       embedding, mds_coordinates)     │
│  - favorites テーブル (user_id, website_id)           │
└──────────────────────────────────────────────────────┘
```

### パイプライン処理の流れ

```
URL登録
  → main.py     : HTML取得・タイトル/本文をスクレイピング → Supabase保存
  → embedding.py: OpenAI text-embedding-3-small でベクトル化（バッチ処理）
  → similarity.py: 全サイト間のコサイン距離を計算 → MDS で3D座標に変換
  → フロントエンドが座標を読み取り、星として描画
```

---

## 技術スタック

### Frontend
- **Three.js** — 3D描画・WebGL
- **Vite** — バンドラー
- **Supabase JS** — DB・認証クライアント

### Backend
- **Flask** — API サーバー
- **OpenAI API** (`text-embedding-3-small`) — テキストベクトル化
- **scikit-learn** — MDS（多次元尺度法）による座標計算
- **BeautifulSoup4** — Webスクレイピング

### Infrastructure
- **Google Cloud Run** — コンテナホスティング
- **Google Cloud Build** — CI/CD
- **Supabase** — PostgreSQL データベース・認証

---

## ローカル開発

### 必要なもの
- Node.js 18+
- Python 3.11+
- Supabase プロジェクト
- OpenAI API キー

### セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/YOUR_USERNAME/Cosmic-Weave.git
cd Cosmic-Weave

# フロントエンド
cd frontend
cp .env.example .env   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY を設定
npm install
npm run dev

# バックエンド（別ターミナル）
cd backend
cp .env.example .env   # SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY を設定
pip install -r requirements.txt
python process_pipeline.py
```

### 環境変数

**frontend/.env**
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**backend/.env**
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

> `.env` ファイルは絶対にコミットしないでください。

---

## デプロイ

Cloud Build トリガーを使用した自動デプロイを設定済みです。
`main` ブランチへの push で自動的にビルド・デプロイされます。

```bash
# 手動デプロイ（フロントエンド）
gcloud builds triggers run TRIGGER_NAME --branch=main

# 手動デプロイ（バックエンド）
gcloud builds triggers run TRIGGER_NAME --branch=main
```

---

## Supabase テーブル構成

### `websites`
| カラム | 型 | 説明 |
|---|---|---|
| id | int8 | PK |
| url | text | 登録URL（ユニーク） |
| title | text | ページタイトル |
| content | text | ページ本文 |
| embedding | vector | OpenAI embedding（1536次元） |
| mds_coordinates | float8[] | 3D座標 [x, y, z] |
| added_by | uuid | 登録したユーザーのID |
| created_at | timestamptz | 登録日時 |

### `favorites`
| カラム | 型 | 説明 |
|---|---|---|
| id | int8 | PK |
| user_id | uuid | ユーザーID |
| website_id | int8 | websites.id への参照 |
