const express = require('express');
const router = express.Router();
const pool = require('../db');

// Home / Catalog
router.get('/', async (req, res) => {
    try {
        const [products] = await pool.query('SELECT p.*, u.name as host_name FROM products p JOIN users u ON p.host_id = u.user_id ORDER BY p.created_at DESC');
        res.render('index', { products });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Get Single Product
router.get('/product/:id', async (req, res) => {
    try {
        const db = await pool.getDb();
        const product = await db.get('SELECT p.*, u.name as host_name FROM products p JOIN users u ON p.host_id = u.user_id WHERE p.product_id = ?', [req.params.id]);
        if (!product) {
            return res.status(404).render('error', { error: 'Product not found.' });
        }
        res.render('product', { product });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Server Error' });
    }
});

module.exports = router;
