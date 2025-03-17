import os
import openai
from supabase import create_client, Client
from dotenv import load_dotenv

# .env を読み込む
load_dotenv(override=True)

# 環境変数から API キーを取得
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise ValueError("❌ OPENAI_API_KEY が設定されていません！ .env を確認してください。")

# OpenAI クライアントの作成
client = openai.OpenAI(api_key=OPENAI_API_KEY)  # ✅ 明示的に API キーを渡す

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_data():
    """タイトルと本文を取得"""
    response = supabase.table("websites").select("id, title, content").execute()
    return response.data if response.data else []

def get_embedding(text):
    """OpenAI API を使ってベクトル化"""
    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

def update_embedding(id, embedding):
    """埋め込みデータをSupabaseに保存"""
    supabase.table("websites").update({"embedding": embedding}).eq("id", id).execute()

def process_embeddings():
    """データを取得して埋め込みを作成し、Supabase に保存"""
    data = fetch_data()
    for item in data:
        text_input = f"{item['title']} {item['content']}"
        embedding = get_embedding(text_input)
        update_embedding(item["id"], embedding)
        print(f"ID: {item['id']} のベクトルデータをSupabaseに保存")

if __name__ == "__main__":
    process_embeddings()
