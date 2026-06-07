#!/usr/bin/env node

/**
 * Encrypts a key registry JSON file with AES-256-GCM for R2 storage.
 *
 * Usage:
 *   node scripts/encrypt-registry.mjs <input-file> [output-file]
 *
 * Reads REGISTRY_ENCRYPTION_KEY from environment (base64-encoded 32 bytes).
 * If output-file is omitted, writes to stdout.
 *
 * The output envelope matches the format expected by
 * shared/registry/registry-encryption.ts (decryptRegistryJson).
 */

import { createCipheriv, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

function base64UrlEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function encryptRegistry(plaintextJson, keyBase64) {
  // Decode key (accept both standard base64 and base64url)
  const keyBuffer = Buffer.from(
    keyBase64.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  );

  if (keyBuffer.length !== 32) {
    throw new Error(
      `REGISTRY_ENCRYPTION_KEY must decode to 32 bytes, got ${keyBuffer.length}`
    );
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintextJson, 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  // AES-GCM ciphertext in WebCrypto includes the auth tag appended
  const ciphertextWithTag = Buffer.concat([encrypted, authTag]);

  return JSON.stringify(
    {
      encrypted: true,
      algorithm: 'AES-256-GCM',
      version: '1.0',
      iv: base64UrlEncode(iv),
      ciphertext: base64UrlEncode(ciphertextWithTag)
    },
    null,
    2
  );
}

// --- Main ---

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile) {
  console.error('Usage: node scripts/encrypt-registry.mjs <input-file> [output-file]');
  process.exit(1);
}

const keyBase64 = process.env.REGISTRY_ENCRYPTION_KEY;
if (!keyBase64) {
  console.error('Error: REGISTRY_ENCRYPTION_KEY environment variable is not set');
  process.exit(1);
}

let plaintext;
try {
  plaintext = readFileSync(inputFile, 'utf8');
} catch (err) {
  console.error(`Error reading input file: ${err.message}`);
  process.exit(1);
}

// Validate that input is valid JSON
try {
  JSON.parse(plaintext);
} catch {
  console.error('Error: input file is not valid JSON');
  process.exit(1);
}

const envelope = encryptRegistry(plaintext, keyBase64);

if (outputFile) {
  writeFileSync(outputFile, envelope, 'utf8');
} else {
  process.stdout.write(envelope);
}
