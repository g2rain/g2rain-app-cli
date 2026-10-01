# ------------------------------------------------------------
# Stage 1: Vue build
# ------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
ARG VITE_BUILD_MODE=production

COPY package.json package-lock.json* .npmrc* ./
# file:kits/*.tgz must exist before npm install (see kits/README.md)
COPY kits ./kits
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --no-audit --no-fund --loglevel=warn || npm install --legacy-peer-deps --no-audit --no-fund

COPY . .

# Drop any accidentally copied keys from build context before vite (defense in depth)
RUN rm -rf lua/keys/*.pem lua/keys/*.der lua/keys/iam-key-id.txt 2>/dev/null || true

ENV VITE_BUILD_MODE=$VITE_BUILD_MODE
RUN if [ -n "$VITE_BUILD_MODE" ]; then \
      npx vite build --mode "$VITE_BUILD_MODE"; \
    else \
      npx vite build --mode production; \
    fi

# ------------------------------------------------------------
# Stage 2: OpenResty + luaossl
# ------------------------------------------------------------
FROM openresty/openresty:alpine

RUN set -eux; \
    sed -i 's|dl-cdn.alpinelinux.org|mirrors.aliyun.com|g' /etc/apk/repositories; \
    apk update; \
    apk add --no-cache \
        curl git perl gettext ca-certificates openssl openssl-dev \
        build-base bash unzip pkgconfig lua5.1-dev lua5.1 \
        luarocks \
    ; \
    ln -sf /usr/bin/openssl /usr/local/bin/openssl || true

ENV LUA_PATH="/usr/local/openresty/site/lualib/?.lua;/usr/local/openresty/site/lualib/?/init.lua;;"
ENV LUA_CPATH="/usr/local/openresty/site/lualib/?.so;;"

COPY lua/luaossl-rel-20250929.tar.gz /tmp/luaossl-rel-20250929.tar.gz

RUN set -eux; \
    mkdir -p /tmp/luaossl-src; \
    tar -xzf /tmp/luaossl-rel-20250929.tar.gz -C /tmp/luaossl-src; \
    cd /tmp/luaossl-src/luaossl-rel-20250929; \
    make install5.1 LUA51PATH=/usr/local/openresty/site/lualib; \
    make install5.2 LUA52PATH=/usr/local/openresty/site/lualib; \
    /usr/local/openresty/luajit/bin/luajit -e 'local ok, m = pcall(require, "openssl"); print("luaossl load:", ok, m)'; \
    rm -rf /tmp/luaossl-src /tmp/luaossl-rel-20250929.tar.gz

COPY --from=builder /app/dist /usr/local/openresty/nginx/html
COPY lua/sign.lua lua/sign_api.lua lua/config.lua /usr/local/openresty/nginx/lua/
COPY lua/keys/README.md /usr/local/openresty/nginx/lua/keys/README.md
RUN mkdir -p /usr/local/openresty/nginx/lua/keys

COPY nginx/default.conf.template /etc/nginx/conf.d/default.conf.template
COPY nginx/docker-entrypoint.sh /docker-entrypoint.sh
# Strip Windows CRLF / ensure executable (CRLF shebang → "exec format error")
RUN sed -i 's/\r$//' /docker-entrypoint.sh \
 && chmod +x /docker-entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
