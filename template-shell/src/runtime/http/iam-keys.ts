import type { HttpClient } from '@g2rain/http'

let cachedIamKeyId: string | null = null
let cachedIamPublicKey: string | null = null

export function clearIamKeyCache(): void {
  cachedIamKeyId = null
  cachedIamPublicKey = null
}

export async function fetchIamKeyId(httpClient: HttpClient<true>): Promise<string> {
  if (cachedIamKeyId) return cachedIamKeyId

  const keyId = await httpClient.get<string>('/keys/iam-key-id')
  const text = (keyId as unknown as { data?: unknown }).data ?? keyId
  cachedIamKeyId = typeof text === 'string' ? text.trim() : null
  if (!cachedIamKeyId) {
    throw new Error('Failed to fetch IAM key ID: empty response')
  }
  return cachedIamKeyId
}

export async function fetchIamPublicKey(httpClient: HttpClient<true>): Promise<string> {
  if (cachedIamPublicKey) return cachedIamPublicKey

  const publicKey = await httpClient.get<string>('/keys/iam-public-key')
  const text = (publicKey as unknown as { data?: unknown }).data ?? publicKey
  cachedIamPublicKey = typeof text === 'string' ? text.trim() : null
  if (!cachedIamPublicKey) {
    throw new Error('Failed to fetch IAM public key: empty response')
  }
  return cachedIamPublicKey
}
