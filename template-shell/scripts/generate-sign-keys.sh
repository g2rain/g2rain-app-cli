#!/usr/bin/env bash
# Generate local ES256 Application-DPoP keys for OpenResty (DER + kid file).
# Does NOT overwrite existing private-key.der unless FORCE=1.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEYS="$ROOT/lua/keys"
mkdir -p "$KEYS"

if [[ -f "$KEYS/private-key.der" && "${FORCE:-0}" != "1" ]]; then
  echo "private-key.der already exists. Set FORCE=1 to overwrite."
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

openssl ecparam -genkey -name prime256v1 -noout -out "$TMP/private-key.pem"
openssl ec -in "$TMP/private-key.pem" -pubout -out "$TMP/public-key.pem"
openssl pkcs8 -topk8 -nocrypt -in "$TMP/private-key.pem" -outform DER -out "$KEYS/private-key.der"
openssl ec -in "$TMP/private-key.pem" -pubout -outform DER -out "$KEYS/public-key.der"

# Dev kid: stable short hash of public DER (not a production rotation id)
if command -v sha256sum >/dev/null 2>&1; then
  KID="$(sha256sum "$KEYS/public-key.der" | awk '{print substr($1,1,32)}')"
else
  KID="$(openssl dgst -sha256 "$KEYS/public-key.der" | awk '{print substr($NF,1,32)}')"
fi
printf '%s\n' "$KID" > "$KEYS/iam-key-id.txt"

if [[ ! -f "$KEYS/iam-public-key.pem" ]]; then
  cat > "$KEYS/iam-public-key.pem" <<'EOF'
-----BEGIN PUBLIC KEY-----
REPLACE_WITH_IAM_PUBLIC_KEY_PEM
-----END PUBLIC KEY-----
EOF
  echo "Wrote placeholder iam-public-key.pem — replace with real IAM PEM before SSO verify."
fi

chmod 600 "$KEYS/private-key.der" 2>/dev/null || true
chmod 644 "$KEYS/public-key.der" "$KEYS/iam-key-id.txt" 2>/dev/null || true

echo "Generated:"
echo "  $KEYS/private-key.der"
echo "  $KEYS/public-key.der"
echo "  $KEYS/iam-key-id.txt ($KID)"
