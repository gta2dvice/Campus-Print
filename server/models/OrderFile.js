const pool = require('../db');

async function createFiles(orderId, files) {
    if (!files || files.length === 0) return [];
    const values = files.map(f => [orderId, f.originalname, f.filename, f.mimetype, f.size]);
    const [result] = await pool.query(
        `INSERT INTO order_files (order_id, original_name, stored_name, mime_type, size_bytes) VALUES ?`,
        [values]
    );
    return result;
}

async function getFilesByOrder(orderId) {
    const [rows] = await pool.execute(
        'SELECT id, order_id, original_name, mime_type, size_bytes, created_at FROM order_files WHERE order_id = ?',
        [orderId]
    );
    return rows;
}

async function getFileById(fileId) {
    const [rows] = await pool.execute('SELECT * FROM order_files WHERE id = ?', [fileId]);
    return rows[0] || null;
}

module.exports = { createFiles, getFilesByOrder, getFileById };
