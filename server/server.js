require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const superAdminRoutes = require('./routes/superAdmin');

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

// ── API Routes ───────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/super-admin', superAdminRoutes);

// ── React SPA (built by client-react) — public site + admin + super-admin ────
// Auth/role guards live client-side in the React app (each page/layout
// checks session status via the API routes above and redirects as needed).
const CLIENT_DIST = path.join(__dirname, '../client-react/dist');
console.log('Serving static files from:', CLIENT_DIST);
app.use(express.static(CLIENT_DIST));

app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

// ── Start Server ─────────────────────────────────
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
