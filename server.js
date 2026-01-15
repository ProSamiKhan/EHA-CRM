
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database Pool Configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    multipleStatements: true // Enable for the seeder
};

const pool = mysql.createPool(dbConfig);

/**
 * Database Auto-Initialization (Seeder)
 * Automatically runs schema.sql on startup
 */
async function dbInit() {
    console.log('--- DATABASE INITIALIZATION START ---');
    console.log(`Target Host: ${dbConfig.host}`);
    console.log(`Target User: ${dbConfig.user}`);
    console.log(`Target DB: ${dbConfig.database}`);

    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (!fs.existsSync(schemaPath)) {
            console.warn('schema.sql not found. Skipping auto-initialization.');
            return;
        }

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        // Split by semicolon and filter out empty strings/comments
        const statements = schemaSql
            .split(/;\s*$/m)
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        const conn = await pool.getConnection();
        console.log('Database connection successful. Executing schema...');

        for (let statement of statements) {
            try {
                await conn.query(statement);
            } catch (stmtErr) {
                // Ignore errors like "Table already exists" or "Duplicate entry"
                if (!stmtErr.message.includes('already exists') && !stmtErr.message.includes('Duplicate entry')) {
                    console.error('Error executing statement:', statement.substring(0, 50) + '...');
                    console.error(stmtErr.message);
                }
            }
        }

        conn.release();
        console.log('--- DATABASE INITIALIZATION COMPLETE ---');
    } catch (err) {
        console.error('--- DATABASE INITIALIZATION FAILED ---');
        console.error('Error:', err.message);
        console.log('Verify your environment variables in Hostinger Panel.');
    }
}

// Diagnostic Route: Visit /admission-api in your browser to check status
app.get('/admission-api', async (req, res) => {
    try {
        const [users] = await pool.execute('SELECT COUNT(*) as count FROM users');
        const [batches] = await pool.execute('SELECT COUNT(*) as count FROM batches');
        
        res.json({ 
            status: 'online', 
            database: 'connected', 
            stats: {
                userCount: users[0].count,
                batchCount: batches[0].count
            },
            timestamp: new Date().toISOString(),
            message: 'Admission CRM API is fully functional.' 
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'online', 
            database: 'error', 
            error: err.message,
            stack: err.code,
            tip: 'If you see Access Denied, check your Hostinger DB credentials.'
        });
    }
});

// Main API Handler
const API_PATH = '/admission-api';

app.post(API_PATH, async (req, res) => {
    const { action } = req.body;
    
    if (!action) {
        return res.status(400).json({ error: 'Missing action' });
    }

    try {
        switch (action) {
            case 'login':
                console.log(`Login request received for: ${req.body.username}`);
                const [users] = await pool.execute(
                    'SELECT * FROM users WHERE username = ? AND isActive = 1', 
                    [req.body.username]
                );
                
                const user = users[0];
                if (user && user.password === req.body.password) {
                    console.log('User authenticated successfully');
                    const responseUser = { ...user };
                    delete responseUser.password;
                    res.json({ status: 'success', user: responseUser });
                } else {
                    console.warn(`Authentication failed for user: ${req.body.username}`);
                    res.status(401).json({ error: 'Invalid username or password' });
                }
                break;

            case 'get_candidates':
                const [candidates] = await pool.execute('SELECT * FROM candidates ORDER BY createdAt DESC');
                res.json(candidates.map(c => ({
                    ...c,
                    personalDetails: typeof c.personalDetails === 'string' ? JSON.parse(c.personalDetails) : c.personalDetails,
                    contactDetails: typeof c.contactDetails === 'string' ? JSON.parse(c.contactDetails) : c.contactDetails,
                    addressDetails: typeof c.addressDetails === 'string' ? JSON.parse(c.addressDetails) : c.addressDetails,
                    travelDetails: typeof c.travelDetails === 'string' ? JSON.parse(c.travelDetails) : c.travelDetails,
                    paymentHistory: typeof c.paymentHistory === 'string' ? JSON.parse(c.paymentHistory) : c.paymentHistory
                })));
                break;

            case 'save_candidate':
                const data = req.body.candidate;
                await pool.execute(
                    `INSERT INTO candidates (id, batchId, executiveId, status, paymentStatus, personalDetails, contactDetails, addressDetails, travelDetails, paymentHistory, createdAt, updatedAt) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE 
                     batchId=VALUES(batchId), status=VALUES(status), paymentStatus=VALUES(paymentStatus), 
                     personalDetails=VALUES(personalDetails), contactDetails=VALUES(contactDetails), 
                     addressDetails=VALUES(addressDetails), travelDetails=VALUES(travelDetails), 
                     paymentHistory=VALUES(paymentHistory), updatedAt=VALUES(updatedAt)`,
                    [
                        data.id, data.batchId, data.executiveId, data.status, data.paymentStatus,
                        JSON.stringify(data.personalDetails), JSON.stringify(data.contactDetails),
                        JSON.stringify(data.addressDetails), JSON.stringify(data.travelDetails),
                        JSON.stringify(data.paymentHistory), data.createdAt || Date.now(), Date.now()
                    ]
                );
                res.json({ status: 'success' });
                break;

            case 'get_batches':
                const [batches] = await pool.execute('SELECT * FROM batches');
                res.json(batches);
                break;

            case 'save_batch':
                const b = req.body.batch;
                await pool.execute('REPLACE INTO batches (id, name, maxSeats, createdAt) VALUES (?, ?, ?, ?)', 
                    [b.id, b.name, b.maxSeats, b.createdAt]);
                res.json({ status: 'success' });
                break;

            case 'get_users':
                const [userList] = await pool.execute('SELECT id, username, name, role, isActive FROM users');
                res.json(userList);
                break;

            case 'save_user':
                const u = req.body.user;
                if (req.body.password) {
                    await pool.execute('REPLACE INTO users (id, username, name, role, isActive, password) VALUES (?, ?, ?, ?, ?, ?)',
                        [u.id, u.username, u.name, u.role, u.isActive ? 1 : 0, req.body.password]);
                } else {
                    await pool.execute('UPDATE users SET name=?, role=?, isActive=? WHERE id=?',
                        [u.name, u.role, u.isActive ? 1 : 0, u.id]);
                }
                res.json({ status: 'success' });
                break;

            case 'delete_user':
                await pool.execute('DELETE FROM users WHERE id = ?', [req.body.id]);
                res.json({ status: 'success' });
                break;

            case 'delete_batch':
                await pool.execute('DELETE FROM batches WHERE id = ?', [req.body.id]);
                res.json({ status: 'success' });
                break;

            default:
                res.status(400).json({ error: 'Invalid action' });
        }
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

// Serve Static Files
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Catch-all for SPA - Must be last
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// Run DB Init then Start Listening
dbInit().then(() => {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
        console.log(`Diagnostic path: GET /admission-api`);
        console.log(`API path: POST /admission-api`);
    });
});
