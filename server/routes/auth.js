const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Profile = require('../models/Profile');
const { getServiceClient } = require('../supabaseClient');

// ── GET /api/auth/config ──────────────────────────
// Public configuration (e.g. Turnstile site key)
router.get('/config', (req, res) => {
    res.json({
        turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || process.env.VITE_TURNSTILE_SITE_KEY || '',
        turnstileRequired: Boolean(process.env.TURNSTILE_SECRET_KEY)
    });
});

// ── POST /api/auth/verify-turnstile ───────────────
// Server-side Cloudflare Turnstile verification
router.post('/verify-turnstile', async (req, res) => {
    try {
        const { token } = req.body;
        const secretKey = process.env.TURNSTILE_SECRET_KEY;

        // If secret key is not configured, support graceful local development
        if (!secretKey) {
            console.warn('[Turnstile] TURNSTILE_SECRET_KEY is not set. Bypassing Turnstile verification for development.');
            return res.json({ success: true, bypassed: true });
        }

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Please complete the security verification and try again.'
            });
        }

        const remoteIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;

        const formData = new URLSearchParams();
        formData.append('secret', secretKey);
        formData.append('response', token);
        if (remoteIp) {
            formData.append('remoteip', remoteIp);
        }

        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const verifyData = await verifyRes.json();
        if (verifyData.success) {
            return res.json({ success: true });
        }

        console.error('[Turnstile] Verification failed:', verifyData['error-codes']);
        return res.status(400).json({
            success: false,
            message: 'Please complete the security verification and try again.'
        });
    } catch (error) {
        console.error('[Turnstile] Error verifying token:', error);
        return res.status(500).json({
            success: false,
            message: 'Security verification error. Please try again.'
        });
    }
});

// ── POST /api/auth/session ────────────────────────
// Validate Supabase Auth session on the server, sync user and profile, and bind express session
router.post('/session', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const accessToken = req.body.access_token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null);

        if (!accessToken) {
            return res.status(401).json({ message: 'No access token provided' });
        }

        const supabase = getServiceClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

        if (userError || !user) {
            return res.status(401).json({ message: 'Invalid or expired authentication session' });
        }

        // Enforce verified email
        const isEmailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
        if (!isEmailVerified) {
            return res.status(403).json({
                message: 'Please verify your email before logging in.',
                unverified: true
            });
        }

        // Upsert user in Postgres public.users (passwords are stored in Supabase Auth ONLY)
        const dbUser = await User.upsertSupabaseUser({
            supabaseUid: user.id,
            email: user.email
        });

        if (!dbUser || !dbUser.is_active) {
            return res.status(403).json({ message: 'Your account has been deactivated. Contact support.' });
        }

        // Upsert profile in public.profiles and student_profiles
        let profile = await Profile.getProfileBySupabaseUid(user.id);
        if (!profile) {
            profile = await Profile.upsertProfile(user.id, dbUser.id, {
                full_name: user.user_metadata?.full_name || ''
            });
        }

        // Bind Express session
        req.session.userId = dbUser.id;
        req.session.userEmail = dbUser.email;
        req.session.supabaseUid = user.id;
        req.session.userRole = profile?.role || dbUser.role || 'student';

        const profileComplete = Boolean(profile && profile.full_name && (profile.phone || profile.phone_number) && (profile.classroom || profile.class_room_number));

        res.status(200).json({
            success: true,
            user: {
                id: dbUser.id,
                supabase_uid: user.id,
                email: dbUser.email,
                role: req.session.userRole,
                full_name: profile?.full_name || ''
            },
            profileComplete
        });
    } catch (error) {
        console.error('Session sync error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ── GET /api/auth/status ──────────────────────────
router.get('/status', async (req, res) => {
    if (req.session && req.session.userId) {
        try {
            const profile = await Profile.getProfileByUserId(req.session.userId);
            const profileComplete = await Profile.checkProfileExists(req.session.userId);
            res.status(200).json({
                isLoggedIn: true,
                userId: req.session.userId,
                supabaseUid: req.session.supabaseUid || null,
                email: req.session.userEmail || '',
                role: req.session.userRole || 'student',
                profileComplete,
                profile
            });
        } catch (error) {
            console.error('Status error:', error);
            res.status(500).json({ message: 'Server Error' });
        }
    } else {
        res.status(200).json({ isLoggedIn: false });
    }
});

// ── GET /api/auth/profile ─────────────────────────
router.get('/profile', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    try {
        const profile = await Profile.getProfileByUserId(req.session.userId);
        if (!profile) return res.status(404).json({ message: 'Profile not found' });
        res.json(profile);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ── POST /api/auth/profile ────────────────────────
router.post('/profile', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    try {
        const { full_name, phone_number, phone, class_room_number, classroom } = req.body;
        const finalName = (full_name || '').trim();
        const finalPhone = (phone || phone_number || '').trim();
        const finalClassroom = (classroom || class_room_number || '').trim();

        if (!finalName || !finalPhone || !finalClassroom) {
            return res.status(400).json({ message: 'Please provide full name, phone number, and class/room number' });
        }

        const profile = await Profile.upsertProfile(req.session.supabaseUid, req.session.userId, {
            full_name: finalName,
            phone: finalPhone,
            classroom: finalClassroom
        });
        res.status(201).json(profile);
    } catch (error) {
        console.error('Create profile error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ── PUT /api/auth/profile ─────────────────────────
router.put('/profile', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    try {
        const { full_name, phone_number, phone, class_room_number, classroom } = req.body;
        const finalName = (full_name || '').trim();
        const finalPhone = (phone || phone_number || '').trim();
        const finalClassroom = (classroom || class_room_number || '').trim();

        if (!finalName || !finalPhone || !finalClassroom) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const profile = await Profile.upsertProfile(req.session.supabaseUid, req.session.userId, {
            full_name: finalName,
            phone: finalPhone,
            classroom: finalClassroom
        });
        res.json(profile);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ── POST /api/auth/logout ─────────────────────────
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ message: 'Error logging out' });
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

module.exports = router;
