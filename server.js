
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

console.log('--- SYSTEM INITIALIZING ---');
console.log('Detected Port:', port);
console.log('Node Version:', process.version);

// Standard Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Debug logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Global State
let pool = null;
let isConfigured = false;

async function initDbPool() {
    const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    if (!DB_NAME || !DB_USER) {
        console.warn("WARNING: DB_NAME or DB_USER missing in .env. Setup required.");
        return false;
    }
    try {
        pool = mysql.createPool({
            host: DB_HOST || 'localhost',
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            multipleStatements: true
        });
        const conn = await pool.getConnection();
        const [rows] = await conn.execute('SHOW TABLES LIKE "users"');
        conn.release();
        isConfigured = rows.length > 0;
        console.log("SUCCESS: Database connected.");
        return true;
    } catch (e) {
        console.error("FAILURE: Database connection error:", e.message);
        return false;
    }
}

// 1. HIGH-PRIORITY API ROUTES (Must be before static middleware)
app.get(['/admission-api/status', '/status'], (req, res) => {
    res.json({ 
        status: 'online', 
        configured: isConfigured,
        timestamp: new Date().toISOString()
    });
});

app.post(['/admission-api', '/admission-api/'], async (req, res) => {
    const { action } = req.body;
    if (!action) return res.status(400).json({ error: 'Action parameter required' });

    try {
        // Setup Logic
        if (action === 'test_db_connection') {
            const { host, user, pass, name } = req.body;
            const testConn = await mysql.createConnection({ host, user, password: pass, database: name });
            await testConn.end();
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
            await conn.execute(
                'REPLACE INTO users (id, username, password, name, role, isActive) VALUES (?, ?, ?, ?, ?, ?)',
                ['admin-init', adminUser, adminPass, 'Super Admin', 'SUPER_ADMIN', 1]
            );
            conn.release();
            await testPool.end();

            const envContent = `DB_HOST=${dbHost}\nDB_USER=${dbUser}\nDB_PASSWORD=${dbPass}\nDB_NAME=${dbName}\nPORT=${port}`;
            fs.writeFileSync(path.join(__dirname, '.env'), envContent);
            
            process.env.DB_HOST = dbHost;
            process.env.DB_USER = dbUser;
            process.env.DB_PASSWORD = dbPass;
            process.env.DB_NAME = dbName;
            
            await initDbPool();
            return res.json({ status: 'success' });
        }

        // Operational Logic
        if (!isConfigured || !pool) {
            return res.status(503).json({ error: 'Database not initialized. Please run installer.' });
        }

        switch (action) {
            case 'login':
                const [users] = await pool.execute('SELECT * FROM users WHERE username = ? AND isActive = 1', [req.body.username]);
                const user = users[0];
                if (user && user.password === req.body.password) {
                    const { password, ...safeUser } = user;
                    res.json({ status: 'success', user: safeUser });
                } else {
                    res.status(401).json({ error: 'Unauthorized' });
                }
                break;
            case 'get_candidates':
                const [candidates] = await pool.execute('SELECT * FROM candidates ORDER BY createdAt DESC');
                res.json(candidates.map(c => ({
                    ...c,
                    personalDetails: JSON.parse(c.personalDetails || '{}'),
                    contactDetails: JSON.parse(c.contactDetails || '{}'),
                    addressDetails: JSON.parse(c.addressDetails || '{}'),
                    travelDetails: JSON.parse(c.travelDetails || '{}'),
                    paymentHistory: JSON.parse(c.paymentHistory || '[]')
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
                await pool.execute('REPLACE INTO batches (id, name, maxSeats, createdAt) VALUES (?, ?, ?, ?)', [b.id, b.name, b.maxSeats, b.createdAt]);
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
                res.status(400).json({ error: `Action '${action}' not supported` });
        }
    } catch (err) {
        console.error("API Route Error:", err.message);
        res.status(500).json({ error: 'Internal Error', message: err.message });
    }
});

// 2. STATIC FILE SERVING
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
        // Safety: Don't let SPA wildcard catch API calls that missed
        if (req.url.startsWith('/admission-api')) {
            return res.status(404).json({ error: 'API not found' });
        }
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    // If no dist folder, serve a placeholder or the installer
    app.get('/installer.html', (req, res) => res.sendFile(path.join(__dirname, 'installer.html')));
    app.get('/installer.tsx', (req, res) => res.sendFile(path.join(__dirname, 'installer.tsx')));
    app.get('/', (req, res) => res.send('Frontend build not found. Run "npm run build" first.'));
}

// Start
app.listen(port, '0.0.0.0', async () => {
    console.log(`SERVER RUNNING at 0.0.0.0:${port}`);
    await initDbPool();
});
