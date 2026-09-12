const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Profile = require('../models/Profile');

// @route  POST /api/auth/signup

// @route  POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Please provide email and password' });

        const userExists = await User.findByEmail(email);
        if (userExists)
            return res.status(400).json({ message: 'User already exists with this email' });

        const user = await User.createUser(email, password);
        if (user) {
            req.session.userId = user.id;
            req.session.userEmail = user.email;
            res.status(201).json({ id: user.id, email: user.email, message: 'Signup successful' });
        } else {
            res.status(400).json({ message: 'Invalid user data format' });
        }
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route  POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Please provide email and password' });

        const user = await User.findByEmail(email);
        if (user && (await User.matchPassword(password, user.password))) {
            if (!user.is_active) {
                return res.status(403).json({ message: 'Your account has been deactivated. Contact support.' });
            }
            req.session.userId = user.id;
            req.session.userEmail = user.email;
            res.status(200).json({ id: user.id, email: user.email, message: 'Login successful' });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route  GET /api/auth/status
router.get('/status', async (req, res) => {
    if (req.session && req.session.userId) {
        try {
            const profileComplete = await Profile.checkProfileExists(req.session.userId);
            res.status(200).json({
                isLoggedIn: true,
                userId: req.session.userId,
                email: req.session.userEmail || '',
                profileComplete
            });
        } catch (error) {
            console.error('Status error:', error);
            res.status(500).json({ message: 'Server Error' });
        }
    } else {
        res.status(200).json({ isLoggedIn: false });
    }
});

// @route  GET /api/auth/profile
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

// @route  POST /api/auth/profile
router.post('/profile', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    try {
        const { full_name, phone_number, class_room_number } = req.body;
        if (!full_name || !phone_number || !class_room_number) {
            return res.status(400).json({ message: 'Please provide full name, phone number, and class/room number' });
        }

        const profile = await Profile.createProfile(req.session.userId, { full_name, phone_number, class_room_number });
        res.status(201).json(profile);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Profile already exists' });
        }
        console.error('Create profile error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route  PUT /api/auth/profile
router.put('/profile', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    try {
        const { full_name, phone_number, class_room_number } = req.body;
        if (!full_name || !phone_number || !class_room_number) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const profile = await Profile.updateProfile(req.session.userId, { full_name, phone_number, class_room_number });
        res.json(profile);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route  POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ message: 'Error logging out' });
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

module.exports = router;
