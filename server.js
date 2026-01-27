
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
// Hostinger provides the port via process.env.PORT
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 1. ABSOLUTE PRIORITY ROUTES (No middleware interference)
app.get('/api-status', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({ 
        status: 'active', 
        message: 'Node.js is responding',
        timestamp: Date.now()
    }));
});

// 2. Database State
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
        console.log(">> DB Connected");
        return true;
    } catch (e) {
        console.error(">> DB Error:", e.message);
        return false;
    }
}

// 3. API Handler Function
const apiHandler = async (req, res) => {
    if (req.method === 'GET') {
        return res.json({ status: 'online', configured: isConfigured });
    }

    const { action } = req.body;
    if (!action) return res.status(400).json({ error: 'Action missing' });

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

        if (!isConfigured || !pool) return res.status(503).json({ error: 'DB not ready' });

        switch (action) {
            case 'login':
                const [users] = await pool.execute('SELECT * FROM users WHERE username = ? AND isActive = 1', [req.body.username]);
                if (users[0] && users[0].password === req.body.password) {
                    const u = { ...users[0] }; delete u.password;
                    return res.json({ status: 'success', user: u });
                }
                return res.status(401).json({ error: 'Invalid' });
            
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
                return res.status(404).json({ error: 'Action unknown' });
        }
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

app.all('/api-v1', apiHandler);
app.all('/api-v1/*', apiHandler);

// 4. Static Files & SPA Logic
const buildPath = path.join(__dirname, 'build');
app.use(express.static(buildPath));

app.get('*', (req, res) => {
    // DO NOT allow index.html to serve for API paths
    if (req.url.startsWith('/api-v1') || req.url === '/api-status') {
        return res.status(404).json({ error: 'API route not matched' });
    }
    
    const indexPath = path.join(buildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Application build not found. Please run build script.');
    }
});

app.listen(port, '0.0.0.0', async () => {
    console.log(`>> Node Server running on port ${port}`);
    await initDbPool();
});
