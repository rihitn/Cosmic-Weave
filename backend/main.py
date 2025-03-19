import os
import requests
import sys
from bs4 import BeautifulSoup
from supabase import create_client, Client
from dotenv import load_dotenv

# Windows環境の文字化け対策
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Supabase クライアントを作成
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_html_from_url(url: str) -> str:
    """指定したURLからHTMLを取得し、適切なエンコーディングを適用"""
    try:
        response = requests.get(url)
        response.raise_for_status()
        response.encoding = response.apparent_encoding  # エンコーディングを自動検出
        return response.text
    except requests.RequestException as e:
        print(f"❌ URLの取得に失敗: {e}", file=sys.stdout, flush=True)
        return ""

def extract_title_and_content(html: str) -> tuple[str, str]:
    """HTMLからタイトルと本文を抽出（文字化け対策あり）"""
    soup = BeautifulSoup(html, "html.parser")

    # タイトルを取得
    title = soup.title.string.strip() if soup.title else "タイトルなし"

    # UTF-8 で確実に処理
    title = title.encode('utf-8', errors='ignore').decode('utf-8')

    # 本文を抽出（<p>タグのテキストを結合）
    paragraphs = soup.find_all("p")
    content = "\n".join([p.get_text().strip() for p in paragraphs if p.get_text().strip()])
    
    content = content.encode('utf-8', errors='ignore').decode('utf-8')

    return title, content

def update_supabase_with_extracted_data(row_id: int, title: str, content: str):
    """Supabaseのwebsitesテーブルを更新（UTF-8対応）"""
    response = supabase.table("websites").update({
        "title": title,
        "content": content
    }).eq("id", row_id).execute()

    if response.data:
        print(f"✅ データの保存成功 (ID: {row_id})", file=sys.stdout, flush=True)
    else:
        print(f"❌ データの保存失敗 (ID: {row_id})", file=sys.stdout, flush=True)

def main():
    """未処理のURLを取得し、タイトルと本文をSupabaseに保存"""
    response = supabase.table("websites").select("id, url").is_("title", None).execute()

    if response.data:
        for row in response.data:
            row_id = row["id"]
            url = row["url"]
            print(f"🌍 URLを処理中: {url}", file=sys.stdout, flush=True)

            # HTMLを取得してタイトルと本文を抽出
            html = fetch_html_from_url(url)
            if html:
                title, content = extract_title_and_content(html)
                print(f"🎯 抽出結果: {title}", file=sys.stdout, flush=True)

                # Supabaseのwebsitesテーブルを更新
                update_supabase_with_extracted_data(row_id, title, content)
    else:
        print("✔️ すべてのURLが処理済みです。", file=sys.stdout, flush=True)

if __name__ == "__main__":
    main()
