const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// ── Auth middleware ──────────────────────────────
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) return next();
    res.status(401).json({ message: 'Not authenticated' });
}

// GET /api/orders/stats
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const stats = await Order.getOrderStats(req.session.userId);
        res.json(stats);
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/orders
router.get('/', requireAuth, async (req, res) => {
    try {
        const orders = await Order.getOrdersByUser(req.session.userId);
        res.json(orders);
    } catch (err) {
        console.error('Get orders error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/orders
router.post('/', requireAuth, async (req, res) => {
    try {
        const order = await Order.createOrder(req.session.userId, req.body);
        res.status(201).json(order);
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
