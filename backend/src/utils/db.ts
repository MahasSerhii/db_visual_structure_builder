import fs from 'fs';
import path from 'path';

// Simple JSON DB implementation
const DB_PATH = path.join(__dirname, '..', 'db');

if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
}

export const loadDB = <T>(filename: string, defaultData: T): T => {
    const filePath = path.join(DB_PATH, filename);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

export const saveDB = <T>(filename: string, data: T) => {
    const filePath = path.join(DB_PATH, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    // Log for debugging
    console.log(`Saved DB: ${filename}`);
};
