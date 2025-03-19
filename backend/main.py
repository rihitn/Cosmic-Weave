import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from dotenv import load_dotenv
import sys

# 出力エンコーディングを UTF-8 に設定（Windows の場合）
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Supabaseクライアントを作成
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_html_from_url(url: str) -> str:
    """指定したURLからHTMLを取得する"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        print(f"URLの取得に失敗しました: {e}")
        return ""

def extract_title_and_content(html: str) -> tuple[str, str]:
    """HTMLからタイトルと本文を抽出する"""
    soup = BeautifulSoup(html, "html.parser")

    # タイトルを取得
    title = soup.title.string.strip() if soup.title else "タイトルなし"

    # 本文を抽出（<p>タグのテキストを結合）
    paragraphs = soup.find_all("p")
    content = "\n".join([p.get_text().strip() for p in paragraphs if p.get_text().strip()])

    return title, content

def update_supabase_with_extracted_data(row_id: int, title: str, content: str):
    """Supabaseのwebsitesテーブルを更新する"""
    title = title.encode("utf-8").decode("utf-8")
    content = content.encode("utf-8").decode("utf-8")

    response = supabase.table("websites").update({
        "title": title,
        "content": content
    }).eq("id", row_id).execute()

    if response.data:  # 修正：エラーチェック方法変更
        print(f"データの保存に成功しました (ID: {row_id})")
    else:
        print(f"データの保存に失敗しました (ID: {row_id}): {response}")

def main():
    """未処理のURLを取得し、タイトルと本文を抽出してデータベースを更新"""
    response = supabase.table("websites").select("id, url").is_("title", None).execute()

    for row in response.data:
        row_id = row["id"]
        url = row["url"]
        print(f"URLを処理中: {url}")

        # HTMLを取得してタイトルと本文を抽出
        html = fetch_html_from_url(url)
        if html:
            title, content = extract_title_and_content(html)
            print(f"抽出結果: タイトル: {title}")

            # Supabaseのwebsitesテーブルを更新
            update_supabase_with_extracted_data(row_id, title, content)

if __name__ == "__main__":
    main()
