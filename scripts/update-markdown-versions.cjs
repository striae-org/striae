const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

const markdownFiles = [
  //'.github/SECURITY.md',  
  //'guides/developers/PROJECT_OVERVIEW.md',
  // Add other markdown files that need version updates
];

function updateMarkdownVersions() {
  console.log(`📝 Updating markdown files with version ${packageJson.version}...`);
  
  markdownFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, '..', filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Skipping ${filePath} (file not found)`);
      return;
    }
    
    try {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace version placeholders
      content = content.replace(/{{VERSION}}/g, packageJson.version);
      content = content.replace(/v\d+\.\d+\.\d+(-\w+)?/g, `v${packageJson.version}`);
      
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Updated ${filePath}`);
    } catch (error) {
      console.error(`❌ Error updating ${filePath}:`, error.message);
    }
  });
  
  console.log('🎉 Markdown version update complete!');
}

// Run if called directly
if (require.main === module) {
  updateMarkdownVersions();
}

module.exports = { updateMarkdownVersions };
