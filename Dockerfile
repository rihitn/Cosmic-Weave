# 1. Pythonの公式イメージを使う
FROM python:3.13

# 2. 作業ディレクトリを設定
WORKDIR /app

# 3. 必要なファイルをコピー
COPY requirements.txt .
COPY backend/ ./backend/

# 4. 必要なライブラリをインストール
RUN pip install --no-cache-dir -r requirements.txt

# 5. 環境変数を設定（Cloud Run で自動設定される）
ENV PORT=8080

# 6. アプリを起動する
CMD ["python", "backend/process_pipeline.py"]
