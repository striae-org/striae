// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

/**
 * Spawns whitelisted actions (see actions.mjs) as child processes, streams their output to
 * subscribers, and — for interactive deploy-config runs — precomputes the entire ordered
 * batch of stdin answers up front (see /memories/session/plan.md Phase 1 for why: bash's
 * `read -p` prompt text is not observable on stdout/stderr under piped, non-tty stdio in
 * this environment, so real-time prompt detection is not viable).
 *
 * Only one action may run at a time.
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { readEnvSnapshot } from './env-reader.mjs';
import { ENV_FIELDS, KEY_PAIR_FIELDS } from './env-fields.mjs';
import { hasValidValue, normalizeDomainValue, normalizeWorkerLabelValue, isValidWorkerLabel } from './bash-compat.mjs';
import { findAction, PROJECT_ROOT } from './actions.mjs';
import path from 'node:path';

const ENV_PATH = path.join(PROJECT_ROOT, '.env');
const STUCK_IDLE_MS = 20_000;
const STUCK_CHECK_INTERVAL_MS = 5_000;
// The stdin answer batch is drained in seconds even for a full deploy-config run, so this
// generously bounds how long the "may be waiting on an unexpected prompt" heuristic stays
// armed. Without a bound, actions like deploy:all — interactive only for their initial
// deploy-config phase, then many more minutes of non-interactive worker/Pages deploys —
// would keep re-triggering a misleading prompt warning during normal long-running steps.
const STUCK_DETECTION_WINDOW_MS = 5 * 60_000;

function stripAnsi(text) {
	// eslint-disable-next-line no-control-regex
	return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Decides, for every field in prompt_for_secrets()'s call order, whether a stdin line is
 * consumed and what it should be. Throws with a list of missing fields if a var has no
 * valid current value and no override was supplied (mirrors prompt.sh looping until a
 * non-empty, non-placeholder value is entered — the GUI must supply one up front instead).
 */
export function buildAnswerBatch(action, snapshot, form) {
	const lines = [];
	const missing = [];
	const values = form?.values ?? {};
	const regenerateSecrets = form?.regenerateSecrets ?? {};
	const regenerateKeyPairs = form?.regenerateKeyPairs ?? {};
	const treatAsReset = Boolean(action.envUpdateEnv);
	const forceRotateKeys = Boolean(action.envForceRotateKeys);

	for (const field of ENV_FIELDS) {
		const currentRaw = treatAsReset ? '' : (snapshot.get(field.name) ?? '');
		const override = typeof values[field.name] === 'string' ? values[field.name].trim() : '';

		if (field.kind === 'worker-name') {
			// prompt.sh auto-fills a random name before prompting when empty, so the
			// "keep current" branch is always taken regardless of prior state.
			const line = override ? normalizeWorkerLabelValue(override) : '';
			if (line && !isValidWorkerLabel(line)) {
				missing.push(`${field.name}: must use only lowercase letters, numbers, and dashes`);
			}
			lines.push(line);
			continue;
		}

		if (field.kind === 'auto-secret') {
			if (hasValidValue(currentRaw)) {
				lines.push(regenerateSecrets[field.name] ? 'y' : '');
			}
			// else: silently self-generated, consumes 0 lines.
			continue;
		}

		// "plain" / "domain"
		const allowKeep = hasValidValue(currentRaw);
		if (allowKeep) {
			lines.push(field.kind === 'domain' && override ? normalizeDomainValue(override) : override);
		} else if (override) {
			lines.push(field.kind === 'domain' ? normalizeDomainValue(override) : override);
		} else {
			missing.push(`${field.name}: a value is required`);
			lines.push('');
		}
	}

	for (const pair of KEY_PAIR_FIELDS) {
		if (forceRotateKeys) continue; // confirm_key_pair_regeneration short-circuits without reading

		const privateValid = hasValidValue(treatAsReset ? '' : (snapshot.get(pair.privateKeyVar) ?? ''));
		const publicValid = hasValidValue(treatAsReset ? '' : (snapshot.get(pair.publicKeyVar) ?? ''));
		if (privateValid && publicValid) {
			lines.push(regenerateKeyPairs[pair.id] ? 'y' : '');
		}
		// else: silently generated, consumes 0 lines.
	}

	if (missing.length > 0) {
		const error = new Error('Missing required configuration values');
		error.missingFields = missing;
		throw error;
	}

	return lines;
}

class Runner extends EventEmitter {
	constructor() {
		super();
		this.activeRun = null;
	}

	isBusy() {
		return this.activeRun !== null;
	}

	getActiveRunId() {
		return this.activeRun?.id ?? null;
	}

	start({ actionId, form }) {
		if (this.isBusy()) {
			throw new Error('Another action is already running. Wait for it to finish or cancel it first.');
		}

		const action = findAction(actionId);
		const { cmd, args, shell } = action.build(form?.fields ?? {});

		let stdinBatch = [];
		if (action.interactive) {
			const snapshot = readEnvSnapshot(ENV_PATH);
			stdinBatch = buildAnswerBatch(action, snapshot, form);
		}

		const runId = randomUUID();
		const child = spawn(cmd, args, { cwd: PROJECT_ROOT, env: process.env, stdio: ['pipe', 'pipe', 'pipe'], shell: Boolean(shell) });

		this.activeRun = { id: runId, actionId, child, startedAt: Date.now(), lastOutputAt: Date.now(), stuckWarned: false };

		if (stdinBatch.length > 0) {
			child.stdin.write(stdinBatch.map((line) => `${line}\n`).join(''));
		}

		const emitLog = (stream, chunk) => {
			if (!this.activeRun || this.activeRun.id !== runId) return;
			this.activeRun.lastOutputAt = Date.now();
			this.activeRun.stuckWarned = false;
			const text = chunk.toString('utf8');
			this.emit('event', runId, { type: 'log', stream, text });

			if (stream === 'stdout') {
				const cleaned = stripAnsi(text).trim();
				if (cleaned) this.emit('event', runId, { type: 'progress', text: cleaned });
			}
		};

		child.stdout.on('data', (chunk) => emitLog('stdout', chunk));
		child.stderr.on('data', (chunk) => emitLog('stderr', chunk));

		const stuckInterval = setInterval(() => {
			if (!this.activeRun || this.activeRun.id !== runId) return;
			if (!action.interactive) return;
			if (Date.now() - this.activeRun.startedAt > STUCK_DETECTION_WINDOW_MS) {
				clearInterval(stuckInterval);
				return;
			}
			const idleFor = Date.now() - this.activeRun.lastOutputAt;
			if (idleFor > STUCK_IDLE_MS && !this.activeRun.stuckWarned) {
				this.activeRun.stuckWarned = true;
				this.emit('event', runId, { type: 'stuck', idleMs: idleFor });
			}
		}, STUCK_CHECK_INTERVAL_MS);

		child.on('close', (code, signal) => {
			clearInterval(stuckInterval);
			this.emit('event', runId, { type: 'exit', code, signal });
			if (this.activeRun?.id === runId) this.activeRun = null;
		});

		child.on('error', (err) => {
			this.emit('event', runId, { type: 'error', message: err.message });
		});

		return { runId };
	}

	sendManualLine(runId, line) {
		if (!this.activeRun || this.activeRun.id !== runId) throw new Error('No matching active run');
		this.activeRun.child.stdin.write(`${line}\n`);
	}

	cancel(runId) {
		if (!this.activeRun || this.activeRun.id !== runId) throw new Error('No matching active run');
		this.activeRun.child.kill('SIGTERM');
	}
}

export const runner = new Runner();
