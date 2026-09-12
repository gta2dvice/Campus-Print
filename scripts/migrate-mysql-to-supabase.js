require('../server/loadEnv');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const pool = require('../server/db');
const { uploadBuffer } = require('../server/storage');

const UPLOAD_DIR = path.join(__dirname, '../server/uploads');

async function copyTable(mysqlConn, table, columns, transform = (row) => row) {
    const [rows] = await mysqlConn.query(`SELECT * FROM \`${table}\``);
    console.log(`→ ${table}: ${rows.length} row(s)`);
    for (const row of rows) {
        const data = transform({ ...row });
        const cols = columns.filter(c => data[c] !== undefined);
        const placeholders = cols.map(() => '?').join(', ');
        const values = cols.map(c => data[c]);
        const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;
        await pool.query(sql);
    }
    if (rows.length) {
        await pool.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), GREATEST((SELECT MAX(id) FROM ${table}), 1))`);
    }
    return rows;
}

async function migrate() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const mysqlConn = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'campusprint'
    });

    console.log('Copying MySQL data into Supabase Postgres (existing rows are skipped, never deleted)...');

    await copyTable(mysqlConn, 'shops', ['id', 'shop_name', 'owner_user_id', 'owner_name', 'phone', 'email', 'address', 'opens_at', 'closes_at', 'is_open', 'approval_status', 'is_active', 'created_at', 'updated_at'], row => ({ ...row, owner_user_id: null }));
    await copyTable(mysqlConn, 'users', ['id', 'email', 'password', 'is_admin', 'role', 'is_active', 'shop_id', 'created_at']);

    const [shopOwners] = await mysqlConn.query('SELECT id, owner_user_id FROM shops');
    for (const shop of shopOwners) {
        if (shop.owner_user_id) {
            await pool.query('UPDATE shops SET owner_user_id = ? WHERE id = ?', [shop.owner_user_id, shop.id]);
        }
    }

    await copyTable(mysqlConn, 'orders', ['id', 'user_id', 'shop_id', 'status', 'color_option', 'paper_size', 'copies', 'spiral_binding', 'express_delivery', 'total_price', 'file_count', 'rejection_reason', 'collection_location_id', 'collection_location', 'collection_time', 'ticket_number', 'total_pages', 'printing_side', 'created_at'], row => ({
        ...row,
        status: row.status === 'in_progress' ? 'printing' : row.status
    }));
    await copyTable(mysqlConn, 'payments', ['id', 'order_id', 'user_id', 'shop_id', 'amount', 'status', 'method', 'transaction_ref', 'created_at', 'updated_at']);

    const [files] = await mysqlConn.query('SELECT * FROM order_files');
    console.log(`→ order_files: ${files.length} row(s)`);

    const [orders] = await mysqlConn.query('SELECT id, user_id FROM orders');
    const userByOrder = {};
    orders.forEach(o => { userByOrder[o.id] = o.user_id; });

    for (const file of files) {
        let storagePath = null;
        const localPath = path.join(UPLOAD_DIR, file.stored_name);
        if (file.stored_name && fs.existsSync(localPath)) {
            const userId = userByOrder[file.order_id] || 'unknown';
            storagePath = `${userId}/${file.order_id}/${file.stored_name}`;
            try {
                await uploadBuffer({
                    storagePath,
                    buffer: fs.readFileSync(localPath),
                    contentType: file.mime_type
                });
            } catch (err) {
                if (!/already exists|Duplicate/i.test(err.message || '')) {
                    console.warn(`  could not upload ${file.stored_name}: ${err.message}`);
                    storagePath = null;
                }
            }
        }
        await pool.query(
            `INSERT INTO order_files (id, order_id, original_name, stored_name, storage_path, mime_type, size_bytes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
            [file.id, file.order_id, file.original_name, file.stored_name, storagePath, file.mime_type, file.size_bytes, file.created_at]
        );
    }
    if (files.length) {
        await pool.query(`SELECT setval(pg_get_serial_sequence('order_files', 'id'), GREATEST((SELECT MAX(id) FROM order_files), 1))`);
    }

    await mysqlConn.end();
    await pool.end();
    console.log('\n🎉 MySQL → Supabase copy finished. Source MySQL data was not modified.');
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});
