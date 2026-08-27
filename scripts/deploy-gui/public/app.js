// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

(() => {
	const TOKEN = window.__DEPLOY_GUI_TOKEN__;
	const app = document.getElementById('app');
	const modalTemplate = document.getElementById('tpl-modal');

	let actions = [];
	let envFieldsMeta = null;
	let activeEventSource = null;

	async function api(path, options = {}) {
		const res = await fetch(path, {
			...options,
			headers: { 'Content-Type': 'application/json', 'X-Deploy-Gui-Token': TOKEN, ...(options.headers ?? {}) },
		});
		const body = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
		return body;
	}

	function el(tag, props = {}, children = []) {
		const node = document.createElement(tag);
		for (const [key, value] of Object.entries(props)) {
			if (key === 'className') node.className = value;
			else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
			else if (value !== undefined && value !== null) node.setAttribute(key, value);
		}
		for (const child of [].concat(children)) {
			if (child == null) continue;
			node.append(child instanceof Node ? child : document.createTextNode(String(child)));
		}
		return node;
	}

	async function loadDashboard() {
		app.innerHTML = '<p>Loading…</p>';
		const [actionsRes, fieldsRes] = await Promise.all([api('/api/actions'), api('/api/env-fields')]);
		actions = actionsRes.actions;
		envFieldsMeta = fieldsRes;
		renderDashboard();
	}

	function renderDashboard() {
		app.innerHTML = '';
		const groups = [...new Set(actions.map((a) => a.group))];

		for (const group of groups) {
			app.append(el('h2', {}, group));
			for (const action of actions.filter((a) => a.group === group)) {
				const info = el('div', { className: 'action-info' }, [
					el('strong', {}, [action.label, action.destructive ? el('span', { className: 'pill pill-destructive' }, 'destructive') : null]),
					el('span', {}, action.description),
				]);
				const runButton = el('button', { className: 'btn', onclick: () => onActionClick(action) }, 'Run');
				app.append(el('div', { className: 'action-row' }, [info, runButton]));
			}
		}
	}

	function onActionClick(action) {
		if (action.interactive) return openConfigForm(action);
		if (action.fields) return openArgvForm(action);
		return maybeConfirmAndRun(action, {});
	}

	// --- Confirmation modal ---

	function showModal({ title, description, requireTypedConfirm }) {
		return new Promise((resolve) => {
			const node = modalTemplate.content.cloneNode(true);
			const overlay = node.querySelector('.modal-overlay');
			node.querySelector('h3').textContent = title;
			node.querySelector('.modal-desc').textContent = description;
			const confirmBtn = node.querySelector('[data-role="confirm"]');
			const cancelBtn = node.querySelector('[data-role="cancel"]');
			const inputHolder = node.querySelector('.modal-confirm-input');

			if (requireTypedConfirm) {
				const input = el('input', { type: 'text', placeholder: `Type "${requireTypedConfirm}" to confirm` });
				input.addEventListener('input', () => {
					confirmBtn.disabled = input.value.trim() !== requireTypedConfirm;
				});
				inputHolder.append(input);
			} else {
				confirmBtn.disabled = false;
			}

			cancelBtn.addEventListener('click', () => {
				overlay.remove();
				resolve(false);
			});
			confirmBtn.addEventListener('click', () => {
				overlay.remove();
				resolve(true);
			});

			document.body.append(overlay);
		});
	}

	async function maybeConfirmAndRun(action, form) {
		if (action.confirmType) {
			const confirmed = await showModal({
				title: `Run: ${action.label}`,
				description: action.description,
				requireTypedConfirm: action.confirmType === 'type-to-confirm' ? action.id : null,
			});
			if (!confirmed) return;
		}
		runAction(action, form);
	}

	// --- Argv-based mini forms (delete-account, unenroll-totp-mfa) ---

	function openArgvForm(action) {
		app.innerHTML = '';
		const fieldNodes = {};

		const fields = action.fields.map((field) => {
			const input = el('input', { type: field.type === 'checkbox' ? 'checkbox' : 'text', id: `argv-${field.name}` });
			fieldNodes[field.name] = input;
			const wrapper =
				field.type === 'checkbox'
					? el('div', { className: 'field field-checkbox' }, [input, el('label', { for: `argv-${field.name}` }, field.label)])
					: el('div', { className: 'field' }, [el('label', { for: `argv-${field.name}` }, field.label + (field.required ? ' *' : '')), input]);
			return wrapper;
		});

		const errorBox = el('p', { style: 'color:#ff9b9b' }, '');
		const submit = el('button', { className: 'btn btn-danger' }, 'Run');
		const back = el('button', { className: 'btn btn-secondary' }, 'Back');

		submit.addEventListener('click', async () => {
			const values = {};
			for (const field of action.fields) {
				const node = fieldNodes[field.name];
				values[field.name] = field.type === 'checkbox' ? String(node.checked) : node.value;
				if (field.required && !values[field.name]) {
					errorBox.textContent = `${field.label} is required`;
					return;
				}
			}
			await maybeConfirmAndRun(action, { fields: values });
		});
		back.addEventListener('click', renderDashboard);

		app.append(el('h2', {}, action.label), el('p', {}, action.description), ...fields, errorBox, el('div', { className: 'form-actions' }, [submit, back]));
	}

	// --- Interactive deploy-config form ---

	async function openConfigForm(action) {
		app.innerHTML = '<p>Loading current configuration…</p>';
		const status = action.envUpdateEnv ? null : await api('/api/env-status');

		app.innerHTML = '';
		app.append(el('h2', {}, action.label), el('p', {}, action.description));

		if (action.envUpdateEnv) {
			app.append(el('p', { className: 'stuck-warning' }, '.env will be reset from the template first — every value below must be re-entered.'));
		}

		app.append(renderAdminServiceHelper());

		const valueInputs = {};
		const regenerateSecretInputs = {};
		const regenerateKeyPairInputs = {};

		let currentSection = null;
		for (const field of envFieldsMeta.fields) {
			if (field.section !== currentSection) {
				currentSection = field.section;
				app.append(el('h3', { className: 'section-title' }, currentSection));
			}
			app.append(renderPlainOrSecretField(field, status, action, valueInputs, regenerateSecretInputs));
		}

		app.append(el('h3', { className: 'section-title' }, 'Encryption Key Pairs'));
		for (const pair of envFieldsMeta.keyPairs) {
			app.append(renderKeyPairField(pair, status, action, regenerateKeyPairInputs));
		}

		for (const field of envFieldsMeta.silentFields) {
			app.append(renderSilentField(field, status));
		}

		const errorBox = el('p', { style: 'color:#ff9b9b;white-space:pre-line' }, '');
		const submit = el('button', { className: action.destructive ? 'btn btn-danger' : 'btn' }, 'Run');
		const back = el('button', { className: 'btn btn-secondary' }, 'Back');

		submit.addEventListener('click', async () => {
			const form = {
				values: Object.fromEntries(Object.entries(valueInputs).map(([name, input]) => [name, input.value])),
				regenerateSecrets: Object.fromEntries(Object.entries(regenerateSecretInputs).map(([name, input]) => [name, input.checked])),
				regenerateKeyPairs: Object.fromEntries(Object.entries(regenerateKeyPairInputs).map(([id, input]) => [id, input.checked])),
			};
			errorBox.textContent = '';
			try {
				await maybeConfirmAndRun(action, form);
			} catch (err) {
				errorBox.textContent = err.message;
			}
		});
		back.addEventListener('click', renderDashboard);

		app.append(errorBox, el('div', { className: 'form-actions' }, [submit, back]));
	}

	function renderAdminServiceHelper() {
		const input = el('input', { type: 'text', placeholder: 'Path to service account JSON (e.g. C:\\path\\admin-service.json)' });
		const status = el('span', {}, '');
		const copyBtn = el('button', { className: 'btn btn-secondary' }, 'Copy into app/config/');
		copyBtn.addEventListener('click', async () => {
			status.textContent = 'Copying…';
			try {
				await api('/api/admin-service-path', { method: 'POST', body: JSON.stringify({ path: input.value }) });
				status.textContent = '✅ Copied';
			} catch (err) {
				status.textContent = `❌ ${err.message}`;
			}
		});
		return el('div', { className: 'field' }, [
			el('label', {}, 'Firebase admin-service.json (only needed once)'),
			el('span', { className: 'desc' }, 'The file path stays on this machine — its contents are never sent through the browser.'),
			el('div', { style: 'display:flex;gap:0.5rem' }, [input, copyBtn]),
			status,
		]);
	}

	function renderPlainOrSecretField(field, status, action, valueInputs, regenerateSecretInputs) {
		const fieldStatus = status?.fields?.[field.name];

		if (field.kind === 'auto-secret') {
			if (action.envUpdateEnv || !fieldStatus?.isSet) {
				return el('div', { className: 'field' }, [el('label', {}, field.name), el('span', { className: 'desc' }, field.description), el('span', {}, 'Not set — will be auto-generated.')]);
			}
			const checkbox = el('input', { type: 'checkbox', id: `regen-${field.name}` });
			regenerateSecretInputs[field.name] = checkbox;
			return el('div', { className: 'field' }, [
				el('label', {}, field.name),
				el('span', { className: 'desc' }, field.description),
				el('div', { className: 'field-checkbox' }, [checkbox, el('label', { for: `regen-${field.name}` }, 'Currently set — regenerate a new secret')]),
			]);
		}

		const isSecret = field.secret;
		const input = el('input', { type: isSecret ? 'password' : 'text' });
		if (!isSecret && !action.envUpdateEnv) input.value = fieldStatus?.value ?? '';
		valueInputs[field.name] = input;

		const isRequired = action.envUpdateEnv || (isSecret ? !fieldStatus?.isSet : !fieldStatus?.value);
		input.placeholder = isRequired ? 'Required' : field.kind === 'worker-name' ? 'Leave blank to keep current / auto-generated name' : 'Leave blank to keep current value';

		return el('div', { className: 'field' }, [el('label', {}, field.name + (isRequired ? ' *' : '')), el('span', { className: 'desc' }, field.description), input]);
	}

	function renderKeyPairField(pair, status, action, regenerateKeyPairInputs) {
		const isSet = status?.keyPairs?.[pair.id]?.isSet;

		if (action.envUpdateEnv || action.id === 'deploy-config-rotate-keys' || !isSet) {
			const note = action.id === 'deploy-config-rotate-keys' ? 'Will be rotated automatically (--force-rotate-keys).' : action.envUpdateEnv || !isSet ? 'Not set — will be generated automatically.' : '';
			return el('div', { className: 'field' }, [el('label', {}, pair.label), note ? el('span', { className: 'desc' }, note) : null]);
		}

		const checkbox = el('input', { type: 'checkbox', id: `regen-pair-${pair.id}` });
		regenerateKeyPairInputs[pair.id] = checkbox;
		return el('div', { className: 'field' }, [
			el('label', {}, pair.label),
			el('div', { className: 'field-checkbox' }, [checkbox, el('label', { for: `regen-pair-${pair.id}` }, 'Currently set — regenerate this key pair (may invalidate existing signatures/encrypted data)')]),
		]);
	}

	function renderSilentField(field, status) {
		const isSet = status?.silentFields?.[field.name]?.isSet;
		return el('div', { className: 'field' }, [el('label', {}, field.name), el('span', { className: 'desc' }, `${field.description} — currently ${isSet ? 'set' : 'not set'}.`)]);
	}

	// --- Run execution + live log streaming ---

	async function runAction(action, form) {
		app.innerHTML = '';
		app.append(el('h2', {}, action.label));
		const logPane = el('pre', { className: 'log-pane' }, '');
		const stuckBox = el('div', { className: 'stuck-warning', style: 'display:none' });
		const manualInput = el('input', { type: 'text', placeholder: 'Manual response for the running script…' });
		const manualSend = el('button', { className: 'btn btn-secondary' }, 'Send');
		const cancelBtn = el('button', { className: 'btn btn-danger' }, 'Cancel run');
		const backBtn = el('button', { className: 'btn btn-secondary', disabled: true }, 'Back to dashboard');

		app.append(logPane, stuckBox, el('div', { className: 'form-actions' }, [cancelBtn, backBtn]));

		let runId;
		try {
			const result = await api('/api/run', { method: 'POST', body: JSON.stringify({ actionId: action.id, form }) });
			runId = result.runId;
		} catch (err) {
			logPane.textContent = `❌ ${err.message}`;
			backBtn.disabled = false;
			backBtn.addEventListener('click', renderDashboard);
			return;
		}

		cancelBtn.addEventListener('click', async () => {
			await api('/api/run/cancel', { method: 'POST', body: JSON.stringify({ runId }) }).catch(() => {});
		});
		manualSend.addEventListener('click', async () => {
			await api('/api/run/stdin', { method: 'POST', body: JSON.stringify({ runId, line: manualInput.value }) });
			manualInput.value = '';
			stuckBox.style.display = 'none';
		});

		if (activeEventSource) activeEventSource.close();
		activeEventSource = new EventSource(`/api/run/stream?runId=${runId}&token=${encodeURIComponent(TOKEN)}`);
		activeEventSource.onmessage = (message) => {
			const event = JSON.parse(message.data);
			if (event.type === 'log') {
				logPane.textContent += event.text;
				logPane.scrollTop = logPane.scrollHeight;
			} else if (event.type === 'stuck') {
				stuckBox.innerHTML = '';
				stuckBox.append('⚠️ No output for a while — the script may be waiting on an unexpected prompt. You can send a manual response below:', el('div', { style: 'display:flex;gap:0.5rem;margin-top:0.5rem' }, [manualInput, manualSend]));
				stuckBox.style.display = 'block';
			} else if (event.type === 'exit') {
				logPane.textContent += `\n--- exited with code ${event.code}${event.signal ? ` (signal ${event.signal})` : ''} ---\n`;
				cancelBtn.disabled = true;
				backBtn.disabled = false;
				backBtn.addEventListener('click', renderDashboard);
				activeEventSource.close();
			} else if (event.type === 'error') {
				logPane.textContent += `\n❌ ${event.message}\n`;
			}
		};
	}

	loadDashboard().catch((err) => {
		app.innerHTML = `<p style="color:#ff9b9b">Failed to load: ${err.message}</p>`;
	});
})();
