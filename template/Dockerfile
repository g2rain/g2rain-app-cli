# ------------------------------------------------------------
# 阶段 1：构建 Vue 前端
# ------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
ARG VITE_BUILD_MODE=production

COPY package.json package-lock.json .npmrc ./
COPY kits/ ./kits/
# create-g2rain-app 为 file:../g2rain-app-cli；镜像构建不需要 CLI，放最小 stub 以满足 npm ci
RUN mkdir -p /g2rain-app-cli \
 && printf '%s\n' '{"name":"create-g2rain-app","version":"0.1.0","private":true}' > /g2rain-app-cli/package.json
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --no-audit --no-fund --loglevel=warn

COPY . .

ENV VITE_BUILD_MODE=$VITE_BUILD_MODE
RUN echo "🔨 构建模式: $VITE_BUILD_MODE"

RUN echo "📁 检查配置文件:" && ls -la vite.config.* && \
    echo "📁 检查环境文件:" && ls -la .env*

RUN if [ -n "$VITE_BUILD_MODE" ]; then \
        echo "🏗️ 使用指定的构建模式: $VITE_BUILD_MODE"; \
        npx vite build --mode $VITE_BUILD_MODE; \
        echo "✅ $VITE_BUILD_MODE 模式构建完成"; \
    else \
        echo "🚀 VITE_BUILD_MODE 未设置，使用默认模式: production"; \
        npx vite build --mode production; \
        echo "✅ production 模式构建完成"; \
    fi

# ------------------------------------------------------------
# 阶段 2：OpenResty + OpenSSL 3 + luaossl
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
    echo "✅ Base system ready with OpenSSL:"; \
    openssl version || echo "⚠️ openssl not found (check PATH)"; \
    ln -sf /usr/bin/openssl /usr/local/bin/openssl || true

ENV LUA_PATH="/usr/local/openresty/site/lualib/?.lua;/usr/local/openresty/site/lualib/?/init.lua;;"
ENV LUA_CPATH="/usr/local/openresty/site/lualib/?.so;;"

COPY lua/luaossl-rel-20250929.tar.gz /tmp/luaossl-rel-20250929.tar.gz

RUN set -eux; \
    echo "🔍 Installing luaossl (offline from tar.gz)..."; \
    mkdir -p /tmp/luaossl-src; \
    tar -xzf /tmp/luaossl-rel-20250929.tar.gz -C /tmp/luaossl-src; \
    echo "📁 Listing directory structure:"; \
    ls -R /tmp/luaossl-src; \
    cd /tmp/luaossl-src/luaossl-rel-20250929; \
    make install5.1 LUA51PATH=/usr/local/openresty/site/lualib; \
    make install5.2 LUA52PATH=/usr/local/openresty/site/lualib; \
    echo "✅ luaossl installed offline."; \
    /usr/local/openresty/luajit/bin/luajit -e 'local ok, m = pcall(require, "openssl"); print("luaossl load:", ok, m)'

COPY --from=builder /app/dist /usr/local/openresty/nginx/html
COPY lua/ /usr/local/openresty/nginx/lua/
COPY nginx/default.conf.template /etc/nginx/conf.d/
COPY nginx/docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh || true

RUN if [ ! -f /usr/local/openresty/nginx/lua/keys/private-key.der ] || [ ! -f /usr/local/openresty/nginx/lua/keys/public-key.der ]; then \
        echo "⚠️ Warning: missing key files under lua/keys (ignored in dev)"; \
    fi

EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

