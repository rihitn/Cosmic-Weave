import json
import os
import warnings
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from sklearn.manifold import MDS
from sklearn.metrics.pairwise import cosine_distances
from supabase import create_client

load_dotenv(Path(__file__).resolve().parent / ".env")

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_KEY"],
)

UPSERT_CHUNK = 200   # Supabase upsert の1バッチあたりの件数


def fetch_vectors() -> dict[int, np.ndarray]:
    """embedding が存在する全レコードを取得"""
    response = supabase.table("websites").select("id, embedding").execute()
    vectors: dict[int, np.ndarray] = {}
    for item in response.data or []:
        emb = item["embedding"]
        if emb is None:
            print(f"⚠️ ID {item['id']}: embedding なし → スキップ")
            continue
        if isinstance(emb, str):
            try:
                emb = json.loads(emb)
            except json.JSONDecodeError:
                print(f"⚠️ ID {item['id']}: JSON変換失敗 → スキップ")
                continue
        vectors[item["id"]] = np.array(emb, dtype=np.float32)

    print(f"✅ {len(vectors)} 件のベクトルを取得")
    return vectors


def compute_distance_matrix(vectors: dict[int, np.ndarray]) -> tuple[list[int], np.ndarray]:
    """sklearn の cosine_distances でベクトル化計算（Pythonループを排除）"""
    ids = list(vectors.keys())
    matrix = np.vstack([vectors[id_] for id_ in ids])  # shape: (n, dim)
    dist_matrix = cosine_distances(matrix).astype(np.float64)

    # 対称性と対角の保証
    dist_matrix = (dist_matrix + dist_matrix.T) / 2
    np.fill_diagonal(dist_matrix, 0.0)

    print(f"✅ 距離行列計算完了: {dist_matrix.shape}")
    return ids, dist_matrix


def compute_mds(dist_matrix: np.ndarray, n_components: int = 3) -> np.ndarray:
    """MDS で3D座標を計算"""
    n = dist_matrix.shape[0]

    if n < 2:
        print("⚠️ データが1件のみ → 原点に配置")
        return np.zeros((n, 3))

    if n == 2:
        d = dist_matrix[0, 1]
        return np.array([[0.0, 0.0, 0.0], [float(d), 0.0, 0.0]], dtype=np.float64)

    # n_init=1, max_iter=100 に削減（品質はほぼ変わらず高速化）
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        mds = MDS(
            n_components=n_components,
            dissimilarity="precomputed",
            random_state=42,
            normalized_stress=False,
            n_init=1,       # 4 → 1（最も効果が大きい）
            max_iter=100,   # 300 → 100
        )
        coords = mds.fit_transform(dist_matrix)

    print(f"✅ MDS計算完了: stress={mds.stress_:.4f}")
    return coords


def update_mds_coordinates(ids: list[int], coords: np.ndarray) -> None:
    """3D座標を Supabase へバッチ upsert（1件ずつUPDATEを排除）"""
    records = [
        {
            "id": id_,
            "mds_coordinates": [
                float(coords[i, 0]),
                float(coords[i, 1]),
                float(coords[i, 2]),
            ],
        }
        for i, id_ in enumerate(ids)
    ]
    total = len(records)
    for i in range(0, total, UPSERT_CHUNK):
        batch = records[i : i + UPSERT_CHUNK]
        supabase.table("websites").upsert(batch).execute()
        print(f"  ✅ {min(i + len(batch), total)} / {total} 件座標保存完了")


def main() -> None:
    vectors = fetch_vectors()
    if not vectors:
        print("❌ ベクトルデータがありません")
        return

    ids, dist_matrix = compute_distance_matrix(vectors)
    coords = compute_mds(dist_matrix)
    update_mds_coordinates(ids, coords)
    print("\n✅ MDS座標の登録完了！")


if __name__ == "__main__":
    main()
