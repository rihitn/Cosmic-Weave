import sys
import codecs
import os
import pandas as pd
import re
import MeCab
from sklearn.feature_extraction.text import TfidfVectorizer
from supabase import create_client, Client
from dotenv import load_dotenv

# Windows環境の文字化け対策
if sys.platform == "win32":
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

# .env を読み込む
load_dotenv(override=True)

# Supabase 認証情報を取得
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# データベースから embedding が None のデータのみ取得
def fetch_data():
    response = supabase.table("websites").select("id, title, content").is_("embedding", None).execute()
    return response.data if response.data else []

# 名詞だけを抽出する形態素解析関数
def tokenize(text):
    mecab = MeCab.Tagger()
    mecab.parse('')  # バグ回避
    nodes = mecab.parseToNode(text)
    tokens = []
    while nodes:
        if nodes.surface != "" and "名詞" in nodes.feature:
            tokens.append(nodes.surface)
        nodes = nodes.next
    return tokens

# TF-IDFで文章をベクトル化
def text_to_vector(text, tfidf_vectorizer):
    tokens = tokenize(text)
    tokenized_text = " ".join(tokens)
    vector = tfidf_vectorizer.transform([tokenized_text])
    return vector.toarray()[0].tolist()

# ベクトルをSupabaseに保存
def update_embedding(id, embedding):
    supabase.table("websites").update({"embedding": embedding}).eq("id", id).execute()

# 一括処理のメイン関数
def process_embeddings():
    data = fetch_data()
    if not data:
        print("すべてのデータが埋め込み済みです。")
        return

    # DataFrameに変換
    df = pd.DataFrame(data)
    df['text'] = df['title'].fillna('') + " " + df['content'].fillna('')
    df['tokenized_text'] = df['text'].apply(lambda x: " ".join(tokenize(x)))

    # TF-IDFベクトライザを学習
    tfidf_vectorizer = TfidfVectorizer()
    tfidf_vectorizer.fit(df['tokenized_text'])

    # 各行のベクトルを計算して保存
    for idx, row in df.iterrows():
        vector = text_to_vector(row['text'], tfidf_vectorizer)
        update_embedding(row['id'], vector)
        print(f"✅ ID: {row['id']} のTF-IDFベクトルを保存しました")

# スクリプトとして実行された場合
if __name__ == "__main__":
    process_embeddings()
