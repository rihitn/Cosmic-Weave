import json
import os
import warnings

import numpy as np
from dotenv import load_dotenv
from scipy.spatial.distance import cosine
from sklearn.manifold import MDS
from supabase import create_client

from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_KEY"],
)


def fetch_vectors() -> dict[int, np.ndarray]:
    """embeddingが存在する全レコードを取得"""
    response = supabase.table("websites").select("id, embedding").execute()

    vectors = {}
    for item in response.data or []:
        emb = item["embedding"]
        if emb is None:
            print(f"⚠️ ID {item['id']}: embedding なし → スキップ")
            continue

        # Supabaseからはlist[float]で返ってくることが多いが念のため変換
        if isinstance(emb, str):
            try:
                emb = json.loads(emb)
            except json.JSONDecodeError:
                print(f"⚠️ ID {item['id']}: JSON変換失敗 → スキップ")
                continue

        vectors[item["id"]] = np.array(emb, dtype=np.float64)

    print(f"✅ {len(vectors)} 件のベクトルを取得")
    return vectors


def compute_distance_matrix(vectors: dict[int, np.ndarray]) -> tuple[list[int], np.ndarray]:
    """コサイン距離行列を作成（MDSにはdissimilarity=距離が必要）"""
    ids = list(vectors.keys())
    n = len(ids)
    dist_matrix = np.zeros((n, n), dtype=np.float64)

    for i in range(n):
        for j in range(n):
            if i != j:
                # cosine()はコサイン距離（1 - コサイン類似度）を返す
                dist_matrix[i, j] = cosine(vectors[ids[i]], vectors[ids[j]])

    # 対称性を確保（数値誤差対策）
    dist_matrix = (dist_matrix + dist_matrix.T) / 2
    np.fill_diagonal(dist_matrix, 0.0)

    print(f"距離行列:\n{dist_matrix.round(4)}")
    return ids, dist_matrix


def compute_mds(dist_matrix: np.ndarray, n_components: int = 3) -> np.ndarray:
    """距離行列からMDSで3D座標を計算"""
    n = dist_matrix.shape[0]

    if n < 2:
        print("⚠️ データが1件のみ → 原点に配置")
        return np.zeros((n, 3))

    if n == 2:
        # 2件の場合はMDSが不安定なので手動配置
        d = dist_matrix[0, 1]
        coords = np.array([[0, 0, 0], [float(d), 0, 0]], dtype=np.float64)
        return coords

    # 3件以上は通常のMDS
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")  # RuntimeWarningを抑制
        mds = MDS(
            n_components=n_components,
            dissimilarity="precomputed",
            random_state=42,
            normalized_stress=False,
            n_init=4,
            max_iter=300,
        )
        coords = mds.fit_transform(dist_matrix)

    return coords


def update_mds_coordinates(ids: list[int], coords: np.ndarray) -> None:
    """3D座標をSupabaseに保存（Python float に変換して保存）"""
    for i, id_ in enumerate(ids):
        # numpy.float64 → Python float に変換（Supabaseとの互換性のため）
        x, y, z = float(coords[i, 0]), float(coords[i, 1]), float(coords[i, 2])
        supabase.table("websites").update({
            "mds_coordinates": [x, y, z]
        }).eq("id", id_).execute()
        print(f"✅ ID {id_}: ({x:.4f}, {y:.4f}, {z:.4f})")


def main() -> None:
    vectors = fetch_vectors()
    if not vectors:
        print("❌ ベクトルデータがありません")
        return

    ids, dist_matrix = compute_distance_matrix(vectors)

    coords = compute_mds(dist_matrix)
    print(f"\nMDS座標:\n{coords.round(4)}")

    update_mds_coordinates(ids, coords)
    print("\n✅ MDS座標の登録完了！")


if __name__ == "__main__":
    main()