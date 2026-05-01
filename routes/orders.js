const express = require('express');
const router = express.Router();
const pool = require('../db');

const { requireLogin } = require('../middleware/auth');

// Checkout Action using SQLite Transaction in Node.js
router.post('/place', requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    try {
        const db = await pool.getDb();
        
        await db.run('BEGIN TRANSACTION');
        
        // Get the user's cart
        const cart = await db.get('SELECT cart_id FROM cart WHERE user_id = ?', [userId]);
        
        if (!cart) {
            await db.run('ROLLBACK');
            req.session.error_msg = 'No cart found for this user.';
            return res.redirect('/cart');
        }
        
        // Get cart items and check if empty
        const items = await db.all(`
            SELECT ci.product_id, ci.quantity, p.price 
            FROM cart_items ci 
            JOIN products p ON ci.product_id = p.product_id 
            WHERE ci.cart_id = ?
        `, [cart.cart_id]);
        
        if (items.length === 0) {
            await db.run('ROLLBACK');
            req.session.error_msg = 'Cart is empty. Cannot proceed with checkout.';
            return res.redirect('/cart');
        }
        
        // Calculate total amount
        let total = 0;
        for (let item of items) {
            total += item.quantity * item.price;
        }
        
        // Create the Order
        const orderResult = await db.run('INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)', [userId, total, 'completed']);
        const orderId = orderResult.lastID;
        
        // Move items from cart to order_items
        for (let item of items) {
            await db.run('INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)', [orderId, item.product_id, item.quantity, item.price]);
        }
        
        // Empty the cart
        await db.run('DELETE FROM cart_items WHERE cart_id = ?', [cart.cart_id]);
        
        await db.run('COMMIT');
        
        req.session.success_msg = 'Order placed successfully!';
        res.redirect('/orders/success');
        
    } catch (error) {
        console.error(error);
        const db = await pool.getDb();
        await db.run('ROLLBACK');
        req.session.error_msg = 'A server error occurred during checkout.';
        res.redirect('/cart');
    }
});

// Order Success View
router.get('/success', requireLogin, (req, res) => {
    res.render('order_success');
});

// View Orders
router.get('/', requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    try {
        const [orders] = await pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        for (let order of orders) {
            const [items] = await pool.query(`
                SELECT oi.*, p.name 
                FROM order_items oi 
                JOIN products p ON oi.product_id = p.product_id 
                WHERE oi.order_id = ?
            `, [order.order_id]);
            order.items = items;
        }
        res.render('orders', { orders });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// View Single Order
router.get('/:id', requireLogin, async (req, res) => {
    try {
        const db = await pool.getDb();
        const order = await db.get('SELECT * FROM orders WHERE order_id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
        if (!order) {
            req.session.error_msg = 'Order not found.';
            return res.redirect('/orders');
        }
        const items = await db.all(`
            SELECT oi.*, p.name 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.product_id 
            WHERE oi.order_id = ?
        `, [order.order_id]);
        
        res.render('order_detail', { order, items });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Server Error' });
    }
});

module.exports = router;
