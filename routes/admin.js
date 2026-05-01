const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

// Dashboard (List Products)
router.get('/', async (req, res) => {
    try {
        const db = await pool.getDb();
        const products = await db.all('SELECT * FROM products WHERE host_id = ? ORDER BY created_at DESC', [req.session.user.id]);
        res.render('admin/dashboard', { products });
    } catch (error) {
        console.error(error);
        res.render('error', { error: 'Server error loading dashboard.' });
    }
});

// Show Add Product Form
router.get('/product/new', (req, res) => {
    res.render('admin/product_form', { product: null });
});

// Handle Add Product
router.post('/product/new', async (req, res) => {
    const { name, description, price, stock_quantity } = req.body;
    try {
        const db = await pool.getDb();
        await db.run(
            'INSERT INTO products (host_id, name, description, price, stock_quantity) VALUES (?, ?, ?, ?, ?)',
            [req.session.user.id, name, description, price, stock_quantity]
        );
        req.session.success_msg = 'Product added successfully.';
        res.redirect('/admin');
    } catch (error) {
        console.error(error);
        req.session.error_msg = 'Error adding product.';
        res.redirect('/admin/product/new');
    }
});

// Show Edit Product Form
router.get('/product/:id/edit', async (req, res) => {
    try {
        const db = await pool.getDb();
        const product = await db.get('SELECT * FROM products WHERE product_id = ? AND host_id = ?', [req.params.id, req.session.user.id]);
        if (!product) {
            req.session.error_msg = 'Product not found.';
            return res.redirect('/admin');
        }
        res.render('admin/product_form', { product });
    } catch (error) {
        console.error(error);
        res.render('error', { error: 'Server error loading product.' });
    }
});

// Handle Edit Product
router.post('/product/:id/edit', async (req, res) => {
    const { name, description, price, stock_quantity } = req.body;
    try {
        const db = await pool.getDb();
        await db.run(
            'UPDATE products SET name = ?, description = ?, price = ?, stock_quantity = ? WHERE product_id = ? AND host_id = ?',
            [name, description, price, stock_quantity, req.params.id, req.session.user.id]
        );
        req.session.success_msg = 'Product updated successfully.';
        res.redirect('/admin');
    } catch (error) {
        console.error(error);
        req.session.error_msg = 'Error updating product.';
        res.redirect(`/admin/product/${req.params.id}/edit`);
    }
});

// Handle Delete Product
router.post('/product/:id/delete', async (req, res) => {
    try {
        const db = await pool.getDb();
        await db.run('DELETE FROM products WHERE product_id = ? AND host_id = ?', [req.params.id, req.session.user.id]);
        req.session.success_msg = 'Product deleted successfully.';
        res.redirect('/admin');
    } catch (error) {
        console.error(error);
        req.session.error_msg = 'Error deleting product.';
        res.redirect('/admin');
    }
});

// Manage Orders
router.get('/orders', async (req, res) => {
    try {
        // Find orders containing products sold by this host
        const db = await pool.getDb();
        const orders = await db.all(`
            SELECT DISTINCT o.* 
            FROM orders o
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN products p ON oi.product_id = p.product_id
            WHERE p.host_id = ?
            ORDER BY o.created_at DESC
        `, [req.session.user.id]);
        
        res.render('admin/orders', { orders });
    } catch (error) {
        console.error(error);
        res.render('error', { error: 'Server error loading orders.' });
    }
});

// Update Order Status
router.post('/orders/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        const db = await pool.getDb();
        await db.run('UPDATE orders SET status = ? WHERE order_id = ?', [status, req.params.id]);
        req.session.success_msg = 'Order status updated.';
        res.redirect('/admin/orders');
    } catch (error) {
        console.error(error);
        req.session.error_msg = 'Error updating status.';
        res.redirect('/admin/orders');
    }
});

module.exports = router;
