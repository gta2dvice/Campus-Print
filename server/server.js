require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'campus-print-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Static files — no caching in dev so changes show immediately
app.use(express.static(path.join(__dirname, '../client'), {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

// ── API Routes ───────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

// ── Page Routes ──────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/dashboard', (req, res) => {
    if (req.session && req.session.userId) {
        res.sendFile(path.join(__dirname, '../client/dashboard.html'));
    } else {
        res.redirect('/');
    }
});

app.get('/new-order', (req, res) => {
    if (req.session && req.session.userId) {
        res.sendFile(path.join(__dirname, '../client/new-order.html'));
    } else {
        res.redirect('/');
    }
});

// Keep legacy /upload route pointing to dashboard
app.get('/upload', (req, res) => {
    if (req.session && req.session.userId) {
        res.redirect('/new-order');
    } else {
        res.redirect('/');
    }
});

// ── Start Server ─────────────────────────────────
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
