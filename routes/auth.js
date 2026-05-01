const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../db');

// Register View
router.get('/register', (req, res) => {
    res.render('register');
});

// Register Action
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role || 'customer']
        );
        req.session.success_msg = 'Registration successful. Please log in.';
        res.redirect('/auth/login');
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            req.session.error_msg = 'Email already exists.';
        } else {
            req.session.error_msg = 'An error occurred during registration.';
        }
        res.redirect('/auth/register');
    }
});

// Login View
router.get('/login', (req, res) => {
    res.render('login');
});

// Login Action
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length > 0) {
            const user = users[0];
            const match = await bcrypt.compare(password, user.password_hash);
            if (match) {
                req.session.user = {
                    id: user.user_id,
                    name: user.name,
                    role: user.role
                };
                res.redirect('/');
            } else {
                req.session.error_msg = 'Invalid credentials';
                res.redirect('/auth/login');
            }
        } else {
            req.session.error_msg = 'Invalid credentials';
            res.redirect('/auth/login');
        }
    } catch (error) {
        console.error(error);
        req.session.error_msg = 'Login error';
        res.redirect('/auth/login');
    }
});

// Logout Action
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
