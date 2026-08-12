export function parseFileId(pathname: string): string | null {
  const encodedFileId = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  if (!encodedFileId) {
    return null;
  }

  let decodedFileId: string;
  try {
    decodedFileId = decodeURIComponent(encodedFileId);
  } catch {
    return null;
  }

  if (!decodedFileId || decodedFileId.includes('/')) {
    return null;
  }

  return decodedFileId;
}

export function parsePathSegments(pathname: string): string[] | null {
  const normalized = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  if (!normalized) {
    return [];
  }

  const rawSegments = normalized.split('/');
  const decodedSegments: string[] = [];

  for (const segment of rawSegments) {
    if (!segment) {
      return null;
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return null;
    }

    if (!decoded || decoded.includes('/')) {
      return null;
    }

    decodedSegments.push(decoded);
  }

  return decodedSegments;
}