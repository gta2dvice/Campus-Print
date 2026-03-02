require('dotenv').config();
const mysql = require('mysql2/promise');

async function initDb() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || 'pseudo@coder',
    });

    console.log('✅ Connected to MySQL');

    const db = process.env.MYSQL_DATABASE || 'campusprint';

    // DDL must use query(), not execute()
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${db}\``);
    await connection.query(`USE \`${db}\``);
    console.log(`✅ Database "${db}" selected`);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id         INT          AUTO_INCREMENT PRIMARY KEY,
            email      VARCHAR(255) UNIQUE NOT NULL,
            password   VARCHAR(255) NOT NULL,
            created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('✅ users table ready');

    await connection.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id               INT           AUTO_INCREMENT PRIMARY KEY,
            user_id          INT           NOT NULL,
            status           ENUM('pending','in_progress','ready','completed') DEFAULT 'pending',
            color_option     ENUM('bw','color') DEFAULT 'bw',
            paper_size       ENUM('A4','A3')    DEFAULT 'A4',
            copies           INT           DEFAULT 1,
            spiral_binding   TINYINT(1)    DEFAULT 0,
            express_delivery TINYINT(1)    DEFAULT 0,
            total_price      DECIMAL(10,2) DEFAULT 0.00,
            file_count       INT           DEFAULT 0,
            created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    console.log('✅ orders table ready');

    await connection.end();
    console.log('\n🎉 Database initialised successfully!');
}

initDb().catch(err => {
    console.error('❌ Database init failed:', err.message);
    process.exit(1);
});
