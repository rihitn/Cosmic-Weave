#!/bin/sh
set -e

# ↓ Cloud Run の環境変数を env.js に注入
cat <<EOF > /usr/share/nginx/html/env.js
window.__ENV = {
  SUPABASE_URL: "${SUPABASE_URL}",
  SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}"
};
EOF
echo "[entrypoint] env.js generated"

exec nginx -g "daemon off;"
