-- config.lua
-- Load Application-DPoP signing keys from mounted files (DER).
-- Never bake production private keys into the image or Git.

local _M = {}

local KEY_BASE_PATH = "/usr/local/openresty/nginx/lua/keys"
local PUBLIC_KEY_FILE = KEY_BASE_PATH .. "/public-key.der"
local PRIVATE_KEY_FILE = KEY_BASE_PATH .. "/private-key.der"
local KEY_ID_FILE = KEY_BASE_PATH .. "/iam-key-id.txt"

local function read_file(file_path, binary)
    local mode = binary and "rb" or "r"
    local file, err = io.open(file_path, mode)
    if not file then
        ngx.log(ngx.ERR, "Failed to open file: ", file_path, " Error: ", err)
        return nil
    end
    local content = file:read("*all")
    file:close()
    if not content then
        ngx.log(ngx.ERR, "Failed to read content from file: ", file_path)
        return nil
    end
    return content
end

local function read_text_file(file_path)
    local content = read_file(file_path, false)
    if not content then
        return nil
    end
    return (content:gsub("%s+$", ""))
end

local function resolve_application_code()
    -- Prefer nginx variable set by docker-entrypoint (envsubst into conf).
    local from_var = ngx.var.application_code
    if from_var and from_var ~= "" and from_var ~= "nil" then
        return from_var
    end

    local ok, env_value = pcall(function()
        return os.getenv("APPLICATION_CODE")
    end)
    if ok and env_value and env_value ~= "" then
        return env_value
    end

    return "{{PROJECT_NAME}}"
end

local function load_keys()
    local public_key = read_file(PUBLIC_KEY_FILE, true)
    local private_key = read_file(PRIVATE_KEY_FILE, true)
    local key_id = read_text_file(KEY_ID_FILE)

    if not public_key or not private_key then
        ngx.log(ngx.ERR, "Failed to load DER keys from ", KEY_BASE_PATH)
        return nil
    end

    if not key_id or key_id == "" then
        ngx.log(ngx.ERR, "Missing or empty key id file: ", KEY_ID_FILE)
        return nil
    end

    local application_code = resolve_application_code()

    return {
        {
            ["key-id"] = key_id,
            algorithm = "ES256",
            active = true,
            applicationCode = application_code,
            ["public-key"] = public_key,
            ["private-key"] = private_key,
        },
    }
end

local cached_keys = nil

function _M.get_active_key()
    if not cached_keys then
        cached_keys = load_keys()
        if not cached_keys then
            ngx.log(ngx.ERR, "Failed to load keys from files.")
            return nil
        end
    end

    for _, key in ipairs(cached_keys) do
        if key.active then
            return key
        end
    end

    ngx.log(ngx.ERR, "No active key found.")
    return nil
end

function _M.reload_keys()
    cached_keys = nil
    return _M.get_active_key() ~= nil
end

function _M.get_public_key_der()
    local active = _M.get_active_key()
    if not active then
        return nil
    end
    return active["public-key"]
end

function _M.get_private_key_der()
    local active = _M.get_active_key()
    if not active then
        return nil
    end
    return active["private-key"]
end

return _M
