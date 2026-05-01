const express = require('express');
const router = express.Router();
const pool = require('../db');

const { requireLogin } = require('../middleware/auth');

// View Cart
router.get('/', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.id;
        // Find or create cart
        let [cart] = await pool.query('SELECT * FROM cart WHERE user_id = ?', [userId]);
        let cartId;
        if (cart.length === 0) {
            const [result] = await pool.query('INSERT INTO cart (user_id) VALUES (?)', [userId]);
            cartId = result.insertId;
        } else {
            cartId = cart[0].cart_id;
        }

        const [items] = await pool.query(`
            SELECT ci.cart_item_id, ci.quantity, p.product_id, p.name, p.price, p.stock_quantity
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.product_id
            WHERE ci.cart_id = ?
        `, [cartId]);

        let total = 0;
        items.forEach(item => total += item.quantity * item.price);

        res.render('cart', { items, total });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Add to Cart
router.post('/add', requireLogin, async (req, res) => {
    const { product_id, quantity } = req.body;
    const userId = req.session.user.id;
    try {
        // Find or create cart
        let [cart] = await pool.query('SELECT * FROM cart WHERE user_id = ?', [userId]);
        let cartId;
        if (cart.length === 0) {
            const [result] = await pool.query('INSERT INTO cart (user_id) VALUES (?)', [userId]);
            cartId = result.insertId;
        } else {
            cartId = cart[0].cart_id;
        }

        // Check if item exists in cart
        const [existingItem] = await pool.query('SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?', [cartId, product_id]);
        
        if (existingItem.length > 0) {
            await pool.query('UPDATE cart_items SET quantity = quantity + ? WHERE cart_item_id = ?', [quantity || 1, existingItem[0].cart_item_id]);
        } else {
            await pool.query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)', [cartId, product_id, quantity || 1]);
        }
        
        req.session.success_msg = 'Item added to cart.';
        res.redirect('/cart');
    } catch (error) {
        console.error(error);
        req.session.error_msg = 'Error adding to cart.';
        res.redirect('back');
    }
});

// Update Cart Quantity
router.post('/update', requireLogin, async (req, res) => {
    const { cart_item_id, quantity } = req.body;
    try {
        const db = await pool.getDb();
        await db.run('UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?', [quantity, cart_item_id]);
        res.redirect('/cart');
    } catch (error) {
        console.error(error);
        req.session.error_msg = 'Error updating cart.';
        res.redirect('/cart');
    }
});

// Remove from Cart
router.post('/remove', requireLogin, async (req, res) => {
    const { cart_item_id } = req.body;
    try {
        const db = await pool.getDb();
        await db.run('DELETE FROM cart_items WHERE cart_item_id = ?', [cart_item_id]);
        req.session.success_msg = 'Item removed from cart.';
        res.redirect('/cart');
    } catch (error) {
        console.error(error);
        req.session.error_msg = 'Error removing item.';
        res.redirect('/cart');
    }
});


module.exports = router;
