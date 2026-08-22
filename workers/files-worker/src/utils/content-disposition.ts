export function deriveFileKind(contentType: string): string {
	if (contentType.startsWith('image/')) {
		return 'image';
	}

	return 'file';
}

export function buildSafeContentDisposition(filename: string, fallbackFileId: string, mode: 'inline' | 'attachment' = 'inline'): string {
	const normalizedFilename = filename
		.normalize('NFKC')
		.replace(/[\r\n]+/g, ' ')
		.split('')
		.filter((character) => {
			const codePoint = character.charCodeAt(0);
			return codePoint >= 0x20 && codePoint !== 0x7f;
		})
		.join('')
		.trim();

	const safeFilename = normalizedFilename.length > 0 ? normalizedFilename : fallbackFileId;
	const asciiFallback = safeFilename
		.replace(/[^\x20-\x7E]/g, '_')
		.replace(/["\\]/g, '_')
		.trim();
	const asciiFilename = asciiFallback.length > 0 ? asciiFallback : fallbackFileId;
	const encodedUtf8Filename = encodeURIComponent(safeFilename).replace(
		/['()*]/g,
		(character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
	);

	return `${mode}; filename="${asciiFilename}"; filename*=UTF-8''${encodedUtf8Filename}`;
}
