import os
import subprocess
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client
from dotenv import load_dotenv

# 環境変数をロード
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = Flask(__name__)
CORS(app)

def run_script(script_name):
    """ 指定されたスクリプトを実行 """
    try:
        result = subprocess.run(["python3", script_name], capture_output=True, text=True, check=True)
        return {"status": "success", "output": result.stdout}
    except subprocess.CalledProcessError as e:
        return {"status": "error", "output": e.stderr}

@app.route("/process_pipeline", methods=["POST", "GET"])
def process_pipeline():
    """
    Supabase に URL が追加されたら、パイプライン処理を実行。
    1. main.py → 2. embedding.py → 3. similarity.py を順番に実行
    """
    try:
        # Supabase から新しい URL を取得
        response = supabase.table("websites").select("id, url").order("created_at", desc=True).limit(1).execute()
        
        if not response.data:
            return jsonify({"status": "error", "message": "No new URL found in database"}), 400

        new_url_id = response.data[0]["id"]
        new_url = response.data[0]["url"]
        print(f"Processing new URL: {new_url} (ID: {new_url_id})")

        # Step 1: main.py を実行（HTML取得 & タイトル・本文抽出）
        print("Running main.py...")
        main_result = run_script("main.py")
        print(main_result["output"])

        # Step 2: embedding.py を実行（埋め込み生成 & データベース更新）
        print("Running embedding.py...")
        embedding_result = run_script("embedding.py")
        print(embedding_result["output"])

        # Step 3: similarity.py を実行（類似度計算 & MDS座標更新）
        print("Running similarity.py...")
        similarity_result = run_script("similarity.py")
        print(similarity_result["output"])

        return jsonify({
            "status": "success",
            "new_url": new_url,
            "steps": {
                "main.py": main_result,
                "embedding.py": embedding_result,
                "similarity.py": similarity_result
            }
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
