const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../..', '.env') });

// Create a new pool instance
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'email_lead',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function setupDatabase() {
    try {
        // Read the SQL file
        const sql = fs.readFileSync(path.join(__dirname, 'setup.sql'), 'utf8');
        
        // Execute the SQL
        await pool.query(sql);
        console.log('✅ Database setup completed successfully!');
    } catch (err) {
        console.error('❌ Database setup failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

setupDatabase(); 