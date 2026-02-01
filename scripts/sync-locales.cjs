const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const LOCALES_DIR = path.join(SRC_DIR, 'locales');

// Regex to find t('key') or t("key")
const KEY_REGEX = /\bt\(['"`]([a-zA-Z0-9_.-]+)['"`]\)/g;

// Function to recursively get files
function getFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            getFiles(filePath, fileList);
        } else {
            if (/\.(tsx|ts)$/.test(file) && !filePath.includes('locales') && !filePath.includes('test')) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

// 1. Scan Code for Keys
console.log('🔍 Scanning source code for translation keys...');
const files = getFiles(SRC_DIR);
const codeKeys = new Set();
let usageCount = 0;

files.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    let match;
    while ((match = KEY_REGEX.exec(content)) !== null) {
        codeKeys.add(match[1]);
        usageCount++;
    }
});

console.log(`✅ Found ${codeKeys.size} unique keys in ${files.length} files.`);

// 2. Check Locale Files
if (!fs.existsSync(LOCALES_DIR)) {
    console.error(`❌ Locales directory not found at ${LOCALES_DIR}`);
    process.exit(1);
}

const localeFiles = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.ts') && f !== 'index.ts');

console.log(`🌍 Checking ${localeFiles.length} language files...`);

localeFiles.forEach(file => {
    const lang = file.replace('.ts', '');
    const filePath = path.join(LOCALES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Regex to find "key": "value"
    // Supports single or double quotes
    const LOCALE_KEY_REGEX = /['"]([a-zA-Z0-9_.-]+)['"]\s*:\s*['"](.+)['"]/g;
    
    const definedKeys = new Set();
    const suspiciousKeys = []; // value === key
    
    let match;
    while ((match = LOCALE_KEY_REGEX.exec(content)) !== null) {
        const key = match[1];
        const value = match[2];
        definedKeys.add(key);
        
        if (key === value) {
            suspiciousKeys.push(key);
        }
    }
    
    // Check for missing keys
    const missingKeys = [...codeKeys].filter(k => !definedKeys.has(k));
    
    console.log(`\n[${lang.toUpperCase()}]`);
    if (missingKeys.length > 0) {
        console.log(`  ❌ Missing ${missingKeys.length} keys:`);
        missingKeys.forEach(k => console.log(`     - ${k}`));
    } else {
        console.log(`  ✅ All used keys are present.`);
    }
    
    if (suspiciousKeys.length > 0) {
        console.log(`  ⚠️  ${suspiciousKeys.length} keys have identical value as key (potential missing translation):`);
        // Limit output
        suspiciousKeys.slice(0, 10).forEach(k => console.log(`     - ${k}`));
        if (suspiciousKeys.length > 10) console.log(`     ... and ${suspiciousKeys.length - 10} more.`);
    }
});

console.log('\n✨ Check complete.');
