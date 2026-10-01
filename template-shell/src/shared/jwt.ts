import { exportJWK, generateKeyPair, importSPKI, type JWK } from 'jose'
import type { DpopClient } from '@g2rain/http'
import { Generator } from './id'

async function cryptoKeyToJwk(key: CryptoKey): Promise<JWK> {
  return exportJWK(key)
}

export async function publicKeyStringToJwk(publicKey: string): Promise<JWK> {
  const key = await importSPKI(publicKey, 'ES256')
  return exportJWK(key)
}

export async function generateClient(): Promise<DpopClient> {
  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true })
  return {
    clientId: Generator.random(),
    publicKey: await cryptoKeyToJwk(publicKey),
    privateKey: await cryptoKeyToJwk(privateKey),
    isAuthenticated: false,
  }
}
