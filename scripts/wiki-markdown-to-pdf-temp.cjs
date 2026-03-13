#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const cliArgs = process.argv.slice(2);

function getArg(flag, fallback) {
  const index = cliArgs.indexOf(flag);
  if (index === -1) {
    return fallback;
  }

  const value = cliArgs[index + 1];
  if (!value || value.startsWith('--')) {
    return fallback;
  }

  return value;
}

function collectMarkdownFiles(dirPath, files = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === '.git') {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(fullPath, files);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

const inputRoot = path.resolve(repoRoot, getArg('--in', 'wiki/striae.wiki'));
const outputRoot = path.resolve(repoRoot, getArg('--out', 'wiki-pdf-temp'));
const pdfEngine = getArg('--engine', process.env.PANDOC_PDF_ENGINE || '');

if (!fs.existsSync(inputRoot)) {
  console.error(`Input directory not found: ${inputRoot}`);
  process.exit(1);
}

const pandocCheck = spawnSync('pandoc', ['--version'], { stdio: 'ignore' });
if (pandocCheck.status !== 0) {
  console.error('Pandoc is required but was not found on PATH.');
  console.error('Install pandoc and retry. Optional engine: --engine wkhtmltopdf');
  process.exit(1);
}

const markdownFiles = collectMarkdownFiles(inputRoot).sort((a, b) =>
  a.localeCompare(b)
);

if (markdownFiles.length === 0) {
  console.log(`No markdown files found in ${inputRoot}`);
  process.exit(0);
}

fs.mkdirSync(outputRoot, { recursive: true });

let converted = 0;
let failed = 0;

for (const sourceFile of markdownFiles) {
  const relativePath = path.relative(inputRoot, sourceFile);
  const targetFile = path.join(
    outputRoot,
    relativePath.replace(/\.md$/i, '.pdf')
  );

  fs.mkdirSync(path.dirname(targetFile), { recursive: true });

  const pandocArgs = [sourceFile, '-o', targetFile];
  if (pdfEngine) {
    pandocArgs.push(`--pdf-engine=${pdfEngine}`);
  }

  const run = spawnSync('pandoc', pandocArgs, { stdio: 'inherit' });

  if (run.status === 0) {
    converted += 1;
    console.log(`OK: ${relativePath}`);
  } else {
    failed += 1;
    console.error(`FAILED: ${relativePath}`);
  }
}

console.log('\nConversion complete.');
console.log(`Source: ${inputRoot}`);
console.log(`Output: ${outputRoot}`);
console.log(`Converted: ${converted}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
