# Keys for OpenResty Application-DPoP signing (runtime mount only).

## Required files

| File | Format | Purpose |
| --- | --- | --- |
| `private-key.der` | SPKI/PKCS8 DER (ES256) | Sign `Application-DPoP` in `sign.lua` |
| `public-key.der` | SPKI DER | Embedded in DPoP JWT `jwk` |
| `iam-key-id.txt` | plain text (one line) | Key id / kid used by Lua config |
| `iam-public-key.pem` | PEM | Served by `/keys/iam-public-key` for Shell JWT verify |

Do **not** commit private keys. Generate locally:

```bash
# Unix
./scripts/generate-sign-keys.sh

# Windows PowerShell
./scripts/generate-sign-keys.ps1
```

## PEM → DER (manual)

```bash
openssl ecparam -genkey -name prime256v1 -noout -out private-key.pem
openssl ec -in private-key.pem -pubout -out public-key.pem
openssl pkcs8 -topk8 -nocrypt -in private-key.pem -outform DER -out private-key.der
openssl ec -in private-key.pem -pubout -outform DER -out public-key.der
```

`iam-public-key.pem` for Token verify is usually the **IAM** public key (not the Application-DPoP key). For local smoke you may copy a known IAM PEM; production must inject the real IAM key.

## Docker

```bash
docker compose -f docker-compose.sign.yml up --build
# mount ./lua/keys → /usr/local/openresty/nginx/lua/keys:ro
```

For sign-only local testing, set Shell `VITE_BACKEND_ORIGIN=http://localhost:8088` (or your published port).
Full-stack local/dev should point `VITE_BACKEND_ORIGIN` at a host that also serves Context Path `/api` and `/auth` (same model as main-shell).
