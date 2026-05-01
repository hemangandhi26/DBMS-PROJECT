const pool = require('../db');

const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        req.session.error_msg = 'Please log in to access this page.';
        return res.redirect('/auth/login');
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'host') { // Mapping "admin" concept to "host" from our schema
        req.session.error_msg = 'Access denied. Admins/Hosts only.';
        return res.redirect('/');
    }
    next();
};

const attachCartCount = async (req, res, next) => {
    res.locals.cartCount = 0;
    if (req.session.user && req.session.user.role === 'customer') {
        try {
            const db = await pool.getDb();
            const cart = await db.get('SELECT cart_id FROM cart WHERE user_id = ?', [req.session.user.id]);
            if (cart) {
                const result = await db.get('SELECT SUM(quantity) as count FROM cart_items WHERE cart_id = ?', [cart.cart_id]);
                res.locals.cartCount = result.count || 0;
            }
        } catch (err) {
            console.error('Error fetching cart count:', err);
        }
    }
    next();
};

module.exports = {
    requireLogin,
    requireAdmin,
    attachCartCount
};
