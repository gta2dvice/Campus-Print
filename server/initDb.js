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
            is_admin   TINYINT(1)   NOT NULL DEFAULT 0,
            created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('✅ users table ready');

    try {
        await connection.query(`ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0`);
        console.log('✅ is_admin column added to users');
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }

    // role column: student | shop_admin | super_admin
    try {
        await connection.query(
            `ALTER TABLE users ADD COLUMN role ENUM('student','shop_admin','super_admin') NOT NULL DEFAULT 'student'`
        );
        console.log('✅ role column added to users');
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }

    // is_active flag so super admin can activate/deactivate accounts
    try {
        await connection.query(`ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`);
        console.log('✅ is_active column added to users');
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }

    // Migrate legacy is_admin=1 rows to role='shop_admin' (only if still on default 'student')
    await connection.query(
        `UPDATE users SET role = 'shop_admin' WHERE is_admin = 1 AND role = 'student'`
    );
    console.log('✅ Migrated existing is_admin accounts to role=shop_admin');

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

    // Expand status enum to the full order lifecycle, migrating 'in_progress' -> 'printing'
    await connection.query(
        `ALTER TABLE orders MODIFY COLUMN status
            ENUM('pending','accepted','printing','ready','completed','rejected','cancelled','in_progress')
            DEFAULT 'pending'`
    );
    await connection.query(`UPDATE orders SET status = 'printing' WHERE status = 'in_progress'`);
    await connection.query(
        `ALTER TABLE orders MODIFY COLUMN status
            ENUM('pending','accepted','printing','ready','completed','rejected','cancelled')
            DEFAULT 'pending'`
    );
    console.log('✅ orders.status expanded to full lifecycle');

    // rejection_reason: populated when a shop admin rejects an order
    try {
        await connection.query(`ALTER TABLE orders ADD COLUMN rejection_reason VARCHAR(500) NULL`);
        console.log('✅ rejection_reason column added to orders');
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }

    await connection.query(`CREATE INDEX idx_orders_status ON orders (status)`).catch(err => {
        if (err.code !== 'ER_DUP_KEYNAME') throw err;
    });
    await connection.query(`CREATE INDEX idx_orders_created_at ON orders (created_at)`).catch(err => {
        if (err.code !== 'ER_DUP_KEYNAME') throw err;
    });

    // Uploaded documents attached to an order
    await connection.query(`
        CREATE TABLE IF NOT EXISTS order_files (
            id            INT          AUTO_INCREMENT PRIMARY KEY,
            order_id      INT          NOT NULL,
            original_name VARCHAR(255) NOT NULL,
            stored_name   VARCHAR(255) NOT NULL,
            mime_type     VARCHAR(100) NOT NULL,
            size_bytes    INT          NOT NULL DEFAULT 0,
            created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
    `);
    console.log('✅ order_files table ready');

    // Shops (multi-shop capable; today only one shop exists in practice)
    await connection.query(`
        CREATE TABLE IF NOT EXISTS shops (
            id            INT           AUTO_INCREMENT PRIMARY KEY,
            shop_name     VARCHAR(255)  NOT NULL DEFAULT 'Campus Print',
            owner_user_id INT           DEFAULT NULL,
            owner_name    VARCHAR(255)  DEFAULT NULL,
            phone         VARCHAR(30)   DEFAULT NULL,
            email         VARCHAR(255)  DEFAULT NULL,
            address       VARCHAR(500)  DEFAULT NULL,
            opens_at      TIME          DEFAULT NULL,
            closes_at     TIME          DEFAULT NULL,
            is_open       TINYINT(1)    NOT NULL DEFAULT 1,
            approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
            is_active     TINYINT(1)    NOT NULL DEFAULT 1,
            created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);
    console.log('✅ shops table ready');

    // Migrate legacy single-row shop_profile (if present) into shops
    const [shopProfileExists] = await connection.query(`SHOW TABLES LIKE 'shop_profile'`);
    if (shopProfileExists.length > 0) {
        const [[existingShop]] = await connection.query(`SELECT COUNT(*) AS c FROM shops`);
        if (existingShop.c === 0) {
            const [[profile]] = await connection.query(`SELECT * FROM shop_profile WHERE id = 1`);
            if (profile) {
                await connection.query(
                    `INSERT INTO shops (id, shop_name, owner_name, phone, email, address, opens_at, closes_at, is_open)
                     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [profile.shop_name, profile.owner_name, profile.phone, profile.email,
                     profile.address, profile.opens_at, profile.closes_at, profile.is_open]
                );
                await connection.query(`ALTER TABLE shops AUTO_INCREMENT = 2`);
                console.log('✅ Migrated shop_profile -> shops (id=1)');
            }
        }
    }
    // Ensure at least one shop exists
    await connection.query(
        `INSERT INTO shops (id, shop_name) SELECT 1, 'Campus Print' WHERE NOT EXISTS (SELECT 1 FROM shops)`
    );

    // users.shop_id — which shop a shop_admin manages
    try {
        await connection.query(`ALTER TABLE users ADD COLUMN shop_id INT NULL`);
        console.log('✅ shop_id column added to users');
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }
    await connection.query(
        `UPDATE users SET shop_id = 1 WHERE role = 'shop_admin' AND shop_id IS NULL`
    );
    await connection.query(`UPDATE shops SET owner_user_id = (SELECT id FROM users WHERE role = 'shop_admin' LIMIT 1) WHERE owner_user_id IS NULL`);

    // orders.shop_id — which shop an order was placed with
    try {
        await connection.query(`ALTER TABLE orders ADD COLUMN shop_id INT NULL`);
        console.log('✅ shop_id column added to orders');
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }
    await connection.query(`UPDATE orders SET shop_id = 1 WHERE shop_id IS NULL`);
    await connection.query(`CREATE INDEX idx_orders_shop_id ON orders (shop_id)`).catch(err => {
        if (err.code !== 'ER_DUP_KEYNAME') throw err;
    });

    // Payments — minimal record mirroring order value (no live gateway yet)
    await connection.query(`
        CREATE TABLE IF NOT EXISTS payments (
            id              INT           AUTO_INCREMENT PRIMARY KEY,
            order_id        INT           NOT NULL,
            user_id         INT           NOT NULL,
            shop_id         INT           NULL,
            amount          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            status          ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'success',
            method          VARCHAR(50)   NOT NULL DEFAULT 'manual',
            transaction_ref VARCHAR(100)  DEFAULT NULL,
            created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    await connection.query(`CREATE INDEX idx_payments_status ON payments (status)`).catch(err => {
        if (err.code !== 'ER_DUP_KEYNAME') throw err;
    });
    // Backfill a payment record for any pre-existing order that doesn't have one
    await connection.query(`
        INSERT INTO payments (order_id, user_id, shop_id, amount, status, transaction_ref)
        SELECT o.id, o.user_id, o.shop_id, o.total_price,
               CASE WHEN o.status IN ('rejected','cancelled') THEN 'refunded' ELSE 'success' END,
               CONCAT('TXN-', LPAD(o.id, 6, '0'))
        FROM orders o
        WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id)
    `);
    console.log('✅ payments table ready');

    // Seed shop admin account from .env, if provided
    const bcrypt = require('bcryptjs');
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
        const hashed = await bcrypt.hash(adminPassword, 10);
        await connection.query(
            `INSERT INTO users (email, password, is_admin, role, shop_id) VALUES (?, ?, 1, 'shop_admin', 1)
             ON DUPLICATE KEY UPDATE is_admin = 1, role = 'shop_admin', shop_id = COALESCE(shop_id, 1), password = VALUES(password)`,
            [adminEmail.toLowerCase().trim(), hashed]
        );
        await connection.query(
            `UPDATE shops SET owner_user_id = (SELECT id FROM users WHERE email = ?) WHERE id = 1 AND owner_user_id IS NULL`,
            [adminEmail.toLowerCase().trim()]
        );
        console.log(`✅ Shop admin account ready (${adminEmail})`);
    } else {
        console.log('ℹ️  ADMIN_EMAIL/ADMIN_PASSWORD not set in .env — skipping shop admin seed');
    }

    // Seed super admin account from .env, if provided
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
    if (superAdminEmail && superAdminPassword) {
        const hashed = await bcrypt.hash(superAdminPassword, 10);
        await connection.query(
            `INSERT INTO users (email, password, is_admin, role) VALUES (?, ?, 1, 'super_admin')
             ON DUPLICATE KEY UPDATE is_admin = 1, role = 'super_admin', password = VALUES(password)`,
            [superAdminEmail.toLowerCase().trim(), hashed]
        );
        console.log(`✅ Super admin account ready (${superAdminEmail})`);
    } else {
        console.log('ℹ️  SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD not set in .env — skipping super admin seed');
    }

    await connection.end();
    console.log('\n🎉 Database initialised successfully!');
}

initDb().catch(err => {
    console.error('❌ Database init failed:', err.message);
    process.exit(1);
});
