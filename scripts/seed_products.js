const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function seedProducts() {
    try {
        const db = await open({
            filename: path.join(__dirname, '../database.sqlite'),
            driver: sqlite3.Database
        });

        const email = 'admin@nexusstore.com';
        const admin = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        
        if (!admin) {
            console.log('Error: Admin user not found. Please run seed_admin.js first.');
            return;
        }

        const hostId = admin.user_id;

        const productsToSeed = [
            { name: 'Wireless Noise-Canceling Headphones', description: 'Experience premium sound quality with active noise cancellation, 30-hour battery life, and comfortable over-ear fit.', price: 299.99, stock_quantity: 45 },
            { name: 'Mechanical Gaming Keyboard', description: 'RGB backlit mechanical keyboard with tactile blue switches, anti-ghosting technology, and an aluminum frame.', price: 129.50, stock_quantity: 120 },
            { name: '4K Ultra HD Smart TV', description: '55-inch 4K HDR smart television featuring deep blacks, vibrant colors, and built-in streaming apps.', price: 649.00, stock_quantity: 15 },
            { name: 'Ergonomic Office Chair', description: 'Adjustable ergonomic mesh office chair with lumbar support, 3D armrests, and dynamic tilt functionality.', price: 199.95, stock_quantity: 30 },
            { name: 'Smart Home Hub', description: 'Centralize your smart home devices with this voice-controlled hub. Compatible with all major IoT standards.', price: 89.99, stock_quantity: 200 }
        ];

        for (const p of productsToSeed) {
            // Check if product already exists to avoid duplicates if run multiple times
            const existing = await db.get('SELECT * FROM products WHERE name = ? AND host_id = ?', [p.name, hostId]);
            if (!existing) {
                await db.run('INSERT INTO products (host_id, name, description, price, stock_quantity) VALUES (?, ?, ?, ?, ?)', [hostId, p.name, p.description, p.price, p.stock_quantity]);
            }
        }
        
        console.log('Products seeded successfully!');
        
    } catch (err) {
        console.error('Error seeding products:', err);
    }
}

seedProducts();
