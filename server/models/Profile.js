const pool = require('../db');

async function getProfileBySupabaseUid(supabaseUid) {
    if (!supabaseUid) return null;
    const [rows] = await pool.execute(
        'SELECT * FROM profiles WHERE id = ?',
        [supabaseUid]
    );
    if (!rows[0]) return null;
    const p = rows[0];
    return {
        id: p.id,
        full_name: p.full_name || '',
        phone: p.phone || '',
        phone_number: p.phone || '',
        classroom: p.classroom || '',
        class_room_number: p.classroom || '',
        role: p.role || 'student',
        created_at: p.created_at,
        updated_at: p.updated_at
    };
}

async function getProfileByUserId(userId) {
    if (!userId) return null;
    // Check if user has a supabase_uid linked
    const [userRows] = await pool.execute(
        'SELECT supabase_uid FROM users WHERE id = ?',
        [userId]
    );
    if (userRows[0] && userRows[0].supabase_uid) {
        const prof = await getProfileBySupabaseUid(userRows[0].supabase_uid);
        if (prof) return prof;
    }

    // Fallback to legacy student_profiles
    const [rows] = await pool.execute(
        'SELECT * FROM student_profiles WHERE user_id = ?',
        [userId]
    );
    if (!rows[0]) return null;
    const p = rows[0];
    return {
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name || '',
        phone: p.phone_number || '',
        phone_number: p.phone_number || '',
        classroom: p.class_room_number || '',
        class_room_number: p.class_room_number || '',
        role: 'student',
        created_at: p.created_at,
        updated_at: p.updated_at
    };
}

async function upsertProfile(supabaseUid, userId, data) {
    const fullName = (data.full_name || '').trim();
    const phone = (data.phone || data.phone_number || '').trim();
    const classroom = (data.classroom || data.class_room_number || '').trim();

    // 1. Update public.profiles
    if (supabaseUid) {
        await pool.execute(
            `INSERT INTO profiles (id, full_name, phone, classroom, role, updated_at)
             VALUES (?, ?, ?, ?, 'student', NOW())
             ON CONFLICT (id) DO UPDATE
             SET full_name = EXCLUDED.full_name,
                 phone = EXCLUDED.phone,
                 classroom = EXCLUDED.classroom,
                 updated_at = NOW()`,
            [supabaseUid, fullName, phone, classroom]
        );
    }

    // 2. Keep legacy student_profiles in sync for order queries
    if (userId) {
        const [existing] = await pool.execute(
            'SELECT id FROM student_profiles WHERE user_id = ?',
            [userId]
        );
        if (existing[0]) {
            await pool.execute(
                'UPDATE student_profiles SET full_name = ?, phone_number = ?, class_room_number = ?, updated_at = NOW() WHERE user_id = ?',
                [fullName, phone, classroom, userId]
            );
        } else {
            await pool.execute(
                'INSERT INTO student_profiles (user_id, full_name, phone_number, class_room_number) VALUES (?, ?, ?, ?)',
                [userId, fullName, phone, classroom]
            );
        }
    }

    return getProfileByUserId(userId);
}

async function createProfile(userId, data) {
    const [userRows] = await pool.execute('SELECT supabase_uid FROM users WHERE id = ?', [userId]);
    const supabaseUid = userRows[0] ? userRows[0].supabase_uid : null;
    return upsertProfile(supabaseUid, userId, data);
}

async function updateProfile(userId, data) {
    const [userRows] = await pool.execute('SELECT supabase_uid FROM users WHERE id = ?', [userId]);
    const supabaseUid = userRows[0] ? userRows[0].supabase_uid : null;
    return upsertProfile(supabaseUid, userId, data);
}

async function checkProfileExists(userId) {
    const profile = await getProfileByUserId(userId);
    return Boolean(profile && profile.full_name && (profile.phone || profile.phone_number) && (profile.classroom || profile.class_room_number));
}

module.exports = {
    getProfileBySupabaseUid,
    getProfileByUserId,
    upsertProfile,
    createProfile,
    updateProfile,
    checkProfileExists
};
