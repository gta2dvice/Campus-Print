const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDb() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || ''
    });

    await connection.query(
        `CREATE DATABASE IF NOT EXISTS ${process.env.MYSQL_DATABASE || 'campusprint'}`
    );
    await connection.changeUser({ database: process.env.MYSQL_DATABASE || 'campusprint' });

    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await connection.end();
    console.log('MySQL database initialized.');
}

initDb().catch(err => {
    console.error('DB init error:', err);
    process.exit(1);
});
