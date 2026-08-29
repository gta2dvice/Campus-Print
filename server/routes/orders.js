const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const slots = require('../slots');

// ── Auth middleware ──────────────────────────────
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) return next();
    res.status(401).json({ message: 'Not authenticated' });
}

// GET /api/orders/locations
router.get('/locations', requireAuth, (req, res) => {
    res.json({ locations: slots.LOCATIONS });
});

// GET /api/orders/slots?location=main-gate
router.get('/slots', requireAuth, async (req, res) => {
    try {
        const location = slots.getLocationById(req.query.location) || slots.getLocationByName(req.query.location);
        if (!location) {
            return res.status(400).json({ message: 'Invalid collection location.' });
        }
        const counts = await Order.getSlotCounts(location.name);
        res.json({
            location,
            slots: slots.buildSlotStatuses(location.id, counts)
        });
    } catch (err) {
        console.error('Slots error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

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
        const location = slots.getLocationById(req.body.collectionLocationId)
            || slots.getLocationByName(req.body.collectionLocation);
        const timeSlot = req.body.collectionTime;

        if (!location || !slots.TIME_SLOTS.includes(timeSlot)) {
            return res.status(400).json({ message: 'Please select a collection location and time slot.' });
        }

        const counts = await Order.getSlotCounts(location.name);
        const slot = slots.buildSlotStatuses(location.id, counts).find(s => s.time === timeSlot);
        if (!slot || slot.status === 'full') {
            return res.status(409).json({ message: 'That time slot is fully booked. Please choose another.' });
        }

        const order = await Order.createOrder(req.session.userId, {
            ...req.body,
            collectionLocation: location.name,
            collectionTime: timeSlot
        });
        res.status(201).json(order);
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
