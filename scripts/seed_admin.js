const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcrypt');

async function seedAdmin() {
    try {
        const db = await open({
            filename: path.join(__dirname, '../database.sqlite'),
            driver: sqlite3.Database
        });

        const email = 'admin@nexusstore.com';
        const password = 'admin';
        const name = 'Super Admin';
        const role = 'host'; // In our schema, host acts as admin

        // Check if exists
        const existing = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (existing) {
            console.log('Admin user already exists.');
            return;
        }

        const hash = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email, hash, role]);
        
        console.log('Admin seeded successfully! Login with:');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        
    } catch (err) {
        console.error('Error seeding admin:', err);
    }
}

seedAdmin();
