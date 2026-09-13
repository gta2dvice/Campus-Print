const pool = require('../db');

async function getProfileByUserId(userId) {
    const [rows] = await pool.execute(
        'SELECT * FROM student_profiles WHERE user_id = ?',
        [userId]
    );
    return rows[0] || null;
}

async function createProfile(userId, data) {
    const { full_name, phone_number, class_room_number } = data;
    const [result] = await pool.execute(
        'INSERT INTO student_profiles (user_id, full_name, phone_number, class_room_number) VALUES (?, ?, ?, ?)',
        [userId, full_name, phone_number, class_room_number]
    );
    return { id: result.insertId, user_id: userId, ...data };
}

async function updateProfile(userId, data) {
    const { full_name, phone_number, class_room_number } = data;
    await pool.execute(
        'UPDATE student_profiles SET full_name = ?, phone_number = ?, class_room_number = ?, updated_at = NOW() WHERE user_id = ?',
        [full_name, phone_number, class_room_number, userId]
    );
    return getProfileByUserId(userId);
}

async function checkProfileExists(userId) {
    const [rows] = await pool.execute(
        'SELECT 1 FROM student_profiles WHERE user_id = ?',
        [userId]
    );
    return rows.length > 0;
}

module.exports = {
    getProfileByUserId,
    createProfile,
    updateProfile,
    checkProfileExists
};
