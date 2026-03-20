import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY environment variable is required')
  // If key is 64 hex chars, decode as hex; otherwise hash it to get 32 bytes
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, 'hex')
  }
  return crypto.createHash('sha256').update(key).digest()
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  const result = Buffer.concat([iv, authTag, encrypted])
  return result.toString('base64')
}

export function decrypt(ciphertext: string): string {
  const key = getKey()
  const data = Buffer.from(ciphertext, 'base64')
  const iv = data.slice(0, IV_LENGTH)
  const authTag = data.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = data.slice(IV_LENGTH + AUTH_TAG_LENGTH)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}
