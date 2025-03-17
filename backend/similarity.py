import os
import numpy as np
from scipy.spatial.distance import cosine
from supabase import create_client
from sklearn.manifold import MDS
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_vectors():
    """Supabase からベクトルデータを取得"""
    response = supabase.table("websites").select("id, embedding").execute()
    if response.data:
        data = response.data
        vectors = {item["id"]: np.array(item["embedding"]) for item in data}
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

def compute_mds(similarity_matrix, n_components=3):
    """コサイン類似度行列を MDS により 3D 座標へ変換"""
    mds = MDS(n_components=n_components, dissimilarity="precomputed", random_state=42)
    coords = mds.fit_transform(1 - similarity_matrix)  # コサイン類似度を距離として扱うため、1 - 類似度
    return coords

def update_mds_coordinates(ids, coords):
    """MDS で得た 3D 座標を Supabase に登録"""
    for i, id in enumerate(ids):
        x, y, z = coords[i]
        response = supabase.table("websites").update({
            "mds_coordinates": [x, y, z]  # 3D 座標をリストとして保存
        }).eq("id", id).execute()

        if response.status_code == 200:
            print(f"ID: {id} の MDS 座標を Supabase に保存しました")
        else:
            print(f"ID: {id} の MDS 座標の保存に失敗: {response.data}")

# データ取得と類似度計算
vectors = fetch_vectors()
if vectors:
    ids, similarity_matrix = compute_cosine_similarity(vectors)

    # MDS で 3D 座標取得
    coords = compute_mds(similarity_matrix)

    # Supabase に 3D 座標を登録
    update_mds_coordinates(ids, coords)

    print("MDS 座標の登録が完了しました！")
