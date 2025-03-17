import numpy as np
from scipy.spatial.distance import cosine
from supabase import create_client

import matplotlib.pyplot as plt
from sklearn.manifold import MDS

# Supabase の設定
SUPABASE_URL = "https://rpnrxkjywdjuvwqyaxod.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbnJ4a2p5d2RqdXZ3cXlheG9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5ODU1NTAsImV4cCI6MjA1NTU2MTU1MH0.5UcsToulrU63XqT21wtGJTy-pjxw-n7MlIuv7EzoP08"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_vectors():
    """Supabase からベクトルデータを取得"""
    response = supabase.table("embeddings").select("id, vector").execute()
    if response.data:
        data = response.data
        vectors = {item["id"]: np.array(item["vector"]) for item in data}
        return vectors
    else:
        print("データが見つかりません")
        return {}

def compute_cosine_similarity(vectors):
    """コサイン類似度行列を作成"""
    ids = list(vectors.keys())
    vec_list = np.array([vectors[i] for i in ids])

    # コサイン類似度行列の計算
    similarity_matrix = np.zeros((len(ids), len(ids)))

    for i in range(len(ids)):
        for j in range(len(ids)):
            if i != j:
                similarity_matrix[i, j] = 1 - cosine(vec_list[i], vec_list[j])  # 類似度 = 1 - コサイン距離

    return ids, similarity_matrix

# データ取得と類似度計算
vectors = fetch_vectors()
if vectors:
    ids, similarity_matrix = compute_cosine_similarity(vectors)

def compute_mds(similarity_matrix, n_components=3):
    """コサイン類似度行列を MDS により 3D 座標へ変換"""
    mds = MDS(n_components=n_components, dissimilarity="precomputed", random_state=42)
    coords = mds.fit_transform(1 - similarity_matrix)  # コサイン類似度を距離として扱うため、1 - 類似度
    return coords

# MDS で 3D 座標取得
if vectors:
    coords = compute_mds(similarity_matrix)

 