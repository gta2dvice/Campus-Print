const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Order = require('../models/Order');
const OrderFile = require('../models/OrderFile');
const Shop = require('../models/Shop');
const Payment = require('../models/Payment');
const { requireSuperAdmin } = require('../middleware/roleAuth');

// ── Auth ──────────────────────────────────────────

// @route  POST /api/super-admin/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Please provide email and password' });

        const user = await User.findByEmail(email);
        if (user && user.role === 'super_admin' && user.is_active && (await User.matchPassword(password, user.password))) {
            req.session.superAdminId = user.id;
            req.session.superAdminEmail = user.email;
            req.session.superAdminRole = 'super_admin';
            res.status(200).json({ id: user.id, email: user.email, message: 'Login successful' });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Super admin login error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route  GET /api/super-admin/status
router.get('/status', (req, res) => {
    if (req.session && req.session.superAdminId && req.session.superAdminRole === 'super_admin') {
        res.status(200).json({ isLoggedIn: true, email: req.session.superAdminEmail || '' });
    } else {
        res.status(200).json({ isLoggedIn: false });
    }
});

// @route  POST /api/super-admin/logout
router.post('/logout', (req, res) => {
    req.session.superAdminId = null;
    req.session.superAdminEmail = null;
    req.session.superAdminRole = null;
    res.status(200).json({ message: 'Logged out successfully' });
});

// ── Dashboard ─────────────────────────────────────

router.get('/dashboard', requireSuperAdmin, async (req, res) => {
    try {
        const [orderStats, userStats, shopStats, paymentStats, recent] = await Promise.all([
            Order.getPlatformStats(),
            User.getPlatformUserStats(),
            Shop.getPlatformShopStats(),
            Payment.getPlatformPaymentStats(),
            Order.listOrders({ limit: 5 })
        ]);
        res.json({ orderStats, userStats, shopStats, paymentStats, recentOrders: recent.orders });
    } catch (err) {
        console.error('Super admin dashboard error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ── User / Student Management ────────────────────

router.get('/users', requireSuperAdmin, async (req, res) => {
    try {
        const { search = '', role = '', page = 1, limit = 20 } = req.query;
        const result = await User.listUsers({ search, role, page: Number(page), limit: Number(limit) });
        res.json(result);
    } catch (err) {
        console.error('Super admin list users error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/users/:id', requireSuperAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const orders = await Order.getOrdersByUser(user.id);
        res.json({ ...user, orders });
    } catch (err) {
        console.error('Super admin get user error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.patch('/users/:id/active', requireSuperAdmin, async (req, res) => {
    try {
        const { isActive } = req.body;
        const user = await User.setActive(req.params.id, !!isActive);
        res.json(user);
    } catch (err) {
        console.error('Super admin set active error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ── Shop Management ───────────────────────────────

router.get('/shops', requireSuperAdmin, async (req, res) => {
    try {
        const { search = '', status = '', page = 1, limit = 20 } = req.query;
        const result = await Shop.listShops({ search, status, page: Number(page), limit: Number(limit) });
        res.json(result);
    } catch (err) {
        console.error('Super admin list shops error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/shops/:id', requireSuperAdmin, async (req, res) => {
    try {
        const shop = await Shop.getShopById(req.params.id);
        if (!shop) return res.status(404).json({ message: 'Shop not found' });
        const orders = await Order.listOrders({ shopId: shop.id, limit: 10 });
        res.json({ ...shop, recentOrders: orders.orders });
    } catch (err) {
        console.error('Super admin get shop error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.put('/shops/:id', requireSuperAdmin, async (req, res) => {
    try {
        const shop = await Shop.updateShop(req.params.id, req.body);
        res.json(shop);
    } catch (err) {
        console.error('Super admin update shop error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.patch('/shops/:id/approval', requireSuperAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid approval status' });
        }
        const shop = await Shop.setApprovalStatus(req.params.id, status);
        res.json(shop);
    } catch (err) {
        console.error('Super admin shop approval error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.patch('/shops/:id/active', requireSuperAdmin, async (req, res) => {
    try {
        const { isActive } = req.body;
        const shop = await Shop.setActive(req.params.id, !!isActive);
        res.json(shop);
    } catch (err) {
        console.error('Super admin shop active error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ── Global Order Management ───────────────────────

router.get('/orders', requireSuperAdmin, async (req, res) => {
    try {
        const { search = '', status = '', dateFrom = '', dateTo = '', page = 1, limit = 20, sort = 'created_at', dir = 'DESC' } = req.query;
        const result = await Order.listOrders({ search, status, dateFrom, dateTo, page: Number(page), limit: Number(limit), sort, dir });
        res.json(result);
    } catch (err) {
        console.error('Super admin list orders error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/orders/:id', requireSuperAdmin, async (req, res) => {
    try {
        const order = await Order.getOrderById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        const files = await OrderFile.getFilesByOrder(order.id);
        res.json({ ...order, files });
    } catch (err) {
        console.error('Super admin get order error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/orders/:orderId/documents/:fileId', requireSuperAdmin, async (req, res) => {
    try {
        const file = await OrderFile.getFileById(req.params.fileId);
        if (!file || String(file.order_id) !== String(req.params.orderId)) {
            return res.status(404).json({ message: 'File not found' });
        }
        const filePath = path.join(__dirname, '../uploads', file.stored_name);
        if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on server' });

        res.setHeader('Content-Type', file.mime_type);
        res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(file.original_name)}"`);
        res.sendFile(filePath);
    } catch (err) {
        console.error('Super admin document access error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ── Payments ───────────────────────────────────────

router.get('/payments', requireSuperAdmin, async (req, res) => {
    try {
        const stats = await Payment.getPlatformPaymentStats();
        res.json(stats);
    } catch (err) {
        console.error('Super admin payments stats error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/transactions', requireSuperAdmin, async (req, res) => {
    try {
        const { search = '', status = '', dateFrom = '', dateTo = '', page = 1, limit = 20 } = req.query;
        const result = await Payment.listPayments({ search, status, dateFrom, dateTo, page: Number(page), limit: Number(limit) });
        res.json(result);
    } catch (err) {
        console.error('Super admin transactions error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Read-only gateway status — no live Razorpay integration exists yet.
// Kept as a clean abstraction: secrets are never sent to the frontend,
// and this reflects real configuration state rather than fabricated data.
router.get('/payment-gateway', requireSuperAdmin, async (req, res) => {
    const configured = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    res.json({
        provider: 'Razorpay',
        configured,
        mode: configured ? (process.env.RAZORPAY_KEY_ID.startsWith('rzp_live') ? 'live' : 'test') : null,
        webhookConfigured: !!process.env.RAZORPAY_WEBHOOK_SECRET,
        status: configured ? 'connected' : 'not_connected'
    });
});

// ── Analytics ─────────────────────────────────────

router.get('/analytics', requireSuperAdmin, async (req, res) => {
    try {
        const [orderStats, earnings] = await Promise.all([
            Order.getPlatformStats(),
            Order.getEarnings()
        ]);
        res.json({ orderStats, earnings });
    } catch (err) {
        console.error('Super admin analytics error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ── Account Settings ───────────────────────────────

router.put('/account/password', requireSuperAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new password are required' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters' });
        }
        const user = await User.findByEmail(req.session.superAdminEmail);
        if (!user || !(await User.matchPassword(currentPassword, user.password))) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }
        await User.updatePassword(user.id, newPassword);
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Super admin change password error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
