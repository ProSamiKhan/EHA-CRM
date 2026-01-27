
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

console.log('--- CRM BACKEND STARTING ---');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 1. Database Connection Logic
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
            connectionLimit: 10
        });
        const conn = await pool.getConnection();
        const [rows] = await conn.execute('SHOW TABLES LIKE "users"');
        conn.release();
        isConfigured = rows.length > 0;
        return true;
    } catch (e) {
        return false;
    }
}

// 2. CRITICAL: API Handler (Must be at the top)
const apiHandler = async (req, res) => {
    // Health Check
    if (req.method === 'GET') {
        return res.json({ status: 'online', configured: isConfigured });
    }

    const { action } = req.body;
    if (!action) return res.status(400).json({ error: 'No action provided' });

    try {
        // Installation Routes
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

        // Check if DB is ready for other actions
        if (!isConfigured || !pool) {
            return res.status(503).json({ error: 'Database not set up' });
        }

        // Main API Switch
        switch (action) {
            case 'login':
                const [users] = await pool.execute('SELECT * FROM users WHERE username = ? AND isActive = 1', [req.body.username]);
                if (users[0] && users[0].password === req.body.password) {
                    const u = { ...users[0] };
                    delete u.password;
                    return res.json({ status: 'success', user: u });
                }
                return res.status(401).json({ error: 'Invalid login' });
            
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

            case 'save_batch':
                const b = req.body.batch;
                await pool.execute(
                    'INSERT INTO batches (id, name, maxSeats, createdAt) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), maxSeats=VALUES(maxSeats)',
                    [b.id, b.name, b.maxSeats, b.createdAt || Date.now()]
                );
                return res.json({ status: 'success' });

            case 'delete_batch':
                await pool.execute('DELETE FROM batches WHERE id = ?', [req.body.id]);
                return res.json({ status: 'success' });

            case 'get_users':
                const [ul] = await pool.execute('SELECT id, username, name, role, isActive FROM users');
                return res.json(ul);

            case 'save_user':
                const u = req.body.user;
                const p = req.body.password;
                if (p) {
                    await pool.execute(
                        'INSERT INTO users (id, username, password, name, role, isActive) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE username=VALUES(username), password=VALUES(password), name=VALUES(name), role=VALUES(role), isActive=VALUES(isActive)',
                        [u.id, u.username, p, u.name, u.role, u.isActive ? 1 : 0]
                    );
                } else {
                    await pool.execute(
                        'INSERT INTO users (id, username, name, role, isActive) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE username=VALUES(username), name=VALUES(name), role=VALUES(role), isActive=VALUES(isActive)',
                        [u.id, u.username, u.name, u.role, u.isActive ? 1 : 0]
                    );
                }
                return res.json({ status: 'success' });

            case 'delete_user':
                await pool.execute('DELETE FROM users WHERE id = ?', [req.body.id]);
                return res.json({ status: 'success' });

            case 'get_audit_logs':
                try {
                    const [logs] = await pool.execute('SELECT * FROM audit_logs ORDER BY timestamp DESC');
                    return res.json(logs);
                } catch (e) {
                    // Fallback if table doesn't exist yet
                    return res.json([]);
                }

            default: 
                return res.status(404).json({ error: 'Action not found' });
        }
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

// Use a very simple, non-conflicting path
app.all('/_api_', apiHandler);
app.all('/_api_/*', apiHandler);

// 3. Static Files
const buildPath = path.join(__dirname, 'build');
if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get('/installer.html', (req, res) => res.sendFile(path.join(buildPath, 'installer.html')));
    app.get('*', (req, res) => {
        if (req.url.startsWith('/_api_')) return;
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

app.listen(port, '0.0.0.0', async () => {
    console.log(`>> Server awake on port ${port}`);
    await initDbPool();
});
