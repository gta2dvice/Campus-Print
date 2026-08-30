function requireShopAdmin(req, res, next) {
    if (req.session && req.session.adminId && req.session.adminRole === 'shop_admin') {
        req.shopId = req.session.adminShopId;
        return next();
    }
    res.status(401).json({ message: 'Not authenticated' });
}

function requireSuperAdmin(req, res, next) {
    if (req.session && req.session.superAdminId && req.session.superAdminRole === 'super_admin') return next();
    res.status(401).json({ message: 'Not authenticated' });
}

module.exports = { requireShopAdmin, requireSuperAdmin };
