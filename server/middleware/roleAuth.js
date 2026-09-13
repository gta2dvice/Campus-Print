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

const Profile = require('../models/Profile');

async function requireProfile(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    try {
        const profileExists = await Profile.checkProfileExists(req.session.userId);
        if (!profileExists) {
            return res.status(403).json({
                message: 'Complete your profile to place an order.',
                profileIncomplete: true
            });
        }
        next();
    } catch (error) {
        console.error('Profile check error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
}

module.exports = { requireShopAdmin, requireSuperAdmin, requireProfile };
