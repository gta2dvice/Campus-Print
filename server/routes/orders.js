const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const OrderFile = require('../models/OrderFile');
const Payment = require('../models/Payment');
const { upload } = require('../middleware/upload');

// Single-shop deployment today: new orders always go to shop id 1.
// (Shop selection would be added here if/when multiple shops go live.)
const DEFAULT_SHOP_ID = 1;

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
router.post('/', requireAuth, upload.array('files', 10), async (req, res) => {
    try {
        const data = {
            colorOption: req.body.colorOption,
            paperSize: req.body.paperSize,
            copies: Number(req.body.copies),
            spiralBinding: req.body.spiralBinding === 'true' || req.body.spiralBinding === true,
            expressDelivery: req.body.expressDelivery === 'true' || req.body.expressDelivery === true,
            totalPrice: Number(req.body.totalPrice),
            fileCount: req.files ? req.files.length : 0
        };
        const order = await Order.createOrder(req.session.userId, DEFAULT_SHOP_ID, data);
        if (req.files && req.files.length > 0) {
            await OrderFile.createFiles(order.id, req.files);
        }
        await Payment.createForOrder(order.id, req.session.userId, DEFAULT_SHOP_ID, data.totalPrice || 0);
        res.status(201).json(order);
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
