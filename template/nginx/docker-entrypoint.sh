#!/usr/bin/env sh
set -eu

# 设置默认值
export SERVER_PORT=${SERVER_PORT:-80}
export CONTEXT_PATH=${CONTEXT_PATH:-/}
export SSO_BASE_URL=${SSO_BASE_URL:-}

# 替换 nginx 配置中的环境变量
envsubst '${GATEWAY_HOST} ${GATEWAY_PORT} ${IAM_HOST} ${IAM_PORT} ${SERVER_PORT} ${CONTEXT_PATH}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

ENV_JS=/usr/local/openresty/nginx/html/env-config.js
if [ -f "$ENV_JS" ]; then
  sed "s|__SSO_BASE_URL__|${SSO_BASE_URL}|g" "$ENV_JS" > "$ENV_JS.tmp" && mv "$ENV_JS.tmp" "$ENV_JS"
  echo "✅ env-config.js 已根据环境变量写入: $ENV_JS"
else
  echo "ℹ️ 未找到 env-config.js，跳过运行时注入: $ENV_JS"
fi

exec "$@"

