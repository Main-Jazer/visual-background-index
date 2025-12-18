/**
 * Batch script to add navigation imports to all effect files
 * Run with: node add-navigation.js
 */

const fs = require('fs');
const path = require('path');

const EFFECTS_DIR = path.join(__dirname, 'effects');
const NAV_IMPORT = "import '../lib/jazer-navigation.js';";

function addNavigationToFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Check if navigation is already imported
        if (content.includes('jazer-navigation.js')) {
            console.log(`⏭️  Skipping ${path.basename(filePath)} - already has navigation`);
            return false;
        }

        // Check if file has a module script
        if (!content.includes('<script type="module">')) {
            console.log(`⚠️  Skipping ${path.basename(filePath)} - no module script found`);
            return false;
        }

        // Find the first import statement (including multi-line imports) and add navigation after it
        const importRegex = /(import[\s\S]*?from\s+['"].*?['"];)/;
        const match = content.match(importRegex);

        if (match) {
            const firstImport = match[1];
            const updatedContent = content.replace(
                firstImport,
                `${firstImport}\n        ${NAV_IMPORT}`
            );

            fs.writeFileSync(filePath, updatedContent, 'utf8');
            console.log(`✅ Updated ${path.basename(filePath)}`);
            return true;
        } else {
            console.log(`⚠️  Could not find import statement in ${path.basename(filePath)}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error processing ${path.basename(filePath)}: ${error.message}`);
        return false;
    }
}

function main() {
    console.log('🚀 Adding navigation to all effect files...\n');

    if (!fs.existsSync(EFFECTS_DIR)) {
        console.error(`❌ Effects directory not found: ${EFFECTS_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(EFFECTS_DIR)
        .filter(file => file.endsWith('.html'))
        .map(file => path.join(EFFECTS_DIR, file));

    console.log(`📂 Found ${files.length} HTML files\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    files.forEach(file => {
        const result = addNavigationToFile(file);
        if (result === true) {
            updated++;
        } else if (result === false) {
            skipped++;
        } else {
            errors++;
        }
    });

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(50));
    console.log('\n✨ Done! You can now navigate between effects.');
}

main();
