import os
import openai
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

openai.api_key = OPENAI_API_KEY
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_data():
    """タイトルと本文を取得"""
    response = supabase.table("websites").select("id, title, content").execute()
    return response.data if response.data else []

data = fetch_data()
print("取得データ:", data)

def get_embedding(text):
    response = openai.Embedding.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response["data"][0]["embedding"]

for item in data:
    text_input = f"{item['title']} {item['content']}"
    embedding = get_embedding(text_input)
    item["embedding"] = embedding
    print(f"ID: {item['id']} のベクトル化完了")

def update_embedding(id, embedding):
    """埋め込みデータをSupabaseに保存"""
    supabase.table("websites").update({"embedding": embedding}).eq("id", id).execute()

# 各データを更新
for item in data:
    update_embedding(item["id"], item["embedding"])
    print(f"ID: {item['id']} のベクトルデータをSupabaseに保存")
