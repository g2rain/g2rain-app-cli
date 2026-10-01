local _M = {}

local KEY_BASE_PATH = "/usr/local/openresty/nginx/lua/keys"
local PUBLIC_KEY_FILE = KEY_BASE_PATH .. "/public-key.der"
local PRIVATE_KEY_FILE = KEY_BASE_PATH .. "/private-key.der"

local function read_file(file_path)
    local file, err = io.open(file_path, "rb")
    if not file then
        ngx.log(ngx.ERR, "Failed to open file: ", file_path, " Error: ", err)
        return nil
    end

    local content = file:read("*all")
    file:close()

    if content then
        ngx.log(ngx.ERR, "Successfully read file: ", file_path)
    else
        ngx.log(ngx.ERR, "Failed to read content from file: ", file_path)
    end

    return content
end

local function load_keys()
    local public_key = read_file(PUBLIC_KEY_FILE)
    local private_key = read_file(PRIVATE_KEY_FILE)

    if not public_key or not private_key then
        ngx.log(ngx.ERR, "Failed to load keys from files")
        return nil
    end

    local application_code = "{{PROJECT_NAME}}"
    local ok, env_value = pcall(function()
        return os.getenv("APPLICATION_CODE")
    end)
    if ok and env_value then
        application_code = env_value
    end

    return {
        {
            ["key-id"] = "yEMzeGLlhMpK5GxQKP5Fhg7JH9eALB7BK2BkadTOUxw",
            algorithm = "ES256",
            active = true,
            applicationCode = application_code,
            ["public-key"] = public_key,
            ["private-key"] = private_key
        }
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
    local public_key = _M.get_active_key()["public-key"]
    if not public_key then
        ngx.log(ngx.ERR, "No public key found in active key configuration.")
        return nil
    end
    ngx.log(ngx.ERR, "Returning public key (DER format).")
    return public_key
end

function _M.get_private_key_der()
    local private_key = _M.get_active_key()["private-key"]
    if not private_key then
        ngx.log(ngx.ERR, "No private key found in active key configuration.")
        return nil
    end
    ngx.log(ngx.ERR, "Returning private key (DER format).")
    return private_key
end

return _M

