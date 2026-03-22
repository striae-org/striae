import type { User } from 'firebase/auth';
import type { ConfirmationImportData } from '~/types';

import { fetchDataApi } from '../../api';
import {
  AUDIT_EXPORT_SIGNATURE_VERSION,
  type AuditExportSigningPayload,
  isValidAuditExportSigningPayload
} from '../../forensics/audit-export-signature';
import { CONFIRMATION_SIGNATURE_VERSION } from '../../forensics/confirmation-signature';
import {
  type ForensicManifestData,
  type ForensicManifestSignature,
  FORENSIC_MANIFEST_VERSION
} from '../../forensics/SHA256';
import { canAccessCase, validateUserSession } from '../permissions';
import type {
  AuditExportSigningResponse,
  ConfirmationSigningResponse,
  ManifestSigningResponse
} from './types';

/**
 * Request a server-side signature for a forensic manifest.
 */
export const signForensicManifest = async (
  user: User,
  caseNumber: string,
  manifest: ForensicManifestData
): Promise<ManifestSigningResponse> => {
  try {
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    const accessCheck = await canAccessCase(user, caseNumber);
    if (!accessCheck.allowed) {
      throw new Error(`Manifest signing denied: ${accessCheck.reason}`);
    }

    const response = await fetchDataApi(user, '/api/forensic/sign-manifest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: user.uid,
        caseNumber,
        manifest
      })
    });

    const responseData = await response.json().catch(() => null) as {
      success?: boolean;
      error?: string;
      manifestVersion?: string;
      signature?: ForensicManifestSignature;
    } | null;

    if (!response.ok) {
      throw new Error(
        responseData?.error ||
        `Failed to sign forensic manifest: ${response.status} ${response.statusText}`
      );
    }

    if (!responseData?.success || !responseData.signature || !responseData.manifestVersion) {
      throw new Error('Invalid manifest signing response from data worker');
    }

    if (responseData.manifestVersion !== FORENSIC_MANIFEST_VERSION) {
      throw new Error(
        `Unexpected manifest version from signer: ${responseData.manifestVersion}`
      );
    }

    return {
      manifestVersion: responseData.manifestVersion,
      signature: responseData.signature
    };
  } catch (error) {
    console.error(`Error signing forensic manifest for ${caseNumber}:`, error);
    throw error;
  }
};

/**
 * Request a server-side signature for confirmation export data.
 */
export const signConfirmationData = async (
  user: User,
  caseNumber: string,
  confirmationData: ConfirmationImportData
): Promise<ConfirmationSigningResponse> => {
  try {
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    const accessCheck = await canAccessCase(user, caseNumber);
    if (!accessCheck.allowed) {
      throw new Error(`Confirmation signing denied: ${accessCheck.reason}`);
    }

    const response = await fetchDataApi(user, '/api/forensic/sign-confirmation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: user.uid,
        caseNumber,
        confirmationData,
        signatureVersion: CONFIRMATION_SIGNATURE_VERSION
      })
    });

    const responseData = await response.json().catch(() => null) as {
      success?: boolean;
      error?: string;
      signatureVersion?: string;
      signature?: ForensicManifestSignature;
    } | null;

    if (!response.ok) {
      throw new Error(
        responseData?.error ||
        `Failed to sign confirmation data: ${response.status} ${response.statusText}`
      );
    }

    if (!responseData?.success || !responseData.signature || !responseData.signatureVersion) {
      throw new Error('Invalid confirmation signing response from data worker');
    }

    if (responseData.signatureVersion !== CONFIRMATION_SIGNATURE_VERSION) {
      throw new Error(
        `Unexpected confirmation signature version from signer: ${responseData.signatureVersion}`
      );
    }

    return {
      signatureVersion: responseData.signatureVersion,
      signature: responseData.signature
    };
  } catch (error) {
    console.error(`Error signing confirmation data for ${caseNumber}:`, error);
    throw error;
  }
};

/**
 * Request a server-side signature for audit export metadata.
 */
export const signAuditExportData = async (
  user: User,
  auditExport: AuditExportSigningPayload,
  options: { caseNumber?: string } = {}
): Promise<AuditExportSigningResponse> => {
  try {
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    if (!isValidAuditExportSigningPayload(auditExport)) {
      throw new Error('Invalid audit export payload for signing');
    }

    const caseNumber = options.caseNumber;
    if (caseNumber) {
      const accessCheck = await canAccessCase(user, caseNumber);
      if (!accessCheck.allowed) {
        throw new Error(`Audit export signing denied: ${accessCheck.reason}`);
      }
    }

    const response = await fetchDataApi(user, '/api/forensic/sign-audit-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: user.uid,
        caseNumber,
        auditExport,
        signatureVersion: AUDIT_EXPORT_SIGNATURE_VERSION
      })
    });

    const responseData = await response.json().catch(() => null) as {
      success?: boolean;
      error?: string;
      signatureVersion?: string;
      signature?: ForensicManifestSignature;
    } | null;

    if (!response.ok) {
      throw new Error(
        responseData?.error ||
        `Failed to sign audit export data: ${response.status} ${response.statusText}`
      );
    }

    if (!responseData?.success || !responseData.signature || !responseData.signatureVersion) {
      throw new Error('Invalid audit export signing response from data worker');
    }

    if (responseData.signatureVersion !== AUDIT_EXPORT_SIGNATURE_VERSION) {
      throw new Error(
        `Unexpected audit export signature version from signer: ${responseData.signatureVersion}`
      );
    }

    return {
      signatureVersion: responseData.signatureVersion,
      signature: responseData.signature
    };
  } catch (error) {
    console.error('Error signing audit export data:', error);
    throw error;
  }
};
