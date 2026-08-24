// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

export type ListResult = { ok: true; list: string } | { ok: false; error: string };

/**
 * Client helper for reading email lists from the lists-worker via service binding.
 * Returns a ListResult so callers can apply fail-open or fail-closed logic
 * appropriate to their security context.
 *
 * - ok: true  → list fetched successfully (may be empty string if list is empty)
 * - ok: false → worker unreachable, auth failure, or unexpected response shape
 */
export async function fetchListFromWorker(binding: Fetcher, list: 'members' | 'primershear', secret: string): Promise<ListResult> {
	try {
		const response = await binding.fetch(`https://worker/${list}`, {
			headers: { Authorization: `Bearer ${secret}` },
		});
		if (!response.ok) {
			const msg = `lists-client: GET /${list} returned ${response.status}`;
			console.error(msg);
			return { ok: false, error: msg };
		}
		const data = (await response.json()) as { list?: unknown };
		if (typeof data.list !== 'string') {
			const msg = `lists-client: unexpected response shape for /${list}`;
			console.error(msg);
			return { ok: false, error: msg };
		}
		return { ok: true, list: data.list };
	} catch (err) {
		const msg = `lists-client: failed to fetch /${list}`;
		console.error(msg, err);
		return { ok: false, error: msg };
	}
}
