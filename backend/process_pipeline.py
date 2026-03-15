import os
import subprocess
import sys
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client

# .envのパスを明示的に指定（このファイルと同じディレクトリ）
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(
        f"Supabase の環境変数が設定されていません。\n"
        f"SUPABASE_URL: {SUPABASE_URL}\n"
        f"SUPABASE_KEY: {'設定済み' if SUPABASE_KEY else '未設定'}\n"
        f".envファイルのパス: {BASE_DIR / '.env'}"
    )

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = Flask(__name__)
CORS(app)


@app.route("/", methods=["GET"])
def index():
    return jsonify({"status": "ok"})


def run_script(script_name: str) -> dict:
    """指定されたスクリプトをvenvのPythonで実行"""
    script_path = BASE_DIR / script_name
    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],  # venvのPythonを使う
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            check=False,
            cwd=str(BASE_DIR),  # backend/ディレクトリで実行
        )
        if result.returncode == 0:
            return {"status": "success", "output": result.stdout}
        # エラーの場合はstdoutとstderrの両方を返す
        return {"status": "error", "output": result.stdout + result.stderr}
    except Exception as e:
        return {"status": "error", "output": str(e)}


@app.route("/process_pipeline", methods=["POST", "GET"])
def process_pipeline():
    try:
        response = (
            supabase.table("websites")
            .select("id, url")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        if not response.data:
            return jsonify({"status": "error", "message": "データベースにURLがありません"}), 400

        new_url = response.data[0]["url"]
        print(f"Processing: {new_url}")

        print("Running main.py...")
        main_result = run_script("main.py")
        print(main_result["output"])

        print("Running embedding.py...")
        embedding_result = run_script("embedding.py")
        print(embedding_result["output"])

        print("Running similarity.py...")
        similarity_result = run_script("similarity.py")
        print(similarity_result["output"])

        return jsonify({
            "status": "success",
            "new_url": new_url,
            "steps": {
                "main.py": main_result,
                "embedding.py": embedding_result,
                "similarity.py": similarity_result,
            },
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/config", methods=["GET"])
def get_config():
    return jsonify({
        "SUPABASE_URL": os.getenv("SUPABASE_URL", ""),
        "SUPABASE_KEY": os.getenv("SUPABASE_KEY", ""),
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=True)