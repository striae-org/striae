/**
 * Base64url encode/decode helpers shared by the frontend app and Cloudflare Workers.
 */

export function base64UrlDecode(value: string): Uint8Array {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
	const decoded = atob(normalized + padding);
	const bytes = new Uint8Array(decoded.length);

	for (let i = 0; i < decoded.length; i += 1) {
		bytes[i] = decoded.charCodeAt(i);
	}

	return bytes;
}

export function base64UrlEncode(value: Uint8Array): string {
	let binary = '';
	const chunkSize = 8192;

	for (let i = 0; i < value.length; i += chunkSize) {
		const chunk = value.subarray(i, Math.min(i + chunkSize, value.length));
		for (let j = 0; j < chunk.length; j += 1) {
			binary += String.fromCharCode(chunk[j]);
		}
	}

	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
