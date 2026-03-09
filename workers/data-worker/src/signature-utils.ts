export interface WorkerSignatureEnvelope {
  algorithm: string;
  keyId: string;
  signedAt: string;
  value: string;
}

function base64UrlEncode(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function parsePkcs8PrivateKey(privateKey: string): ArrayBuffer {
  const normalizedKey = privateKey
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\n/g, '\n');

  const pemBody = normalizedKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');

  if (!pemBody) {
    throw new Error('Manifest signing private key is invalid');
  }

  const binary = atob(pemBody);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

export async function signPayload(
  payload: string,
  privateKey: string | undefined,
  keyId: string | undefined,
  algorithm: string,
  missingSecretsError: string = 'Manifest signing secrets are not configured'
): Promise<WorkerSignatureEnvelope> {
  if (!privateKey || !keyId) {
    throw new Error(missingSecretsError);
  }

  const signingKey = await crypto.subtle.importKey(
    'pkcs8',
    parsePkcs8PrivateKey(privateKey),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    signingKey,
    new TextEncoder().encode(payload)
  );

  return {
    algorithm,
    keyId,
    signedAt: new Date().toISOString(),
    value: base64UrlEncode(new Uint8Array(signature))
  };
}
