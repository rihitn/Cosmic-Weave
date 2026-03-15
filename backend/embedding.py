import os
import json
from pathlib import Path
from typing import List

import openai
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).resolve().parent / ".env")

client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])


def fetch_data() -> list[dict]:
    """embeddingが未作成のデータを取得"""
    response = supabase.table("websites").select("id, url, title, content").execute()
    results = []
    for item in response.data or []:
        # embeddingカラムを別途確認
        emb_resp = supabase.table("websites").select("embedding").eq("id", item["id"]).execute()
        emb = emb_resp.data[0]["embedding"] if emb_resp.data else None
        if emb is None:
            results.append(item)
    return results


def build_text(item: dict) -> str:
    """title と content からembedding用テキストを作成"""
    parts = []

    title = (item.get("title") or "").strip()
    # 「タイトルなし」や空文字は除外
    if title and title not in ("タイトルなし", ""):
        parts.append(f"タイトル: {title}")

    content = (item.get("content") or "").strip()
    if content:
        # contentは長すぎるので先頭500文字だけ使う
        parts.append(f"内容: {content[:500]}")

    # URLも情報として使う
    url = (item.get("url") or "").strip()
    if url:
        parts.append(f"URL: {url}")

    return "\n".join(parts)


def get_embedding(text: str) -> List[float]:
    """OpenAI APIでembeddingを取得"""
    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding


def process_embeddings() -> None:
    data = fetch_data()
    if not data:
        print("すべてのデータがembedding済みです。")
        return

    print(f"{len(data)} 件のembeddingを作成します")

    for item in data:
        text = build_text(item)
        print(f"\nID {item['id']}: {item['url'][:40]}")
        print(f"  embedding用テキスト: {text[:80]}...")

        if not text.strip():
            print(f"  ⚠️ テキストが空のためスキップ")
            continue

        embedding = get_embedding(text)
        supabase.table("websites").update(
            {"embedding": embedding}
        ).eq("id", item["id"]).execute()
        print(f"  ✅ embedding保存完了")


if __name__ == "__main__":
    process_embeddings()