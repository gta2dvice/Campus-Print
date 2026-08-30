const pool = require('../db');
const bcrypt = require('bcryptjs');

async function createUser(email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
        'INSERT INTO users (email, password) VALUES (?, ?)',
        [email.toLowerCase().trim(), hashedPassword]
    );
    return { id: result.insertId, email: email.toLowerCase().trim() };
}

async function findByEmail(email) {
    const [rows] = await pool.execute(
        'SELECT id, email, password, is_admin, role, is_active, shop_id FROM users WHERE email = ?',
        [email.toLowerCase().trim()]
    );
    return rows[0] || null;
}

async function findById(id) {
    const [rows] = await pool.execute(
        'SELECT id, email, is_admin, role, is_active, shop_id, created_at FROM users WHERE id = ?',
        [id]
    );
    return rows[0] || null;
}

async function matchPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
}

async function updatePassword(userId, newPassword) {
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
}

// ── Super Admin: user management ─────────────────
async function listUsers({ search = '', role = '', page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];

    if (search) {
        where.push('email LIKE ?');
        params.push(`%${search}%`);
    }
    if (role) {
        where.push('role = ?');
        params.push(role);
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
        `SELECT id, email, role, is_active, created_at FROM users
         ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );
    const [[{ count }]] = await pool.query(
        `SELECT COUNT(*) AS count FROM users ${whereClause}`,
        params
    );
    return { users: rows, total: count, page, limit };
}

async function setActive(userId, isActive) {
    await pool.execute('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, userId]);
    return findById(userId);
}

async function getPlatformUserStats() {
    const [rows] = await pool.query(
        `SELECT role, COUNT(*) AS count, SUM(is_active) AS active_count FROM users GROUP BY role`
    );
    const result = { totalStudents: 0, activeStudents: 0, totalShopAdmins: 0, totalSuperAdmins: 0 };
    rows.forEach(r => {
        if (r.role === 'student') {
            result.totalStudents = parseInt(r.count, 10);
            result.activeStudents = parseInt(r.active_count, 10) || 0;
        }
        if (r.role === 'shop_admin') result.totalShopAdmins = parseInt(r.count, 10);
        if (r.role === 'super_admin') result.totalSuperAdmins = parseInt(r.count, 10);
    });
    return result;
}

module.exports = {
    createUser,
    findByEmail,
    findById,
    matchPassword,
    updatePassword,
    listUsers,
    setActive,
    getPlatformUserStats
};
