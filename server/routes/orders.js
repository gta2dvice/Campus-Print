const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const router = express.Router();
const Order = require('../models/Order');
const OrderFile = require('../models/OrderFile');
const Payment = require('../models/Payment');
const { upload } = require('../middleware/upload');
const { detectPages } = require('../pageDetect');
const slots = require('../slots');
const pool = require('../db');

// In-memory upload just for page-count detection — nothing here touches disk.
const detectUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024, files: 10 }
});

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
}

// Single-shop deployment today: new orders always go to shop id 1.
// (Shop selection would be added here if/when multiple shops go live.)
const DEFAULT_SHOP_ID = 1;

// ── Auth middleware ──────────────────────────────
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) return next();
    res.status(401).json({ message: 'Not authenticated' });
}

// GET /api/orders/slots?location=main-gate
router.get('/slots', async (req, res) => {
    try {
        const locationId = req.query.location;
        const location = slots.getLocationById(locationId);
        if (!location) return res.status(400).json({ message: 'Unknown location' });

        // Live counts: today's non-cancelled/rejected orders already booked into each slot.
        const [rows] = await pool.query(
            `SELECT collection_time, COUNT(*) AS count
             FROM orders
             WHERE collection_location_id = ?
               AND DATE(created_at) = CURDATE()
               AND status NOT IN ('rejected','cancelled')
             GROUP BY collection_time`,
            [locationId]
        );
        const countsByTime = {};
        rows.forEach(r => { countsByTime[r.collection_time] = r.count; });

        res.json({ location, slots: slots.buildSlotStatuses(locationId, countsByTime) });
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

// GET /api/orders/:id — single order, owner-only (used by the collection ticket page)
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const order = await Order.getOrderForUser(req.params.id, req.session.userId);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const [[payment]] = await pool.query(
            `SELECT transaction_ref, method, amount FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1`,
            [order.id]
        );
        res.json({ ...order, payment: payment || null });
    } catch (err) {
        console.error('Get order error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/orders/detect-pages — auto-detects page count per uploaded file (PDF/DOCX get a
// real count; images are always 1; anything else falls back to a flagged 1-page estimate).
router.post('/detect-pages', requireAuth, detectUpload.array('files', 10), async (req, res) => {
    try {
        const files = req.files || [];
        const results = await Promise.all(files.map(async (f) => {
            const { pages, estimated } = await detectPages(f);
            return { name: f.originalname, pages, estimated };
        }));
        res.json({ files: results });
    } catch (err) {
        console.error('Detect pages error:', err);
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

function readOrderPayload(body) {
    return {
        colorOption: body.colorOption,
        paperSize: body.paperSize,
        copies: Number(body.copies),
        spiralBinding: body.spiralBinding === 'true' || body.spiralBinding === true,
        expressDelivery: body.expressDelivery === 'true' || body.expressDelivery === true,
        printingSide: body.printingSide === 'double' ? 'double' : 'single',
        totalPages: Number(body.totalPages) || 0,
        totalPrice: Number(body.totalPrice),
        collectionLocationId: body.collectionLocationId || null,
        collectionLocationName: body.collectionLocation || null,
        collectionTime: body.collectionTime || null
    };
}

// POST /api/orders/payment/create — creates a Razorpay order for the checkout total.
router.post('/payment/create', requireAuth, async (req, res) => {
    if (!razorpay) return res.status(503).json({ message: 'Payment gateway is not configured. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env.' });
    try {
        const amount = Number(req.body.totalPrice);
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid order amount' });

        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(amount * 100), // paise
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`
        });
        res.json({ razorpayOrderId: razorpayOrder.id, amount: razorpayOrder.amount, currency: razorpayOrder.currency, keyId: process.env.RAZORPAY_KEY_ID });
    } catch (err) {
        console.error('Razorpay order create error:', err);
        res.status(500).json({ message: 'Could not initiate payment' });
    }
});

// POST /api/orders/payment/simulate — TEMP stand-in for real Razorpay checkout so the order +
// ticket flow can be exercised before RAZORPAY_KEY_ID/SECRET are configured. Only active while
// razorpay isn't configured; once real keys are set this route refuses and /payment/verify takes over.
router.post('/payment/simulate', requireAuth, upload.array('files', 10), async (req, res) => {
    if (razorpay) return res.status(400).json({ message: 'Payment gateway is configured — use the real checkout.' });
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Please upload at least one file to continue.' });
        }
        if (req.body.printingSide !== 'single' && req.body.printingSide !== 'double') {
            return res.status(400).json({ message: 'Please choose single-sided or double-sided printing.' });
        }

        const data = readOrderPayload(req.body);
        data.fileCount = req.files.length;

        const order = await Order.createOrder(req.session.userId, DEFAULT_SHOP_ID, data);
        await OrderFile.createFiles(order.id, req.files);
        const simulatedRef = `TXN-SIM-${Date.now()}`;
        await Payment.createForOrder(order.id, req.session.userId, DEFAULT_SHOP_ID, data.totalPrice || 0, 'simulated', simulatedRef);

        res.status(201).json({ id: order.id, ticketNumber: order.ticketNumber });
    } catch (err) {
        console.error('Simulated payment error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/orders/payment/verify — verifies the Razorpay signature, then creates the order.
router.post('/payment/verify', requireAuth, upload.array('files', 10), async (req, res) => {
    if (!razorpay) return res.status(503).json({ message: 'Payment gateway is not configured.' });
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: 'Missing payment verification fields' });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Please upload at least one file to continue.' });
        }
        if (req.body.printingSide !== 'single' && req.body.printingSide !== 'double') {
            return res.status(400).json({ message: 'Please choose single-sided or double-sided printing.' });
        }

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: 'Payment verification failed' });
        }

        const data = readOrderPayload(req.body);
        data.fileCount = req.files.length;

        const order = await Order.createOrder(req.session.userId, DEFAULT_SHOP_ID, data);
        await OrderFile.createFiles(order.id, req.files);
        await Payment.createForOrder(order.id, req.session.userId, DEFAULT_SHOP_ID, data.totalPrice || 0, 'razorpay', razorpay_payment_id);

        res.status(201).json({ id: order.id, ticketNumber: order.ticketNumber });
    } catch (err) {
        console.error('Payment verify error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
