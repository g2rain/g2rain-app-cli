local cjson = require "cjson.safe"
local openssl = require "openssl"
local pkey_lib = require "openssl.pkey"
local digest_lib = require "openssl.digest"
local b64 = require "ngx.base64"
local _M = {}

-- Base64URL helper (binary input)
local function b64url(bin)
    if not bin then return nil end
    local s = ngx.encode_base64(bin)
    return s:gsub('+','-'):gsub('/','_'):gsub('=','')
end

-- sha256 (returns binary)
local function sha256_bin(data)
    local d = digest_lib.new("sha256")
    d:update(data or "")
    return d:final()
end


-- 解析DER长度
local function parse_len(data, i)
    local b = data:byte(i)
    if not b then return nil, "short input in parse_len" end
    if b < 0x80 then
        return b, i + 1
    end
    local n = b - 0x80
    if n <= 0 or n > 4 then return nil, "unsupported length bytes" end
    local len = 0
    for k = 1, n do
        local bb = data:byte(i + k)
        if not bb then return nil, "short input in parse_len body" end
        len = len * 256 + bb
    end
    return len, i + n + 1
end

-- 从SPKI DER格式中提取EC点（X，Y）
local function extract_ec_point_from_spki(der)
    if not der or #der < 1 then return nil, "empty der" end

    -- 确认开头是SEQUENCE标志 (0x30)
    local pos = 1
    if der:byte(pos) ~= 0x30 then return nil, "not SEQUENCE" end

    -- 解析SEQUENCE长度
    local top_len, next_pos = parse_len(der, pos + 1)
    if not next_pos then return nil, top_len end
    pos = next_pos

    -- 确认第二个SEQUENCE标志 (0x30)
    if der:byte(pos) ~= 0x30 then return nil, "AlgorithmIdentifier not SEQUENCE" end

    -- 解析算法标识符的长度
    local alg_len, alg_next = parse_len(der, pos + 1)
    if not alg_next then return nil, alg_len end
    pos = alg_next + alg_len - 1

    -- 确认BIT STRING标志 (0x03)
    if der:byte(pos + 1) ~= 0x03 then return nil, "BIT STRING not found" end

    -- 解析BIT STRING长度
    local bit_len, bit_next = parse_len(der, pos + 2)
    if not bit_next then return nil, bit_len end
    local unused = der:byte(bit_next)
    if unused ~= 0 then return nil, "unsupported unused bits" end

    -- 提取EC点数据
    local point_start = bit_next + 1
    local point = der:sub(point_start, point_start + bit_len - 2)
    if not point or #point < 1 then return nil, "empty EC point" end

    -- 确认是未压缩的EC点 (0x04)
    if point:byte(1) ~= 0x04 then return nil, "not uncompressed EC point" end

    -- 提取X和Y坐标
    local x = point:sub(2, 33)
    local y = point:sub(34, 65)

    -- 校验X和Y的长度是否正确
    if #x ~= 32 or #y ~= 32 then return nil, "unexpected coordinate length" end

    return x, y
end

-- Convert DER ECDSA signature -> raw R||S (64 bytes)
local function der_to_rs(der)
    if not der or #der < 8 then return nil, "der too short" end
    local pos = 1
    if der:byte(pos) ~= 0x30 then return nil, "not DER SEQUENCE" end
    pos = pos + 1
    local len = der:byte(pos); pos = pos + 1
    if len >= 0x80 then
        local n = len - 0x80
        len = 0
        for i = 1, n do
            len = len * 256 + der:byte(pos); pos = pos + 1
        end
    end
    if der:byte(pos) ~= 0x02 then return nil, "no R" end
    pos = pos + 1
    local rlen = der:byte(pos); pos = pos + 1
    if der:byte(pos) == 0x00 then pos = pos + 1; rlen = rlen - 1 end
    local r = der:sub(pos, pos + rlen - 1)
    pos = pos + rlen
    if der:byte(pos) ~= 0x02 then return nil, "no S" end
    pos = pos + 1
    local slen = der:byte(pos); pos = pos + 1
    if der:byte(pos) == 0x00 then pos = pos + 1; slen = slen - 1 end
    local s = der:sub(pos, pos + slen - 1)

    local function to32(v)
        if #v < 32 then return string.rep("\0", 32 - #v) .. v end
        if #v > 32 then return v:sub(#v - 31) end
        return v
    end

    return to32(r) .. to32(s)
end

-- Generate JWK from public DER
local function der_to_jwk(der)
    if not der then
        ngx.log(ngx.ERR, "no public der")
        return nil, "no public der"
    end

    ngx.log(ngx.ERR, "Attempting to load public key from DER")

    -- try to load pkey from DER using setPublicKey
    local ok, key = pcall(function()
        local pkey = pkey_lib.new()
        pkey:setPublicKey(der, "DER")  -- Correct method to set the public key
        return pkey
    end)

    if not ok or not key then
        ngx.log(ngx.ERR, "Failed to load public key. Error: ", tostring(key))
        return nil, "failed to load public key: " .. tostring(key)
    end

    ngx.log(ngx.ERR, "Successfully loaded public key")

    -- try extracting EC point from the DER
    local x, y = extract_ec_point_from_spki(der)
    if not x or not y then
        ngx.log(ngx.ERR, "Failed to extract EC point from SPKI DER")
        return nil, "failed to extract EC point"
    end

    ngx.log(ngx.ERR, "Successfully extracted EC point from DER")

    return {
        kty = "EC",
        crv = "P-256",
        x = b64url(x),
        y = b64url(y)
    }
end

-- ES256 sign: returns base64url(R||S)
local function sign_es256(private_der, signing_input)
    if not private_der then return nil, "no private der" end

    ngx.log(ngx.ERR, "Loading private key from DER")

    -- load private key from DER using setPrivateKey
    local ok, pkey_obj = pcall(function()
        local pkey = pkey_lib.new()
        pkey:setPrivateKey(private_der, "DER")  -- Correct method to set the private key
        return pkey
    end)

    if not ok or not pkey_obj then
        ngx.log(ngx.ERR, "Failed to load private key: ", tostring(pkey_obj))
        return nil, "failed to load private key: " .. tostring(pkey_obj)
    end

    ngx.log(ngx.ERR, "Successfully loaded private key")
    local hash = pkey_obj:getDefaultDigestName()
    ngx.log(ngx.ERR, "DefaultDigestName: ", tostring(hash))

    local md_ctx = digest_lib.new(hash)  -- Initialize the SHA256 context
    md_ctx:update(signing_input)  -- Update the context with the data to sign

    local  sig = pkey_obj:sign(md_ctx)
    if not sig then
        ngx.log(ngx.ERR, "Failed to sign with private key: ", tostring(sig))
        return nil, "sign failed: " .. tostring(sig)
    end

    ngx.log(ngx.ERR, "Successfully generated signature")

    if string.byte(sig, 1) == 0x30 then
        local rs, err = der_to_rs(sig)
        if not rs then return nil, "der_to_rs failed: " .. tostring(err) end
        sig = rs
    end

    return b64url(sig)
end

-- calculate pha = base64url(SHA256(body))
function _M.calculate_pha(body)
    body = body or ""
    return b64url(sha256_bin(body))
end

local function encode_json_b64url(obj)
    return b64url(cjson.encode(obj))
end

-- generate DPoP JWT
function _M.generate_jwt(payload, private_der, public_der, key_id)
    private_der = private_der or ""
    public_der = public_der or ""

    ngx.log(ngx.ERR, "Generating JWT...")

    local jwk, err = der_to_jwk(public_der)
    if not jwk then
        ngx.log(ngx.ERR, "der_to_jwk failed: ", err)
        return nil, "der_to_jwk failed: " .. tostring(err)
    end

    ngx.log(ngx.ERR, "JWK: ", cjson.encode(jwk))

    local kid = key_id or compute_kid(jwk)

    local header = {
        typ = "dpop+jwt",
        alg = "ES256",
        ph_alg = "SHA-256",
        jwk = jwk,
        kid = kid
    }

    local h = encode_json_b64url(header)
    local p = encode_json_b64url(payload)
    local signing_input = h .. "." .. p

    ngx.log(ngx.ERR, "Signing input: ", signing_input)

    local signature, serr = sign_es256(private_der, signing_input)
    if not signature then
        ngx.log(ngx.ERR, "Failed to sign JWT: ", serr)
        return nil, serr
    end

    return signing_input .. "." .. signature
end

-- generate with config active key
function _M.generate_jwt_with_config(payload)
    local config = require "config"
    local key = config.get_active_key()
    if not key then return nil, "no active key" end

    return _M.generate_jwt(
        payload,
        key["private-key"],
        key["public-key"],
        key["key-id"]
    )
end

return _M