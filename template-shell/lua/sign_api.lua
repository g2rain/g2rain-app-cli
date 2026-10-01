-- sign_api.lua
-- 接收 JSON 入参，使用 ES256 算法生成 JWT 签名

local cjson = require "cjson"
local config = require "config"
local sign = require "sign"

-- 主处理函数
local function handle_request()
    -- 设置响应头
    ngx.header.content_type = "application/json; charset=utf-8"

    -- 只接受 POST 请求
    if ngx.var.request_method ~= "POST" then
        ngx.status = ngx.HTTP_METHOD_NOT_ALLOWED
        ngx.say(cjson.encode({
            error = "Method not allowed",
            message = "Only POST method is supported"
        }))
        return
    end

    -- 获取 URL 中的 jti 参数
    local jti = ngx.var.arg_jti
    if not jti or jti == "" then
        ngx.status = ngx.HTTP_BAD_REQUEST
        ngx.say(cjson.encode({
            error = "Bad request",
            message = "Missing or invalid 'jti' parameter"
        }))
        ngx.log(ngx.ERR, "Missing or invalid 'jti' parameter")
        return
    end

    -- 读取请求体
    ngx.req.read_body()
    local body = ngx.req.get_body_data()

    if not body or body == "" then
        ngx.status = ngx.HTTP_BAD_REQUEST
        ngx.say(cjson.encode({
            error = "Bad request",
            message = "Request body is required"
        }))
        return
    end

    -- 解析 JSON
    local args, err = cjson.decode(body)
    if not args then
        ngx.status = ngx.HTTP_BAD_REQUEST
        ngx.say(cjson.encode({
            error = "Bad request",
            message = "Invalid JSON: " .. (err or "unknown error")
        }))
        return
    end

    -- 验证必要参数
    if not args.grantType or not args.code then
        ngx.status = ngx.HTTP_BAD_REQUEST
        ngx.say(cjson.encode({
            error = "Bad request",
            message = "Missing required parameters: grantType and code"
        }))
        ngx.log(ngx.ERR, "Missing parameters: grantType=" .. tostring(args.grantType) .. ", code=" .. tostring(args.code))
        return
    end

    -- 获取活动的密钥配置
    local key_config = config.get_active_key()
    if not key_config then
        ngx.status = ngx.HTTP_INTERNAL_SERVER_ERROR
        ngx.say(cjson.encode({
            error = "Internal server error",
            message = "No active key found in configuration"
        }))
        ngx.log(ngx.ERR, "Failed to load active key configuration")
        return
    end

    -- 计算 pha (Payload Hash Algorithm)
    local pha = sign.calculate_pha(body)

    -- 构建 JWT Payload（参考 jwt.util.ts 的 DpopPayload 格式）
    local current_time = ngx.time()
    local payload = {
        htu = "/auth/token",  -- HTTP URI
        htm = "POST",  -- HTTP Method
        acd = key_config.applicationCode,  -- Application Code
        pha = pha,  -- Payload Hash Algorithm
        jti = jti,   -- 请求id
        iat = current_time,  -- 签发时间（issued at），对应 setIssuedAt()
        exp = current_time + 300  -- 过期时间（5分钟后），对应 setExpirationTime('5m')
    }

    -- 生成 JWT
    local jwt, err = sign.generate_jwt(payload, key_config["private-key"], key_config["public-key"], key_config["key-id"])
    if not jwt then
        ngx.log(ngx.ERR, "Failed to generate JWT: ", err)  -- 添加日志
        ngx.status = ngx.HTTP_INTERNAL_SERVER_ERROR
        ngx.say(cjson.encode({
            error = "Internal server error",
            message = "Failed to generate JWT: " .. (err or "unknown error")
        }))
        return
    end

    -- 返回结果
    ngx.status = ngx.HTTP_OK
    ngx.header["Access-Control-Allow-Origin"] = "*"
    ngx.header["Access-Control-Allow-Methods"] = "POST"
    ngx.header["Access-Control-Allow-Headers"] = "Content-Type"
    ngx.say(cjson.encode({
        token = jwt
    }))
end

-- 执行主处理函数
local ok, err = pcall(handle_request)
if not ok then
    ngx.log(ngx.ERR, "Error in sign_api.lua: ", err)
    ngx.status = ngx.HTTP_INTERNAL_SERVER_ERROR
    ngx.header.content_type = "application/json"
    ngx.say(cjson.encode({
        error = "Internal server error",
        message = "An unexpected error occurred"
    }))
end