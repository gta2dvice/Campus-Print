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
        'SELECT id, email, password FROM users WHERE email = ?',
        [email.toLowerCase().trim()]
    );
    return rows[0] || null;
}

async function matchPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
    createUser,
    findByEmail,
    matchPassword
};
