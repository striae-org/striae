export interface ClipboardCopyResult {
  copied: boolean;
  error?: unknown;
}

function copyTextWithExecCommand(text: string): boolean {
  if (typeof document === 'undefined' || !document.body) {
    return false;
  }

  const tempTextarea = document.createElement('textarea');
  tempTextarea.value = text;
  tempTextarea.setAttribute('readonly', '');
  tempTextarea.style.position = 'fixed';
  tempTextarea.style.left = '-9999px';
  tempTextarea.style.opacity = '0';
  tempTextarea.style.pointerEvents = 'none';

  document.body.appendChild(tempTextarea);
  tempTextarea.focus();
  tempTextarea.select();
  tempTextarea.setSelectionRange(0, tempTextarea.value.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } finally {
    document.body.removeChild(tempTextarea);
  }

  return copied;
}

export async function copyTextToClipboard(text: string): Promise<ClipboardCopyResult> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return { copied: true };
    } catch (error) {
      const copied = copyTextWithExecCommand(text);
      return copied ? { copied: true } : { copied: false, error };
    }
  }

  return { copied: copyTextWithExecCommand(text) };
}