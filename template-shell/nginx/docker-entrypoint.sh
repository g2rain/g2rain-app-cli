#!/usr/bin/env sh
set -eu

export SERVER_PORT=${SERVER_PORT:-8080}
# Must match image build VITE_CONTEXT_PATH (e.g. /admin)
export CONTEXT_PATH=${CONTEXT_PATH:-/admin}
export SSO_BASE_URL=${SSO_BASE_URL:-}
export APPLICATION_CODE=${APPLICATION_CODE:-{{PROJECT_NAME}}}
export GATEWAY_HOST=${GATEWAY_HOST:-gateway}
export GATEWAY_PORT=${GATEWAY_PORT:-8080}
export IAM_HOST=${IAM_HOST:-iam}
export IAM_PORT=${IAM_PORT:-8080}

envsubst '${GATEWAY_HOST} ${GATEWAY_PORT} ${IAM_HOST} ${IAM_PORT} ${SERVER_PORT} ${CONTEXT_PATH} ${APPLICATION_CODE}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

if [ -f /usr/local/openresty/nginx/html/env-config.js ]; then
  sed -i "s|__SSO_BASE_URL__|${SSO_BASE_URL}|g" /usr/local/openresty/nginx/html/env-config.js
  echo "env-config.js updated: SSO_BASE_URL set"
else
  echo "env-config.js not found; skip runtime SSO replace"
fi

if [ ! -f /usr/local/openresty/nginx/lua/keys/private-key.der ] \
  || [ ! -f /usr/local/openresty/nginx/lua/keys/public-key.der ] \
  || [ ! -f /usr/local/openresty/nginx/lua/keys/iam-key-id.txt ]; then
  echo "WARNING: lua/keys missing DER or iam-key-id.txt - mount keys at runtime"
fi

exec "$@"
