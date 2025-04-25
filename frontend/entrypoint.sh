#!/bin/sh
set -e

# env.template.js → env.js に置換出力
sed -e "s|%%SUPABASE_URL%%|${SUPABASE_URL}|g" \
    -e "s|%%SUPABASE_ANON_KEY%%|${SUPABASE_ANON_KEY}|g" \
    /usr/share/nginx/html/env.template.js \
    > /usr/share/nginx/html/env.js

exec nginx -g "daemon off;"
