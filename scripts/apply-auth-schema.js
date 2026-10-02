require('../server/loadEnv');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function applyAuthSchema() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is not set.');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        console.log('Connected to database successfully.');

        const sqlPath = path.join(__dirname, '../supabase/auth-setup.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Applying auth-setup.sql...');
        await client.query(sql);
        console.log('Successfully applied auth-setup.sql!');

        client.release();
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Error applying auth-setup.sql:', err);
        process.exit(1);
    }
}

applyAuthSchema();
