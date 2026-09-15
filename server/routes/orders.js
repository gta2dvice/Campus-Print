const express = require('express');
const multer = require('multer');
const router = express.Router();
const Order = require('../models/Order');
const OrderFile = require('../models/OrderFile');
const Payment = require('../models/Payment');
const { upload } = require('../middleware/upload');
const { detectPages } = require('../pageDetect');
const slots = require('../slots');
const pool = require('../db');
const { uploadBuffer, buildObjectPath } = require('../storage');
const cashfree = require('../cashfree');
const { requireProfile } = require('../middleware/roleAuth');

// In-memory upload just for page-count detection — nothing here touches disk.
const detectUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024, files: 10 }
});

function paymentGatewayReady() {
    return cashfree.isConfigured();
}

// ── Order Configuration ─────────────────────
const PRICING = {
    bw: 2,
    color: 5,
    a3Extra: 10,
    serviceCharge: 0,
    deliveryCharge: 0
};

// @route  GET /api/orders/config
router.get('/config', (req, res) => {
    res.json({
        pricing: PRICING,
        locations: slots.LOCATIONS
    });
});

// Single-shop deployment today: new orders always go to shop id 1.
// (Shop selection would be added here if/when multiple shops go live.)
const DEFAULT_SHOP_ID = 1;

// ── Auth middleware ──────────────────────────────
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) return next();
    res.status(401).json({ message: 'Not authenticated' });
}

// GET /api/orders/slots
//   (no query)           → all time slots with 5-minute cutoff
//   ?time=2:05 PM        → locations offered / unavailable for that slot
//   ?location=main-gate  → times for one location (legacy)
router.get('/slots', async (req, res) => {
    try {
        const time = req.query.time;
        const locationId = req.query.location;

        if (time) {
            if (!slots.TIME_SLOTS.includes(time)) {
                return res.status(400).json({ message: 'Unknown time slot' });
            }
            let countsByLocation = {};
            if (slots.LIVE_SLOT_AVAILABILITY) {
                const [rows] = await pool.query(
                    `SELECT collection_location_id, COUNT(*) AS count
                     FROM orders
                     WHERE collection_time = ?
                       AND DATE(created_at) = CURDATE()
                       AND status NOT IN ('rejected','cancelled')
                     GROUP BY collection_location_id`,
                    [time]
                );
                rows.forEach(r => { countsByLocation[r.collection_location_id] = r.count; });
            }
            return res.json({
                time,
                locations: slots.buildLocationStatusesForTime(time, countsByLocation)
            });
        }

        if (locationId) {
            const location = slots.getLocationById(locationId);
            if (!location) return res.status(400).json({ message: 'Unknown location' });

            let countsByTime = {};
            if (slots.LIVE_SLOT_AVAILABILITY) {
                const [rows] = await pool.query(
                    `SELECT collection_time, COUNT(*) AS count
                     FROM orders
                     WHERE collection_location_id = ?
                       AND DATE(created_at) = CURDATE()
                       AND status NOT IN ('rejected','cancelled')
                     GROUP BY collection_time`,
                    [locationId]
                );
                rows.forEach(r => { countsByTime[r.collection_time] = r.count; });
            }

            return res.json({ location, slots: slots.buildSlotStatuses(locationId, countsByTime) });
        }

        res.json({ slots: slots.buildTimeSlotStatuses() });
    } catch (err) {
        console.error('Slots error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/orders/stats
router.get('/stats', requireProfile, async (req, res) => {
    try {
        const stats = await Order.getOrderStats(req.session.userId);
        res.json(stats);
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/orders/:id — single order, owner-only (used by the collection ticket page)
router.get('/:id', requireProfile, async (req, res) => {
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
router.post('/detect-pages', requireProfile, detectUpload.array('files', 10), async (req, res) => {
    try {
        const files = req.files || [];
        if (files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded for page detection.' });
        }
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
router.get('/', requireProfile, async (req, res) => {
    try {
        const orders = await Order.getOrdersByUser(req.session.userId);
        res.json(orders);
    } catch (err) {
        console.error('Get orders error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

async function persistUploadedFiles(userId, orderId, files) {
    const stored = [];
    for (const file of files) {
        const { storedName, storagePath } = buildObjectPath(userId, orderId, file.originalname);
        await uploadBuffer({
            storagePath,
            buffer: file.buffer,
            contentType: file.mimetype
        });
        stored.push({
            originalname: file.originalname,
            storedName,
            storagePath,
            mimetype: file.mimetype,
            size: file.size
        });
    }
    await OrderFile.createFiles(orderId, stored);
}

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

// POST /api/orders/payment/create — creates a Cashfree order and returns a payment session.
router.post('/payment/create', requireProfile, async (req, res) => {
    if (!paymentGatewayReady()) {
        return res.status(503).json({ message: 'Payment gateway is not configured. Set CASHFREE_APP_ID / CASHFREE_SECRET_KEY in .env.' });
    }
    try {
        const amount = Number(req.body.totalPrice);
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid order amount' });

        const User = require('../models/User');
        const user = await User.findById(req.session.userId);
        const cashfreeOrderId = `cp_${req.session.userId}_${Date.now()}`;
        const frontend = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
        const publicApi = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
        const notifyUrl = publicApi ? `${publicApi}/api/orders/payment/webhook` : undefined;

        const session = await cashfree.createPaymentSession({
            orderId: cashfreeOrderId,
            amount,
            customerId: `user_${req.session.userId}`,
            customerEmail: user?.email || req.session.userEmail,
            customerPhone: req.body.customerPhone,
            returnUrl: `${frontend}/new-order?cf_order={order_id}`,
            notifyUrl
        });

        if (!session.paymentSessionId) {
            return res.status(500).json({ message: 'Could not start payment' });
        }

        res.json({
            paymentSessionId: session.paymentSessionId,
            cashfreeOrderId: session.cashfreeOrderId,
            mode: cashfree.getMode()
        });
    } catch (err) {
        console.error('Cashfree order create error:', err.response?.data || err.message);
        res.status(500).json({ message: err.response?.data?.message || 'Could not initiate payment' });
    }
});

// POST /api/orders/payment/simulate — TEMP stand-in when Cashfree keys are not configured.
router.post('/payment/simulate', requireProfile, upload.array('files', 10), async (req, res) => {
    if (paymentGatewayReady()) return res.status(400).json({ message: 'Payment gateway is configured — use the real checkout.' });
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Please upload at least one file to continue.' });
        }
        if (req.body.printingSide !== 'single' && req.body.printingSide !== 'double') {
            return res.status(400).json({ message: 'Please choose single-sided or double-sided printing.' });
        }

        const data = readOrderPayload(req.body);
        const pickupErr = slots.pickupError(data.collectionLocationId, data.collectionTime);
        if (pickupErr) return res.status(400).json({ message: pickupErr });
        data.fileCount = req.files.length;

        const order = await Order.createOrder(req.session.userId, DEFAULT_SHOP_ID, data);
        await persistUploadedFiles(req.session.userId, order.id, req.files);
        const simulatedRef = `TXN-SIM-${Date.now()}`;
        await Payment.createForOrder(order.id, req.session.userId, DEFAULT_SHOP_ID, data.totalPrice || 0, 'simulated', simulatedRef);

        res.status(201).json({ id: order.id, ticketNumber: order.ticketNumber });
    } catch (err) {
        console.error('Simulated payment error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/orders/payment/verify — confirms Cashfree order status, then creates the print order.
router.post('/payment/verify', requireProfile, upload.array('files', 10), async (req, res) => {
    if (!paymentGatewayReady()) return res.status(503).json({ message: 'Payment gateway is not configured.' });
    let cashfreeOrderId;
    try {
        cashfreeOrderId = req.body.cashfree_order_id || req.body.cashfreeOrderId;
        if (!cashfreeOrderId) {
            return res.status(400).json({ message: 'Missing payment order id' });
        }
        if (!String(cashfreeOrderId).startsWith(`cp_${req.session.userId}_`)) {
            return res.status(403).json({ message: 'Invalid payment order' });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Please upload at least one file to continue.' });
        }
        if (req.body.printingSide !== 'single' && req.body.printingSide !== 'double') {
            return res.status(400).json({ message: 'Please choose single-sided or double-sided printing.' });
        }

        const cfOrder = await cashfree.fetchOrderUntilPaid(cashfreeOrderId);
        if (!cashfree.isOrderPaid(cfOrder)) {
            return res.status(400).json({ message: 'Payment is not completed yet. Please wait or try again.' });
        }

        const existing = await Payment.findByGatewayOrderId(cashfreeOrderId);
        if (existing && existing.order_id) {
            const prior = await Order.getOrderForUser(existing.order_id, req.session.userId);
            if (prior) {
                return res.status(200).json({ id: prior.id, ticketNumber: prior.ticket_number });
            }
            return res.status(409).json({ message: 'This payment is already linked to an order.' });
        }

        const data = readOrderPayload(req.body);
        data.fileCount = req.files.length;
        const pickupErr = slots.pickupError(data.collectionLocationId, data.collectionTime);
        if (pickupErr) return res.status(400).json({ message: pickupErr });
        if (!cashfree.amountsMatch(cfOrder.order_amount, data.totalPrice)) {
            return res.status(400).json({ message: 'Payment amount does not match this order.' });
        }

        const order = await Order.createOrder(req.session.userId, DEFAULT_SHOP_ID, data);
        await persistUploadedFiles(req.session.userId, order.id, req.files);
        const paymentId = cfOrder.cf_payment_id || cfOrder.order_id || cashfreeOrderId;
        await Payment.createForOrder(
            order.id,
            req.session.userId,
            DEFAULT_SHOP_ID,
            Number(cfOrder.order_amount) || data.totalPrice || 0,
            'cashfree',
            String(paymentId),
            { status: 'success', gatewayOrderId: cashfreeOrderId }
        );

        res.status(201).json({ id: order.id, ticketNumber: order.ticketNumber });
    } catch (err) {
        if (err.code === '23505' && cashfreeOrderId) {
            const existing = await Payment.findByGatewayOrderId(cashfreeOrderId);
            if (existing?.order_id) {
                const prior = await Order.getOrderForUser(existing.order_id, req.session.userId);
                if (prior) return res.status(200).json({ id: prior.id, ticketNumber: prior.ticket_number });
            }
        }
        console.error('Payment verify error:', err.response?.data || err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/orders/payment/webhook — Cashfree server-to-server payment events.
router.post('/payment/webhook', async (req, res) => {
    try {
        if (!paymentGatewayReady()) return res.status(503).json({ message: 'Payment gateway is not configured.' });

        const signature = req.headers['x-webhook-signature'];
        const timestamp = req.headers['x-webhook-timestamp'];
        const rawBody = req.rawBody;
        if (!signature || !timestamp || typeof rawBody !== 'string') {
            return res.status(400).json({ message: 'Missing webhook signature' });
        }

        const tsNum = Number(timestamp);
        if (Number.isFinite(tsNum)) {
            const ageMs = Math.abs(Date.now() - (String(timestamp).length <= 10 ? tsNum * 1000 : tsNum));
            if (ageMs > 15 * 60 * 1000) {
                return res.status(400).json({ message: 'Stale webhook' });
            }
        }

        cashfree.verifyWebhookSignature(signature, rawBody, timestamp);

        const eventType = req.body?.type || req.body?.event || '';
        const orderId = req.body?.data?.order?.order_id;
        const paymentStatus = String(req.body?.data?.payment?.payment_status || '').toUpperCase();
        const cfPaymentId = req.body?.data?.payment?.cf_payment_id;

        if (!orderId) return res.status(200).json({ ok: true });

        let status = null;
        try {
            const cfOrder = await cashfree.fetchOrder(orderId);
            if (cashfree.isOrderPaid(cfOrder)) status = 'success';
            else if (eventType.includes('FAILED') || eventType.includes('USER_DROPPED') || paymentStatus === 'FAILED' || paymentStatus === 'USER_DROPPED') {
                status = 'failed';
            }
        } catch (fetchErr) {
            console.error('Cashfree webhook fetch error:', fetchErr.response?.data || fetchErr.message);
        }

        if (status) {
            await Payment.updateByGatewayOrderId(orderId, {
                status,
                transactionRef: cfPaymentId ? String(cfPaymentId) : undefined
            });
        }

        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('Cashfree webhook error:', err.message);
        res.status(400).json({ message: 'Invalid webhook' });
    }
});

module.exports = router;
