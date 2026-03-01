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
    asciiArt = "(ASCII art unavailable)\n";  
} 

// Pop a lil' logo in the terminal
console.info(asciiArt);

// Update markdown files with current version
updateMarkdownVersions();

// Update compatibility dates to current date
updateCompatibilityDates();
