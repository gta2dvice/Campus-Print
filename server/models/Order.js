const pool = require('../db');

async function createOrder(userId, data) {
    const { colorOption, paperSize, copies, spiralBinding, expressDelivery, totalPrice, fileCount } = data;
    const [result] = await pool.execute(
        `INSERT INTO orders
            (user_id, color_option, paper_size, copies, spiral_binding, express_delivery, total_price, file_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            colorOption || 'bw',
            paperSize || 'A4',
            copies || 1,
            spiralBinding ? 1 : 0,
            expressDelivery ? 1 : 0,
            totalPrice || 0,
            fileCount || 0
        ]
    );
    return { id: result.insertId };
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

module.exports = { createOrder, getOrdersByUser, getOrderStats };
