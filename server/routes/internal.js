const express = require('express');
const router = express.Router();
const { cleanupExpiredPdfs } = require('../jobs/cleanupExpiredPdfs');

function requireCronSecret(req, res, next) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return res.status(503).json({ message: 'CRON_SECRET is not configured' });
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.secret;
    if (!token || token !== secret) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
}

// POST /api/internal/cleanup-pdfs
// Deletes uploaded files older than 24 hours from the uploaded-pdfs bucket only.
// Does not delete users, orders, payments, or order_files rows.
router.all('/cleanup-pdfs', requireCronSecret, async (req, res) => {
    try {
        const result = await cleanupExpiredPdfs();
        res.json({ ok: true, ...result });
    } catch (err) {
        console.error('PDF cleanup error:', err);
        res.status(500).json({ message: 'Cleanup failed' });
    }
});

module.exports = router;
