// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

const fs = require('fs');
const path = require('path');
const { updateMarkdownVersions } = require('./update-markdown-versions.cjs');
const { updateCompatibilityDates } = require('./update-compatibility-dates.cjs');

// Read the ASCII art file from the filesystem
const asciiArtPath = path.join(__dirname, '..', 'public', 'striae-ascii.txt');
let asciiArt;
try {
	asciiArt = fs.readFileSync(asciiArtPath, 'utf8');
} catch (err) {
	console.warn(`Warning: Unable to read ASCII art file at ${asciiArtPath}.\n${err.message}`);
	asciiArt = '(ASCII art unavailable)\n';
}

// Pop a lil' logo in the terminal
console.info(asciiArt);

updateMarkdownVersions();

// Keep compatibility dates current, bounded by local runtime support.
updateCompatibilityDates({ mode: 'latest-compatible' });
