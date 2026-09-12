const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadIfExists(filePath) {
    if (!fs.existsSync(filePath)) return;
    const parsed = dotenv.parse(fs.readFileSync(filePath));
    for (const [key, value] of Object.entries(parsed)) {
        if (value === undefined || value === '') continue;
        if (process.env[key]) continue;
        process.env[key] = value;
    }
}

// server/.env is the backend source of truth. Root .env fills any keys not already set.
loadIfExists(path.join(__dirname, '.env'));
loadIfExists(path.join(__dirname, '..', '.env'));
