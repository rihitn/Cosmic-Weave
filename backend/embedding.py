import os
from pathlib import Path
from typing import List

import openai
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).resolve().parent / ".env")

client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

EMBED_BATCH_SIZE = 500   # OpenAI API の1リクエストあたりの上限
UPSERT_CHUNK    = 100    # Supabase upsert の1バッチあたりの件数


def fetch_data() -> list[dict]:
    """embedding が未作成のレコードを1クエリで取得（N+1を解消）"""
    response = supabase.table("websites") \
        .select("id, url, title, content, embedding") \
        .execute()
    return [item for item in (response.data or []) if item.get("embedding") is None]


def build_text(item: dict) -> str:
    parts = []
    title = (item.get("title") or "").strip()
    if title and title not in ("タイトルなし", ""):
        parts.append(f"タイトル: {title}")
    content = (item.get("content") or "").strip()
    if content:
        parts.append(f"内容: {content[:500]}")
    url = (item.get("url") or "").strip()
    if url:
        parts.append(f"URL: {url}")
    return "\n".join(parts)


def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """OpenAI API に最大 EMBED_BATCH_SIZE 件ずつまとめて送信"""
    all_embeddings: List[List[float]] = []
    total = len(texts)
    for i in range(0, total, EMBED_BATCH_SIZE):
        batch = texts[i : i + EMBED_BATCH_SIZE]
        print(f"  OpenAI API: {i+1}〜{min(i+len(batch), total)} / {total} 件")
        response = client.embeddings.create(
            input=batch,
            model="text-embedding-3-small",
        )
        all_embeddings.extend([item.embedding for item in response.data])
    return all_embeddings


def process_embeddings() -> None:
    data = fetch_data()
    if not data:
        print("すべてのデータがembedding済みです。")
        return

    print(f"{len(data)} 件のembeddingを作成します")

    # テキスト生成 & 空テキストを除外
    texts = [build_text(item) for item in data]
    valid_pairs = [(item, text) for item, text in zip(data, texts) if text.strip()]
    if not valid_pairs:
        print("有効なテキストがありません")
        return

    valid_data, valid_texts = zip(*valid_pairs)

    # バッチでembedding取得
    embeddings = get_embeddings_batch(list(valid_texts))

    # Supabase へバッチ upsert
    records = [
        {"id": item["id"], "embedding": emb}
        for item, emb in zip(valid_data, embeddings)
    ]
    total = len(records)
    for i in range(0, total, UPSERT_CHUNK):
        batch = records[i : i + UPSERT_CHUNK]
        supabase.table("websites").upsert(batch).execute()
        print(f"  ✅ {min(i + len(batch), total)} / {total} 件保存完了")

    print(f"\n✅ embedding完了: {len(records)}件")


if __name__ == "__main__":
    process_embeddings()
