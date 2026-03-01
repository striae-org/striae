const fs = require('fs');
const path = require('path');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function replaceTomlCompatibilityDate(content, date) {
  return content.replace(
    /(compatibility_date\s*=\s*")\d{4}-\d{2}-\d{2}(")/,
    `$1${date}$2`
  );
}

function replaceJsoncCompatibilityDate(content, date) {
  return content.replace(
    /("compatibility_date"\s*:\s*")\d{4}-\d{2}-\d{2}(",?)/,
    `$1${date}$2`
  );
}

function updateFile(filePath, date, replacer) {
  if (!fs.existsSync(filePath)) {
    return { filePath, status: 'missing' };
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const updated = replacer(original, date);

  if (original === updated) {
    return { filePath, status: 'unchanged' };
  }

  fs.writeFileSync(filePath, updated, 'utf8');
  return { filePath, status: 'updated' };
}

function updateCompatibilityDates(date = getCurrentDate()) {
  if (!DATE_PATTERN.test(date)) {
    throw new Error(`Invalid date format: ${date}. Use YYYY-MM-DD.`);
  }

  const rootDir = path.resolve(__dirname, '..');
  const workersDir = path.join(rootDir, 'workers');

  const results = [];

  results.push(
    updateFile(
      path.join(rootDir, 'wrangler.toml'),
      date,
      replaceTomlCompatibilityDate
    )
  );

  results.push(
    updateFile(
      path.join(rootDir, 'wrangler.toml.example'),
      date,
      replaceTomlCompatibilityDate
    )
  );

  if (fs.existsSync(workersDir)) {
    const workerDirs = fs
      .readdirSync(workersDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const workerDir of workerDirs) {
      const workerPath = path.join(workersDir, workerDir);
      results.push(
        updateFile(
          path.join(workerPath, 'wrangler.jsonc.example'),
          date,
          replaceJsoncCompatibilityDate
        )
      );
      results.push(
        updateFile(
          path.join(workerPath, 'wrangler.jsonc'),
          date,
          replaceJsoncCompatibilityDate
        )
      );
    }
  }

  const updatedCount = results.filter((result) => result.status === 'updated').length;
  const unchangedCount = results.filter((result) => result.status === 'unchanged').length;
  const missingCount = results.filter((result) => result.status === 'missing').length;

  console.log(`Updated compatibility dates to ${date}`);
  console.log(`- Updated: ${updatedCount}`);
  console.log(`- Unchanged: ${unchangedCount}`);
  console.log(`- Missing: ${missingCount}`);

  for (const result of results) {
    if (result.status !== 'updated') {
      console.log(`  ${result.status.toUpperCase()}: ${path.relative(rootDir, result.filePath)}`);
    }
  }

  return results;
}

if (require.main === module) {
  const dateArg = process.argv[2] || getCurrentDate();

  try {
    updateCompatibilityDates(dateArg);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { updateCompatibilityDates };