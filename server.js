const express = require('express');
const path = require('path');
const session = require('express-session');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const pool = require('./db');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Custom middleware
const { attachCartCount } = require('./middleware/auth');

// Global variables for views
app.use(attachCartCount);
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.success_msg = req.session.success_msg || null;
    res.locals.error_msg = req.session.error_msg || null;
    delete req.session.success_msg;
    delete req.session.error_msg;
    next();
});

// Routes
app.use('/', require('./routes/products'));
app.use('/auth', require('./routes/auth'));
app.use('/cart', require('./routes/cart'));
app.use('/orders', require('./routes/orders'));
app.use('/admin', require('./routes/admin'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
