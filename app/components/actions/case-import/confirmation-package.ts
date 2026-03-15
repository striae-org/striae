import { type ConfirmationImportData } from '~/types';

const CONFIRMATION_EXPORT_FILE_REGEX = /^confirmation-data-.*\.json$/i;

export interface ConfirmationImportPackage {
  confirmationData: ConfirmationImportData;
  confirmationJsonContent: string;
  verificationPublicKeyPem?: string;
  confirmationFileName: string;
}

function getLeafFileName(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : path;
}

function selectPreferredPemPath(pemPaths: string[]): string | undefined {
  if (pemPaths.length === 0) {
    return undefined;
  }

  const sortedPaths = [...pemPaths].sort((left, right) => left.localeCompare(right));
  const preferred = sortedPaths.find((path) =>
    /^striae-public-signing-key.*\.pem$/i.test(getLeafFileName(path))
  );

  return preferred ?? sortedPaths[0];
}

async function extractConfirmationPackageFromZip(file: File): Promise<ConfirmationImportPackage> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const fileEntries = Object.keys(zip.files).filter((path) => !zip.files[path].dir);

  const confirmationPaths = fileEntries.filter((path) =>
    CONFIRMATION_EXPORT_FILE_REGEX.test(getLeafFileName(path))
  );

  if (confirmationPaths.length !== 1) {
    throw new Error('Confirmation ZIP must contain exactly one confirmation-data JSON file.');
  }

  const confirmationPath = confirmationPaths[0];
  const confirmationJsonContent = await zip.file(confirmationPath)?.async('text');
  if (!confirmationJsonContent) {
    throw new Error('Failed to read confirmation JSON from ZIP package.');
  }

  const confirmationData = JSON.parse(confirmationJsonContent) as ConfirmationImportData;

  const pemPaths = fileEntries.filter((path) => getLeafFileName(path).toLowerCase().endsWith('.pem'));
  const preferredPemPath = selectPreferredPemPath(pemPaths);

  let verificationPublicKeyPem: string | undefined;
  if (preferredPemPath) {
    verificationPublicKeyPem = await zip.file(preferredPemPath)?.async('text');
  }

  return {
    confirmationData,
    confirmationJsonContent,
    verificationPublicKeyPem,
    confirmationFileName: getLeafFileName(confirmationPath)
  };
}

export async function extractConfirmationImportPackage(file: File): Promise<ConfirmationImportPackage> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.json')) {
    const confirmationJsonContent = await file.text();
    const confirmationData = JSON.parse(confirmationJsonContent) as ConfirmationImportData;

    return {
      confirmationData,
      confirmationJsonContent,
      confirmationFileName: file.name
    };
  }

  if (lowerName.endsWith('.zip')) {
    return extractConfirmationPackageFromZip(file);
  }

  throw new Error('Unsupported confirmation import file type. Use a confirmation JSON or confirmation ZIP file.');
}
