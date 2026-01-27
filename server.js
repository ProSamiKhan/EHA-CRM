
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

console.log('--- STARTING CRM BACKEND ---');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 1. DB Initialization
let pool = null;
let isConfigured = false;

async function initDbPool() {
    const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    if (!DB_NAME || !DB_USER) {
        console.log(">> DB Config missing in Env Variables.");
        return false;
    }
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
        console.log(isConfigured ? ">> Database Connected & Tables Found." : ">> Database Connected but Tables Missing.");
        return true;
    } catch (e) {
        console.error("!! DB Connection Error:", e.message);
        return false;
    }
}

// 2. API Routes
const api = express.Router();

api.get('/status', (req, res) => {
    res.json({ 
        online: true, 
        db: isConfigured, 
        env_check: !!process.env.DB_NAME,
        time: new Date().toISOString() 
    });
});

// Use both '/' and empty string to catch all POSTs to /admission-api/
const handleApiPost = async (req, res) => {
    const { action } = req.body;
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
            await initDbPool();
            return res.json({ status: 'success' });
        }

        if (!isConfigured || !pool) return res.status(503).json({ error: 'DB not ready' });

        switch (action) {
            case 'login':
                const [users] = await pool.execute('SELECT * FROM users WHERE username = ? AND isActive = 1', [req.body.username]);
                if (users[0] && users[0].password === req.body.password) {
                    const u = { ...users[0] };
                    delete u.password;
                    res.json({ status: 'success', user: u });
                } else res.status(401).json({ error: 'Invalid credentials' });
                break;
            case 'get_candidates':
                const [candidates] = await pool.execute('SELECT * FROM candidates ORDER BY createdAt DESC');
                res.json(candidates.map(r => ({
                    ...r, 
                    personalDetails: JSON.parse(r.personalDetails),
                    contactDetails: JSON.parse(r.contactDetails),
                    addressDetails: JSON.parse(r.addressDetails),
                    travelDetails: JSON.parse(r.travelDetails),
                    paymentHistory: JSON.parse(r.paymentHistory)
                })));
                break;
            case 'save_candidate':
                const d = req.body.candidate;
                await pool.execute(
                    `INSERT INTO candidates (id, batchId, executiveId, status, paymentStatus, personalDetails, contactDetails, addressDetails, travelDetails, paymentHistory, createdAt, updatedAt) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE batchId=VALUES(batchId), status=VALUES(status), paymentStatus=VALUES(paymentStatus), personalDetails=VALUES(personalDetails), contactDetails=VALUES(contactDetails), addressDetails=VALUES(addressDetails), travelDetails=VALUES(travelDetails), paymentHistory=VALUES(paymentHistory), updatedAt=VALUES(updatedAt)`,
                    [d.id, d.batchId, d.executiveId, d.status, d.paymentStatus, JSON.stringify(d.personalDetails), JSON.stringify(d.contactDetails), JSON.stringify(d.addressDetails), JSON.stringify(d.travelDetails), JSON.stringify(d.paymentHistory), d.createdAt || Date.now(), Date.now()]
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
                const [ul] = await pool.execute('SELECT id, username, name, role, isActive FROM users');
                res.json(ul);
                break;
            case 'save_user':
                const u = req.body.user;
                if (req.body.password) await pool.execute('REPLACE INTO users (id, username, name, role, isActive, password) VALUES (?, ?, ?, ?, ?, ?)', [u.id, u.username, u.name, u.role, u.isActive?1:0, req.body.password]);
                else await pool.execute('UPDATE users SET name=?, role=?, isActive=? WHERE id=?', [u.name, u.role, u.isActive?1:0, u.id]);
                res.json({ status: 'success' });
                break;
            case 'delete_user': await pool.execute('DELETE FROM users WHERE id=?', [req.body.id]); res.json({status:'success'}); break;
            case 'delete_batch': await pool.execute('DELETE FROM batches WHERE id=?', [req.body.id]); res.json({status:'success'}); break;
            default: res.status(400).json({ error: 'Unknown action' });
        }
    } catch (e) {
        console.error("API POST Error:", e.message);
        res.status(500).json({ error: e.message });
    }
};

api.post('/', handleApiPost);
api.post('', handleApiPost);

app.use('/admission-api', api);

// 3. Static Files & Routing
const buildPath = path.join(__dirname, 'build');

if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    
    // Explicit route for installer
    app.get('/installer.html', (req, res) => {
        res.sendFile(path.join(buildPath, 'installer.html'));
    });

    app.get('*', (req, res) => {
        if (req.url.startsWith('/admission-api')) return res.status(404).end();
        res.sendFile(path.join(buildPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => res.send('Backend API is running. Build folder missing. Please run "npm run build".'));
}

app.listen(port, '0.0.0.0', async () => {
    console.log(`>> Server online on port ${port}`);
    await initDbPool();
});
