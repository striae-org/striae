const fs = require('fs');
const path = require('path');
const { updateMarkdownVersions } = require('./update-markdown-versions.cjs');
const { updateCompatibilityDates } = require('./update-compatibility-dates.cjs');

function shouldSyncMetadata() {
    return process.env.STRIAE_SYNC_METADATA === '1';
}

// Read the ASCII art file from the filesystem
const asciiArtPath = path.join(__dirname, '..', 'public', 'striae-ascii.txt');
let asciiArt;  
try {  
    asciiArt = fs.readFileSync(asciiArtPath, 'utf8');  
} catch (err) {  
    console.warn(`Warning: Unable to read ASCII art file at ${asciiArtPath}.\n${err.message}`);  
    asciiArt = "(ASCII art unavailable)\n";  
} 

// Pop a lil' logo in the terminal
console.info(asciiArt);

updateMarkdownVersions();

if (shouldSyncMetadata()) {
    // Explicit opt-in for release/maintenance flows that intentionally update compatibility dates.
    updateCompatibilityDates();
} else {
    console.info('Skipping compatibility date sync. Set STRIAE_SYNC_METADATA=1 to update compatibility dates.');
}
