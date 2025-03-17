import sys
sys.stdout.reconfigure(encoding='utf-8')  # ✅ UTF-8で出力するように修正

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

import json  # 追加

def fetch_vectors():
    """Supabase からベクトルデータを取得し、適切な型に変換"""
    response = supabase.table("websites").select("id, embedding").execute()
    
    if response.data:
        data = response.data
        vectors = {}

        for item in data:
            emb = item["embedding"]  # embedding の元データ
            
            # 型チェック
            print(f"ID: {item['id']} の embedding 型: {type(emb)}")
            
            if emb is None:
                print(f"⚠️ ID {item['id']} の embedding が None です！スキップします。")
                continue
            
            if isinstance(emb, str):  # 文字列の場合は JSON 変換
                try:
                    emb = json.loads(emb)  # JSON 文字列をリストに変換
                except json.JSONDecodeError:
                    print(f"⚠️ ID {item['id']} の embedding が JSON 変換できません！スキップします。")
                    continue
            
            if isinstance(emb, list):  # 正しいリスト形式
                emb = np.array(emb, dtype=np.float32)
            elif isinstance(emb, np.ndarray):  # 既に ndarray の場合
                emb = emb.astype(np.float32)
            else:
                print(f"⚠️ ID {item['id']} の embedding が未知の型 {type(emb)} です！スキップします。")
                continue
            
            # 正常データのみ登録
            vectors[item["id"]] = emb

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
                similarity_matrix[i, j] = 1 - cosine(vec_list[i].ravel(), vec_list[j].ravel())  # 修正

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


# データ取得と類似度計算
vectors = fetch_vectors()
if vectors:
    ids, similarity_matrix = compute_cosine_similarity(vectors)

    # MDS で 3D 座標取得
    coords = compute_mds(similarity_matrix)

    # Supabase に 3D 座標を登録
    update_mds_coordinates(ids, coords)

    print("MDS 座標の登録が完了しました！")
