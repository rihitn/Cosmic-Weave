import os
import openai
from supabase import create_client, Client

SUPABASE_URL = "https://rpnrxkjywdjuvwqyaxod.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbnJ4a2p5d2RqdXZ3cXlheG9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5ODU1NTAsImV4cCI6MjA1NTU2MTU1MH0.5UcsToulrU63XqT21wtGJTy-pjxw-n7MlIuv7EzoP08"  

openai.api_key = "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"

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
