
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
// Hostinger uses process.env.PORT automatically
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Logging middleware to help debug in Hostinger logs
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 1. Root Test Route - check if node is reachable at all
app.get('/api-status', (req, res) => {
    res.status(200).json({ status: 'active', message: 'Node.js is responding' });
});

// 2. Database Connection
let pool = null;
let isConfigured = false;

async function initDbPool() {
    const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    if (!DB_NAME || !DB_USER) return false;
    try {
        pool = mysql.createPool({
            host: DB_HOST || 'localhost',
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
            waitForConnections: true,
            connectionLimit: 5
        });
        const conn = await pool.getConnection();
        const [rows] = await conn.execute('SHOW TABLES LIKE "users"');
        conn.release();
        isConfigured = rows.length > 0;
        console.log(">> Database Connected Successfully");
        return true;
    } catch (e) {
        console.error(">> Database Connection Error:", e.message);
        return false;
    }
}

// 3. Main API Handler
const apiHandler = async (req, res) => {
    // Return status on GET
    if (req.method === 'GET') {
        return res.json({ 
            status: 'online', 
            configured: isConfigured, 
            version: '1.2.5',
            node_env: process.env.NODE_ENV || 'production'
        });
    }

    const { action } = req.body;
    if (!action) return res.status(400).json({ error: 'No action specified' });

    try {
        if (action === 'test_db_connection') {
            const { host, user, pass, name } = req.body;
            const test = await mysql.createConnection({ host, user, password: pass, database: name });
            await test.end();
            return res.json({ status: 'success' });
        }
        
        if (action === 'perform_install') {
            const { dbHost, dbUser, dbPass, dbName, adminUser, adminPass } = req.body;
            const testPool = mysql.createPool({ host: dbHost, user: dbUser, password: dbPass, database: dbName, multipleStatements: true });
            const conn = await testPool.getConnection();
            const schemaPath = path.join(__dirname, 'schema.sql');
            if (fs.existsSync(schemaPath)) {
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                await conn.query(schemaSql);
            }
            await conn.execute('REPLACE INTO users (id, username, password, name, role, isActive) VALUES (?, ?, ?, ?, ?, ?)',
                ['admin-init', adminUser, adminPass, 'Super Admin', 'SUPER_ADMIN', 1]);
            conn.release();
            await testPool.end();
            isConfigured = true;
            await initDbPool();
            return res.json({ status: 'success' });
        }

        if (!isConfigured || !pool) return res.status(503).json({ error: 'DB not configured' });

        switch (action) {
            case 'login':
                const [users] = await pool.execute('SELECT * FROM users WHERE username = ? AND isActive = 1', [req.body.username]);
                if (users[0] && users[0].password === req.body.password) {
                    const u = { ...users[0] }; delete u.password;
                    return res.json({ status: 'success', user: u });
                }
                return res.status(401).json({ error: 'Unauthorized' });
            
            case 'get_candidates':
                const [candidates] = await pool.execute('SELECT * FROM candidates ORDER BY createdAt DESC');
                return res.json(candidates.map(r => ({
                    ...r, 
                    personalDetails: JSON.parse(r.personalDetails),
                    contactDetails: JSON.parse(r.contactDetails),
                    addressDetails: JSON.parse(r.addressDetails),
                    travelDetails: JSON.parse(r.travelDetails),
                    paymentHistory: JSON.parse(r.paymentHistory)
                })));

            case 'save_candidate':
                const d = req.body.candidate;
                await pool.execute(
                    `INSERT INTO candidates (id, batchId, executiveId, status, paymentStatus, personalDetails, contactDetails, addressDetails, travelDetails, paymentHistory, createdAt, updatedAt) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE batchId=VALUES(batchId), status=VALUES(status), paymentStatus=VALUES(paymentStatus), personalDetails=VALUES(personalDetails), contactDetails=VALUES(contactDetails), addressDetails=VALUES(addressDetails), travelDetails=VALUES(travelDetails), paymentHistory=VALUES(paymentHistory), updatedAt=VALUES(updatedAt)`,
                    [d.id, d.batchId, d.executiveId, d.status, d.paymentStatus, JSON.stringify(d.personalDetails), JSON.stringify(d.contactDetails), JSON.stringify(d.addressDetails), JSON.stringify(d.travelDetails), JSON.stringify(d.paymentHistory), d.createdAt || Date.now(), Date.now()]
                );
                return res.json({ status: 'success' });

            case 'get_batches':
                const [batches] = await pool.execute('SELECT * FROM batches');
                return res.json(batches);

            case 'get_users':
                const [ul] = await pool.execute('SELECT id, username, name, role, isActive FROM users');
                return res.json(ul);

            default: 
                return res.status(404).json({ error: 'Action not found' });
        }
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

// Use api-v1 (cleaner URL)
app.all('/api-v1', apiHandler);
app.all('/api-v1/*', apiHandler);

// 4. Static Files
const buildPath = path.join(__dirname, 'build');
if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    // Serve index.html for all other routes to support SPA
    app.get('*', (req, res) => {
        if (req.url.startsWith('/api-v1') || req.url === '/api-status') return;
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

app.listen(port, '0.0.0.0', async () => {
    console.log(`>> Server listening on port ${port}`);
    await initDbPool();
});
