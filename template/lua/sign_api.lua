local cjson = require "cjson"
local config = require "config"
local sign = require "sign"

local function handle_request()
    ngx.header.content_type = "application/json; charset=utf-8"

    if ngx.var.request_method ~= "POST" then
        ngx.status = ngx.HTTP_METHOD_NOT_ALLOWED
        ngx.say(cjson.encode({
            error = "Method not allowed",
            message = "Only POST method is supported"
        }))
        return
    end

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

    local args, err = cjson.decode(body)
    if not args then
        ngx.status = ngx.HTTP_BAD_REQUEST
        ngx.say(cjson.encode({
            error = "Bad request",
            message = "Invalid JSON: " .. (err or "unknown error")
        }))
        return
    end

    if not args.grantType or not args.code then
        ngx.status = ngx.HTTP_BAD_REQUEST
        ngx.say(cjson.encode({
            error = "Bad request",
            message = "Missing required parameters: grantType and code"
        }))
        ngx.log(ngx.ERR, "Missing parameters: grantType=" .. tostring(args.grantType) .. ", code=" .. tostring(args.code))
        return
    end

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

    local pha = sign.calculate_pha(body)

    local current_time = ngx.time()
    local payload = {
        htu = "/auth/token",
        htm = "POST",
        acd = key_config.applicationCode,
        pha = pha,
        jti = jti,
        iat = current_time,
        exp = current_time + 300
    }

    local jwt, err = sign.generate_jwt(payload, key_config["private-key"], key_config["public-key"], key_config["key-id"])
    if not jwt then
        ngx.log(ngx.ERR, "Failed to generate JWT: ", err)
        ngx.status = ngx.HTTP_INTERNAL_SERVER_ERROR
        ngx.say(cjson.encode({
            error = "Internal server error",
            message = "Failed to generate JWT: " .. (err or "unknown error")
        }))
        return
    end

    ngx.status = ngx.HTTP_OK
    ngx.header["Access-Control-Allow-Origin"] = "*"
    ngx.header["Access-Control-Allow-Methods"] = "POST"
    ngx.header["Access-Control-Allow-Headers"] = "Content-Type"
    ngx.say(cjson.encode({
        token = jwt
    }))
end

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

