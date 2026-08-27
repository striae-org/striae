// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

/**
 * Local-only HTTP server for the Striae deployment GUI. Deliberately dependency-free
 * (node:http + node:fs only). Security posture, since this process can spawn arbitrary
 * whitelisted deployment scripts on the developer's machine:
 *   - Refuses to start when NODE_ENV=production (defense-in-depth; this is a dev tool).
 *   - Binds to 127.0.0.1 only — never reachable from other machines.
 *   - Requires a random per-process session token (header X-Deploy-Gui-Token, or a query
 *     param only for the SSE endpoint since EventSource can't set custom headers) on every
 *     mutating/state-reading request, so another localhost tab/page can't drive it via CSRF.
 *   - Only ever executes commands built by actions.mjs's whitelist — never raw client input.
 */
import http from 'node:http';
import { readFile, copyFile, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { ENV_FIELDS, KEY_PAIR_FIELDS, SILENT_FIELDS } from './env-fields.mjs';
import { readEnvSnapshot, buildEnvStatus, buildKeyPairStatus } from './env-reader.mjs';
import { publicActionList } from './actions.mjs';
import { runner } from './runner.mjs';
import { PROJECT_ROOT } from './actions.mjs';

if (process.env.NODE_ENV === 'production') {
	console.error('❌ deploy-gui refuses to start with NODE_ENV=production. This is a local development tool only.');
	process.exit(1);
}

// On Windows, npm-script-based actions re-invoke npm's CLI via `node <npm_execpath>` to
// avoid Node refusing to spawn npm.cmd directly (EINVAL) — that env var is only set when
// npm itself launched this process, so require the documented `npm run deploy-gui` entry point.
if (process.platform === 'win32' && !process.env.npm_execpath) {
	console.error('❌ deploy-gui must be started with `npm run deploy-gui` on Windows (not `node server.mjs` directly).');
	process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const ENV_PATH = path.join(PROJECT_ROOT, '.env');
const ADMIN_SERVICE_PATH = path.join(PROJECT_ROOT, 'app', 'config', 'admin-service.json');

const HOST = '127.0.0.1';
const PORT = 3737;
const SESSION_TOKEN = randomBytes(24).toString('hex');
const MAX_BODY_BYTES = 256 * 1024;

const MIME_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function readJsonBody(req) {
	return new Promise((resolve, reject) => {
		let size = 0;
		const chunks = [];
		req.on('data', (chunk) => {
			size += chunk.length;
			if (size > MAX_BODY_BYTES) {
				reject(new Error('Request body too large'));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on('end', () => {
			if (chunks.length === 0) return resolve({});
			try {
				resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
			} catch {
				reject(new Error('Invalid JSON body'));
			}
		});
		req.on('error', reject);
	});
}

function sendJson(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		'Content-Type': 'application/json; charset=utf-8',
		'Content-Length': Buffer.byteLength(payload),
		'Access-Control-Allow-Origin': 'null',
	});
	res.end(payload);
}

function isAuthorized(req, url) {
	const header = req.headers['x-deploy-gui-token'];
	const queryToken = url.searchParams.get('token');
	return header === SESSION_TOKEN || queryToken === SESSION_TOKEN;
}

async function serveStatic(pathname, res) {
	const relative = pathname === '/' ? '/index.html' : pathname;
	const resolved = path.normalize(path.join(PUBLIC_DIR, relative));

	// Separator-bounded check prevents sibling-dir bypass (e.g. PUBLIC_DIR + '-evil').
	if (resolved !== PUBLIC_DIR && !resolved.startsWith(PUBLIC_DIR + path.sep)) {
		res.writeHead(403).end('Forbidden');
		return;
	}

	try {
		let content = await readFile(resolved, 'utf8');
		if (resolved.endsWith('index.html')) {
			content = content.replace('%%DEPLOY_GUI_TOKEN%%', SESSION_TOKEN);
		}
		const ext = path.extname(resolved);
		res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' });
		res.end(content);
	} catch {
		res.writeHead(404).end('Not found');
	}
}

function handleEnvFields(res) {
	sendJson(res, 200, {
		fields: ENV_FIELDS,
		keyPairs: KEY_PAIR_FIELDS.map(({ id, label, section }) => ({ id, label, section })),
		silentFields: SILENT_FIELDS,
	});
}

function handleEnvStatus(res) {
	const snapshot = readEnvSnapshot(ENV_PATH);
	sendJson(res, 200, {
		fields: buildEnvStatus(snapshot, ENV_FIELDS),
		keyPairs: buildKeyPairStatus(snapshot, KEY_PAIR_FIELDS),
		silentFields: buildEnvStatus(snapshot, SILENT_FIELDS),
	});
}

async function handleRun(req, res) {
	let body;
	try {
		body = await readJsonBody(req);
	} catch (err) {
		return sendJson(res, 400, { error: err.message });
	}

	try {
		const result = runner.start({ actionId: body.actionId, form: body.form });
		sendJson(res, 200, result);
	} catch (err) {
		sendJson(res, 400, { error: err.message, missingFields: err.missingFields ?? null });
	}
}

function handleRunStream(req, res, url) {
	const runId = url.searchParams.get('runId');
	if (!runId || runner.getActiveRunId() !== runId) {
		res.writeHead(404).end('No such active run');
		return;
	}

	res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
	res.write(':ok\n\n');

	const onEvent = (eventRunId, event) => {
		if (eventRunId !== runId) return;
		res.write(`data: ${JSON.stringify(event)}\n\n`);
	};

	runner.on('event', onEvent);
	req.on('close', () => runner.off('event', onEvent));
}

async function handleRunStdin(req, res) {
	let body;
	try {
		body = await readJsonBody(req);
	} catch (err) {
		return sendJson(res, 400, { error: err.message });
	}

	try {
		runner.sendManualLine(body.runId, body.line ?? '');
		sendJson(res, 200, { ok: true });
	} catch (err) {
		sendJson(res, 400, { error: err.message });
	}
}

async function handleRunCancel(req, res) {
	let body;
	try {
		body = await readJsonBody(req);
	} catch (err) {
		return sendJson(res, 400, { error: err.message });
	}

	try {
		runner.cancel(body.runId);
		sendJson(res, 200, { ok: true });
	} catch (err) {
		sendJson(res, 400, { error: err.message });
	}
}

async function handleAdminServicePath(req, res) {
	let body;
	try {
		body = await readJsonBody(req);
	} catch (err) {
		return sendJson(res, 400, { error: err.message });
	}

	const sourcePath = typeof body.path === 'string' ? body.path.trim() : '';
	if (!sourcePath) return sendJson(res, 400, { error: 'A local file path is required' });

	try {
		await access(sourcePath);
		const raw = await readFile(sourcePath, 'utf8');
		const parsed = JSON.parse(raw);
		if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
			return sendJson(res, 400, {
				error: 'File does not look like a Firebase service account key (missing project_id/client_email/private_key)',
			});
		}
		await copyFile(sourcePath, ADMIN_SERVICE_PATH);
		sendJson(res, 200, { ok: true });
	} catch (err) {
		sendJson(res, 400, { error: `Could not read or copy file: ${err.message}` });
	}
}

const server = http.createServer(async (req, res) => {
	const url = new URL(req.url, `http://${HOST}:${PORT}`);

	if (url.pathname === '/' || url.pathname === '/app.js' || url.pathname === '/styles.css') {
		return serveStatic(url.pathname, res);
	}

	if (!url.pathname.startsWith('/api/')) {
		res.writeHead(404).end('Not found');
		return;
	}

	if (!isAuthorized(req, url)) {
		return sendJson(res, 401, { error: 'Missing or invalid session token' });
	}

	if (url.pathname === '/api/actions' && req.method === 'GET') return sendJson(res, 200, { actions: publicActionList() });
	if (url.pathname === '/api/env-fields' && req.method === 'GET') return handleEnvFields(res);
	if (url.pathname === '/api/env-status' && req.method === 'GET') return handleEnvStatus(res);
	if (url.pathname === '/api/run' && req.method === 'POST') return handleRun(req, res);
	if (url.pathname === '/api/run/stream' && req.method === 'GET') return handleRunStream(req, res, url);
	if (url.pathname === '/api/run/stdin' && req.method === 'POST') return handleRunStdin(req, res);
	if (url.pathname === '/api/run/cancel' && req.method === 'POST') return handleRunCancel(req, res);
	if (url.pathname === '/api/admin-service-path' && req.method === 'POST') return handleAdminServicePath(req, res);

	res.writeHead(404).end('Not found');
});

function openBrowser(url) {
	const platform = process.platform;
	const command = platform === 'win32' ? 'cmd' : platform === 'darwin' ? 'open' : 'xdg-open';
	const args = platform === 'win32' ? ['/c', 'start', '""', url] : [url];
	try {
		spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
	} catch {
		// Non-fatal — the URL is already printed to the console.
	}
}

server.listen(PORT, HOST, () => {
	const url = `http://${HOST}:${PORT}/`;
	console.log(`\n⚙️  Striae deploy GUI running at ${url}`);
	console.log('   Local-only — this server refuses to bind anywhere but 127.0.0.1.\n');
	if (!existsSync(ENV_PATH)) {
		console.log('ℹ️  No .env file found yet — the first deploy-config run will create one.\n');
	}
	openBrowser(url);
});
