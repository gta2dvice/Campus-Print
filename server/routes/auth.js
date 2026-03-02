const express = require('express');
const router = express.Router();
const User = require('../models/User');

// @route   POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const userExists = await User.findByEmail(email);

        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const user = await User.createUser(email, password);

        if (user) {
            req.session.userId = user.id;
            res.status(201).json({
                id: user.id,
                email: user.email,
                message: 'Signup successful'
            });
        } else {
            res.status(400).json({ message: 'Invalid user data format' });
        }
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const user = await User.findByEmail(email);

        if (user && (await User.matchPassword(password, user.password))) {
            req.session.userId = user.id;
            res.status(200).json({
                id: user.id,
                email: user.email,
                message: 'Login successful'
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/auth/status
router.get('/status', (req, res) => {
    if (req.session && req.session.userId) {
        res.status(200).json({ isLoggedIn: true });
    } else {
        res.status(200).json({ isLoggedIn: false });
    }
});

// @route   POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

module.exports = router;

