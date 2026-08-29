const pool = require('../db');

async function ensureBookingColumns() {
    const statements = [
        "ALTER TABLE orders ADD COLUMN collection_location VARCHAR(64) NULL",
        "ALTER TABLE orders ADD COLUMN collection_time VARCHAR(32) NULL"
    ];
    for (const sql of statements) {
        try {
            await pool.query(sql);
        } catch (err) {
            if (err && err.code !== 'ER_DUP_FIELDNAME') throw err;
        }
    }
}

async function createOrder(userId, data) {
    const {
        colorOption, paperSize, copies, spiralBinding, expressDelivery,
        totalPrice, fileCount, collectionLocation, collectionTime
    } = data;
    const [result] = await pool.execute(
        `INSERT INTO orders
            (user_id, color_option, paper_size, copies, spiral_binding, express_delivery,
             total_price, file_count, collection_location, collection_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            colorOption || 'bw',
            paperSize || 'A4',
            copies || 1,
            spiralBinding ? 1 : 0,
            expressDelivery ? 1 : 0,
            totalPrice || 0,
            fileCount || 0,
            collectionLocation || null,
            collectionTime || null
        ]
    );
    return { id: result.insertId };
}

async function getSlotCounts(locationName) {
    try {
        const [rows] = await pool.execute(
            `SELECT collection_time AS timeSlot, COUNT(*) AS booked
             FROM orders
             WHERE collection_location = ?
             GROUP BY collection_time`,
            [locationName]
        );
        const counts = {};
        rows.forEach(row => {
            if (row.timeSlot) counts[row.timeSlot] = parseInt(row.booked, 10) || 0;
        });
        return counts;
    } catch (err) {
        if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_NO_SUCH_TABLE')) {
            return {};
        }
        throw err;
    }
}

async function getOrdersByUser(userId) {
    const [rows] = await pool.execute(
        'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [userId]
    );
    return rows;
}

async function getOrderStats(userId) {
    const [rows] = await pool.execute(
        'SELECT status, COUNT(*) AS count FROM orders WHERE user_id = ? GROUP BY status',
        [userId]
    );
    const result = { total: 0, in_progress: 0, ready: 0 };
    rows.forEach(r => {
        const cnt = parseInt(r.count, 10);
        result.total += cnt;
        if (r.status === 'in_progress') result.in_progress = cnt;
        if (r.status === 'ready' || r.status === 'completed') result.ready += cnt;
    });
    return result;
}

module.exports = { createOrder, getOrdersByUser, getOrderStats, getSlotCounts, ensureBookingColumns };
