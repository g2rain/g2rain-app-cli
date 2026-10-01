# Generate local ES256 Application-DPoP keys for OpenResty (DER + kid file).
param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Keys = Join-Path $Root 'lua\keys'
New-Item -ItemType Directory -Path $Keys -Force | Out-Null

$privateDer = Join-Path $Keys 'private-key.der'
if ((Test-Path $privateDer) -and -not $Force) {
  Write-Error 'private-key.der already exists. Pass -Force to overwrite.'
}

$tmp = Join-Path $env:TEMP ("g2rain-sign-keys-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
try {
  $pemPriv = Join-Path $tmp 'private-key.pem'
  $pemPub = Join-Path $tmp 'public-key.pem'
  & openssl ecparam -genkey -name prime256v1 -noout -out $pemPriv
  & openssl ec -in $pemPriv -pubout -out $pemPub
  & openssl pkcs8 -topk8 -nocrypt -in $pemPriv -outform DER -out $privateDer
  & openssl ec -in $pemPriv -pubout -outform DER -out (Join-Path $Keys 'public-key.der')

  $hash = (& openssl dgst -sha256 (Join-Path $Keys 'public-key.der')) -join ' '
  $kid = ($hash -split '\s+')[-1].Substring(0, 32)
  Set-Content -Path (Join-Path $Keys 'iam-key-id.txt') -Value $kid -NoNewline

  $iamPem = Join-Path $Keys 'iam-public-key.pem'
  if (-not (Test-Path $iamPem)) {
    @"
-----BEGIN PUBLIC KEY-----
REPLACE_WITH_IAM_PUBLIC_KEY_PEM
-----END PUBLIC KEY-----
"@ | Set-Content -Path $iamPem -Encoding ascii
    Write-Host 'Wrote placeholder iam-public-key.pem — replace with real IAM PEM before SSO verify.'
  }

  Write-Host "Generated keys under $Keys (kid=$kid)"
}
finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
