const pool = require('../db');

async function createForOrder(orderId, userId, shopId, amount, method = 'manual', transactionRef = null) {
    const ref = transactionRef || `TXN-${String(orderId).padStart(6, '0')}`;
    const [result] = await pool.execute(
        `INSERT INTO payments (order_id, user_id, shop_id, amount, status, method, transaction_ref)
         VALUES (?, ?, ?, ?, 'success', ?, ?)`,
        [orderId, userId, shopId, amount, method, ref]
    );
    return { id: result.insertId, transaction_ref: ref };
}

async function refundForOrder(orderId) {
    await pool.execute(`UPDATE payments SET status = 'refunded' WHERE order_id = ?`, [orderId]);
}

async function listPayments({ search = '', status = '', shopId = null, dateFrom = '', dateTo = '', page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];

    if (shopId) { where.push('p.shop_id = ?'); params.push(shopId); }
    if (search) { where.push('(p.transaction_ref LIKE ? OR u.email LIKE ? OR p.order_id = ?)'); params.push(`%${search}%`, `%${search}%`, Number(search) || 0); }
    if (status) { where.push('p.status = ?'); params.push(status); }
    if (dateFrom) { where.push('p.created_at >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('p.created_at <= ?'); params.push(`${dateTo} 23:59:59`); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
        `SELECT p.*, u.email AS customer_email, s.shop_name
         FROM payments p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN shops s ON s.id = p.shop_id
         ${whereClause} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );
    const [[{ count }]] = await pool.query(
        `SELECT COUNT(*) AS count FROM payments p JOIN users u ON u.id = p.user_id ${whereClause}`,
        params
    );
    return { payments: rows, total: count, page, limit };
}

async function getPlatformPaymentStats() {
    const [rows] = await pool.query('SELECT status, COUNT(*) AS count, COALESCE(SUM(amount),0) AS amount FROM payments GROUP BY status');
    const result = {
        total: { count: 0, amount: 0 },
        success: { count: 0, amount: 0 },
        failed: { count: 0, amount: 0 },
        pending: { count: 0, amount: 0 },
        refunded: { count: 0, amount: 0 }
    };
    rows.forEach(r => {
        result[r.status] = { count: parseInt(r.count, 10), amount: parseFloat(r.amount) };
        result.total.count += parseInt(r.count, 10);
        result.total.amount += parseFloat(r.amount);
    });
    result.successRate = result.total.count > 0
        ? ((result.success.count / result.total.count) * 100).toFixed(1)
        : '0.0';
    return result;
}

module.exports = { createForOrder, refundForOrder, listPayments, getPlatformPaymentStats };
