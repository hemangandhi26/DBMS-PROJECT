const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

let dbInstance = null;

async function setupDB() {
    if (dbInstance) return dbInstance;
    
    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON;');

    // Read and execute schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await db.exec(schema);

    dbInstance = db;
    return db;
}

// Wrapper to mimic mysql2 interface for our routes
const pool = {
    query: async (sql, params = []) => {
        const db = await setupDB();
        
        if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('SHOW')) {
            const rows = await db.all(sql, params);
            return [rows]; 
        } else {
            const result = await db.run(sql, params);
            // Map SQLite lastID to MySQL insertId
            result.insertId = result.lastID;
            // Map SQLite changes to MySQL affectedRows
            result.affectedRows = result.changes;
            return [result, null];
        }
    },
    getDb: setupDB
};

module.exports = pool;
