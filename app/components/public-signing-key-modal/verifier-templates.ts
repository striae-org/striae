export const DEFAULT_EXPECTED_KEY_ID = 'REPLACE_WITH_KEY_ID_FROM_MODAL';

export const POWER_SHELL_COMMAND_EXAMPLES = {
  case:
    '.\\verify-striae-export.ps1 -PublicKeyPath .\\striae-public-key.pem -CaseManifestPath .\\FORENSIC_MANIFEST.json',
  confirmation:
    '.\\verify-striae-export.ps1 -PublicKeyPath .\\striae-public-key.pem -ConfirmationPath .\\confirmation-data.json'
} as const;

export const APPLE_COMMAND_EXAMPLES = {
  case:
    'python3 verify-striae-export.py --public-key ./striae-public-key.pem --case-manifest ./FORENSIC_MANIFEST.json',
  confirmation:
    'python3 verify-striae-export.py --public-key ./striae-public-key.pem --confirmation ./confirmation-data.json'
} as const;

export const createPowerShellVerifierTemplate = (expectedKeyId: string): string => {
  const safeExpectedKeyId = expectedKeyId.replace(/'/g, "''");

  return `# verify-striae-export.ps1
# Usage examples:
#   .\\verify-striae-export.ps1 -PublicKeyPath .\\striae-public-key.pem -CaseManifestPath .\\FORENSIC_MANIFEST.json
#   .\\verify-striae-export.ps1 -PublicKeyPath .\\striae-public-key.pem -ConfirmationPath .\\confirmation-data.json

param(
  [Parameter(Mandatory = $true)]
  [string]$PublicKeyPath,
  [string]$CaseManifestPath,
  [string]$ConfirmationPath
)

$ExpectedAlgorithm = 'RSASSA-PKCS1-v1_5-SHA-256'
$ExpectedSignatureVersion = '2.0'
$ExpectedKeyId = '${safeExpectedKeyId}'

if (-not $CaseManifestPath -and -not $ConfirmationPath) {
  Write-Error 'Provide either -CaseManifestPath or -ConfirmationPath.'
  exit 1
}

if ($CaseManifestPath -and $ConfirmationPath) {
  Write-Error 'Use only one mode at a time: case or confirmation.'
  exit 1
}

if (-not (Get-Command openssl -ErrorAction SilentlyContinue)) {
  Write-Error 'OpenSSL is required and was not found in PATH.'
  exit 1
}

function Convert-Base64UrlToBytes {
  param([string]$Value)

  $base64 = $Value.Replace('-', '+').Replace('_', '/')
  switch ($base64.Length % 4) {
    2 { $base64 += '==' }
    3 { $base64 += '=' }
    default { }
  }

  return [System.Convert]::FromBase64String($base64)
}

function Get-Sha256Upper {
  param([string]$Text)

  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $hashBytes = [System.Security.Cryptography.SHA256]::HashData($bytes)
  return (($hashBytes | ForEach-Object { $_.ToString('x2') }) -join '').ToUpperInvariant()
}

function Invoke-OpenSslVerify {
  param(
    [string]$PayloadPath,
    [string]$SignaturePath
  )

  & openssl dgst -sha256 -verify $PublicKeyPath -signature $SignaturePath $PayloadPath
  if ($LASTEXITCODE -ne 0) {
    Write-Output 'Signature check: FAIL'
    exit 1
  }

  Write-Output 'Signature check: PASS'
}

if ($CaseManifestPath) {
  $manifest = Get-Content -Path $CaseManifestPath -Raw | ConvertFrom-Json -Depth 100

  if ($null -eq $manifest.signature) {
    throw 'Missing manifest.signature'
  }
  if ([string]$manifest.signature.algorithm -ne $ExpectedAlgorithm) {
    throw 'Algorithm mismatch'
  }
  if ([string]$manifest.signature.keyId -ne $ExpectedKeyId) {
    throw 'Key ID mismatch'
  }

  $sortedImageHashes = [ordered]@{}
  foreach ($fileName in ($manifest.imageHashes.PSObject.Properties.Name | Sort-Object)) {
    $sortedImageHashes[$fileName] = ([string]$manifest.imageHashes.PSObject.Properties[$fileName].Value).ToLowerInvariant()
  }

  $canonicalPayload = [ordered]@{
    manifestVersion = [string]$manifest.manifestVersion
    dataHash = ([string]$manifest.dataHash).ToLowerInvariant()
    imageHashes = $sortedImageHashes
    manifestHash = ([string]$manifest.manifestHash).ToLowerInvariant()
    totalFiles = $manifest.totalFiles
    createdAt = [string]$manifest.createdAt
  }

  $payloadJson = $canonicalPayload | ConvertTo-Json -Depth 100 -Compress
  Set-Content -Path 'case-payload.json' -Value $payloadJson -NoNewline

  [System.IO.File]::WriteAllBytes('case-signature.bin', (Convert-Base64UrlToBytes -Value ([string]$manifest.signature.value)))

  Invoke-OpenSslVerify -PayloadPath 'case-payload.json' -SignaturePath 'case-signature.bin'
  Write-Output 'Verification result: PASS'
  exit 0
}

$confirmationData = Get-Content -Path $ConfirmationPath -Raw | ConvertFrom-Json -Depth 100

if ($null -eq $confirmationData.metadata -or $null -eq $confirmationData.metadata.signature) {
  throw 'Missing metadata.signature'
}
if ([string]$confirmationData.metadata.signature.algorithm -ne $ExpectedAlgorithm) {
  throw 'Algorithm mismatch'
}
if ([string]$confirmationData.metadata.signatureVersion -ne $ExpectedSignatureVersion) {
  throw 'Unsupported signatureVersion'
}
if ([string]$confirmationData.metadata.signature.keyId -ne $ExpectedKeyId) {
  throw 'Key ID mismatch'
}

$unsignedMetadata = [ordered]@{
  caseNumber = [string]$confirmationData.metadata.caseNumber
  exportDate = [string]$confirmationData.metadata.exportDate
  exportedBy = [string]$confirmationData.metadata.exportedBy
  exportedByUid = [string]$confirmationData.metadata.exportedByUid
  exportedByName = [string]$confirmationData.metadata.exportedByName
  exportedByCompany = [string]$confirmationData.metadata.exportedByCompany
  totalConfirmations = $confirmationData.metadata.totalConfirmations
  version = [string]$confirmationData.metadata.version
}

if ($null -ne $confirmationData.metadata.originalExportCreatedAt -and [string]$confirmationData.metadata.originalExportCreatedAt -ne '') {
  $unsignedMetadata.originalExportCreatedAt = [string]$confirmationData.metadata.originalExportCreatedAt
}

$unsignedExport = [ordered]@{
  metadata = $unsignedMetadata
  confirmations = $confirmationData.confirmations
}

$unsignedJson = $unsignedExport | ConvertTo-Json -Depth 100
$unsignedJson = $unsignedJson -replace "\\r\\n", "\\n"

$recomputedHash = Get-Sha256Upper -Text $unsignedJson
$exportHash = ([string]$confirmationData.metadata.hash).ToUpperInvariant()

if ($recomputedHash -eq $exportHash) {
  Write-Output 'Hash check: PASS'
} else {
  Write-Output 'Hash check: FAIL'
  exit 1
}

$sortedConfirmations = [ordered]@{}
foreach ($imageId in ($confirmationData.confirmations.PSObject.Properties.Name | Sort-Object)) {
  $rawEntries = @($confirmationData.confirmations.PSObject.Properties[$imageId].Value)
  $normalizedEntries = @(
    $rawEntries |
      ForEach-Object {
        [ordered]@{
          fullName = [string]$_.fullName
          badgeId = [string]$_.badgeId
          timestamp = [string]$_.timestamp
          confirmationId = [string]$_.confirmationId
          confirmedBy = [string]$_.confirmedBy
          confirmedByEmail = [string]$_.confirmedByEmail
          confirmedByCompany = [string]$_.confirmedByCompany
          confirmedAt = [string]$_.confirmedAt
        }
      } |
      Sort-Object -Property @{ Expression = { [string]$_.confirmationId + '|' + [string]$_.confirmedAt + '|' + [string]$_.confirmedBy } }
  )

  $sortedConfirmations[$imageId] = $normalizedEntries
}

$canonicalMetadata = [ordered]@{
  caseNumber = [string]$confirmationData.metadata.caseNumber
  exportDate = [string]$confirmationData.metadata.exportDate
  exportedBy = [string]$confirmationData.metadata.exportedBy
  exportedByUid = [string]$confirmationData.metadata.exportedByUid
  exportedByName = [string]$confirmationData.metadata.exportedByName
  exportedByCompany = [string]$confirmationData.metadata.exportedByCompany
  totalConfirmations = $confirmationData.metadata.totalConfirmations
  version = [string]$confirmationData.metadata.version
  hash = ([string]$confirmationData.metadata.hash).ToUpperInvariant()
}

if ($null -ne $confirmationData.metadata.originalExportCreatedAt -and [string]$confirmationData.metadata.originalExportCreatedAt -ne '') {
  $canonicalMetadata.originalExportCreatedAt = [string]$confirmationData.metadata.originalExportCreatedAt
}

$canonicalPayload = [ordered]@{
  signatureVersion = [string]$confirmationData.metadata.signatureVersion
  metadata = $canonicalMetadata
  confirmations = $sortedConfirmations
}

$payloadJson = $canonicalPayload | ConvertTo-Json -Depth 100 -Compress
Set-Content -Path 'confirmation-payload.json' -Value $payloadJson -NoNewline

[System.IO.File]::WriteAllBytes('confirmation-signature.bin', (Convert-Base64UrlToBytes -Value ([string]$confirmationData.metadata.signature.value)))

Invoke-OpenSslVerify -PayloadPath 'confirmation-payload.json' -SignaturePath 'confirmation-signature.bin'
Write-Output 'Verification result: PASS'
`;
};

export const createAppleVerifierTemplate = (expectedKeyId: string): string => {
  const expectedKeyIdLiteral = JSON.stringify(expectedKeyId);

  return `#!/usr/bin/env python3
# verify-striae-export.py
# Usage examples:
#   python3 verify-striae-export.py --public-key ./striae-public-key.pem --case-manifest ./FORENSIC_MANIFEST.json
#   python3 verify-striae-export.py --public-key ./striae-public-key.pem --confirmation ./confirmation-data.json

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import subprocess
import sys
from pathlib import Path

EXPECTED_ALGORITHM = "RSASSA-PKCS1-v1_5-SHA-256"
EXPECTED_SIGNATURE_VERSION = "2.0"
EXPECTED_KEY_ID = ${expectedKeyIdLiteral}


def decode_base64url(value: str) -> bytes:
  value = value.strip()
  padding = "=" * ((4 - (len(value) % 4)) % 4)
  return base64.urlsafe_b64decode((value + padding).encode("ascii"))


def to_compact_json(payload: object) -> str:
  return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def to_pretty_json(payload: object) -> str:
  return json.dumps(payload, ensure_ascii=False, indent=2)


def verify_with_openssl(public_key: str, signature_path: str, payload_path: str) -> None:
  result = subprocess.run(
    [
      "openssl",
      "dgst",
      "-sha256",
      "-verify",
      public_key,
      "-signature",
      signature_path,
      payload_path,
    ],
    capture_output=True,
    text=True,
    check=False,
  )

  if result.returncode != 0:
    print("Signature check: FAIL")
    sys.exit(1)

  print("Signature check: PASS")


def build_manifest_payload(manifest: dict) -> str:
  image_hashes = {
    file_name: str(hash_value).lower()
    for file_name, hash_value in sorted((manifest.get("imageHashes") or {}).items(), key=lambda item: item[0])
  }

  canonical = {
    "manifestVersion": manifest.get("manifestVersion"),
    "dataHash": str(manifest.get("dataHash", "")).lower(),
    "imageHashes": image_hashes,
    "manifestHash": str(manifest.get("manifestHash", "")).lower(),
    "totalFiles": manifest.get("totalFiles"),
    "createdAt": manifest.get("createdAt"),
  }

  return to_compact_json(canonical)


def build_unsigned_confirmation_payload(confirmation_data: dict) -> dict:
  metadata = confirmation_data.get("metadata", {})
  unsigned_metadata = {
    "caseNumber": metadata.get("caseNumber"),
    "exportDate": metadata.get("exportDate"),
    "exportedBy": metadata.get("exportedBy"),
    "exportedByUid": metadata.get("exportedByUid"),
    "exportedByName": metadata.get("exportedByName"),
    "exportedByCompany": metadata.get("exportedByCompany"),
    "totalConfirmations": metadata.get("totalConfirmations"),
    "version": metadata.get("version"),
  }

  if metadata.get("originalExportCreatedAt"):
    unsigned_metadata["originalExportCreatedAt"] = metadata.get("originalExportCreatedAt")

  return {
    "metadata": unsigned_metadata,
    "confirmations": confirmation_data.get("confirmations", {}),
  }


def build_confirmation_payload(confirmation_data: dict) -> str:
  metadata = confirmation_data.get("metadata", {})
  confirmations = confirmation_data.get("confirmations") or {}

  normalized_confirmations = {}
  for image_id in sorted(confirmations.keys()):
    raw_entries = confirmations.get(image_id) or []
    normalized_entries = [
      {
        "fullName": entry.get("fullName"),
        "badgeId": entry.get("badgeId"),
        "timestamp": entry.get("timestamp"),
        "confirmationId": entry.get("confirmationId"),
        "confirmedBy": entry.get("confirmedBy"),
        "confirmedByEmail": entry.get("confirmedByEmail"),
        "confirmedByCompany": entry.get("confirmedByCompany"),
        "confirmedAt": entry.get("confirmedAt"),
      }
      for entry in raw_entries
    ]
    normalized_entries.sort(
      key=lambda entry: "|".join(
        [
          str(entry.get("confirmationId") or ""),
          str(entry.get("confirmedAt") or ""),
          str(entry.get("confirmedBy") or ""),
        ]
      )
    )
    normalized_confirmations[image_id] = normalized_entries

  canonical_metadata = {
    "caseNumber": metadata.get("caseNumber"),
    "exportDate": metadata.get("exportDate"),
    "exportedBy": metadata.get("exportedBy"),
    "exportedByUid": metadata.get("exportedByUid"),
    "exportedByName": metadata.get("exportedByName"),
    "exportedByCompany": metadata.get("exportedByCompany"),
    "totalConfirmations": metadata.get("totalConfirmations"),
    "version": metadata.get("version"),
    "hash": str(metadata.get("hash") or "").upper(),
  }

  if metadata.get("originalExportCreatedAt"):
    canonical_metadata["originalExportCreatedAt"] = metadata.get("originalExportCreatedAt")

  canonical = {
    "signatureVersion": metadata.get("signatureVersion"),
    "metadata": canonical_metadata,
    "confirmations": normalized_confirmations,
  }

  return to_compact_json(canonical)


def verify_case_export(public_key: str, manifest_path: str) -> None:
  manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
  signature = manifest.get("signature")
  if not isinstance(signature, dict):
    raise ValueError("Missing manifest.signature")
  if str(signature.get("algorithm") or "") != EXPECTED_ALGORITHM:
    raise ValueError("Algorithm mismatch")
  if str(signature.get("keyId") or "") != EXPECTED_KEY_ID:
    raise ValueError("Key ID mismatch")

  payload = build_manifest_payload(manifest)
  Path("case-payload.json").write_text(payload, encoding="utf-8", newline="")
  Path("case-signature.bin").write_bytes(decode_base64url(str(signature.get("value") or "")))

  verify_with_openssl(public_key, "case-signature.bin", "case-payload.json")
  print("Verification result: PASS")


def verify_confirmation_export(public_key: str, confirmation_path: str) -> None:
  confirmation_data = json.loads(Path(confirmation_path).read_text(encoding="utf-8"))
  metadata = confirmation_data.get("metadata") or {}
  signature = metadata.get("signature")

  if not isinstance(signature, dict):
    raise ValueError("Missing metadata.signature")
  if str(signature.get("algorithm") or "") != EXPECTED_ALGORITHM:
    raise ValueError("Algorithm mismatch")
  if str(metadata.get("signatureVersion") or "") != EXPECTED_SIGNATURE_VERSION:
    raise ValueError("Unsupported signatureVersion")
  if str(signature.get("keyId") or "") != EXPECTED_KEY_ID:
    raise ValueError("Key ID mismatch")

  unsigned_payload = build_unsigned_confirmation_payload(confirmation_data)
  unsigned_json = to_pretty_json(unsigned_payload)
  recomputed_hash = hashlib.sha256(unsigned_json.encode("utf-8")).hexdigest().upper()
  export_hash = str(metadata.get("hash") or "").upper()

  if recomputed_hash == export_hash:
    print("Hash check: PASS")
  else:
    print("Hash check: FAIL")
    sys.exit(1)

  payload = build_confirmation_payload(confirmation_data)
  Path("confirmation-payload.json").write_text(payload, encoding="utf-8", newline="")
  Path("confirmation-signature.bin").write_bytes(decode_base64url(str(signature.get("value") or "")))

  verify_with_openssl(public_key, "confirmation-signature.bin", "confirmation-payload.json")
  print("Verification result: PASS")


def main() -> None:
  parser = argparse.ArgumentParser(description="Verify Striae export signatures with OpenSSL")
  parser.add_argument("--public-key", required=True, help="Path to Striae public key PEM")
  mode = parser.add_mutually_exclusive_group(required=True)
  mode.add_argument("--case-manifest", help="Path to FORENSIC_MANIFEST.json")
  mode.add_argument("--confirmation", help="Path to confirmation-data JSON")
  args = parser.parse_args()

  if args.case_manifest:
    verify_case_export(args.public_key, args.case_manifest)
  else:
    verify_confirmation_export(args.public_key, args.confirmation)


if __name__ == "__main__":
  try:
    main()
  except Exception as error:
    print(f"Verification error: {error}")
    sys.exit(1)
`;
};