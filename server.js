
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const buildPath = path.resolve(__dirname, 'build');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 1. API STATUS
app.get('/api-status', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        // Check if users table exists as a proxy for schema health
        const [tables] = await pool.query("SHOW TABLES LIKE 'users'");
        res.json({ 
            status: 'active', 
            database: 'connected',
            schema: tables.length > 0 ? 'ready' : 'missing_tables',
            time: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
});

// 2. MAIN API ENDPOINT
app.post('/api-v1', async (req, res) => {
    const { action } = req.body;

    try {
        switch (action) {
            case 'login':
                const [users] = await pool.query('SELECT id, username, name, role, isActive, password FROM users WHERE username = ? AND isActive = 1', [req.body.username]);
                const user = users[0];
                if (user && user.password === req.body.password) {
                    const sessionUser = { ...user };
                    delete sessionUser.password;
                    return res.json({ status: 'success', user: sessionUser });
                }
                return res.status(401).json({ error: 'Invalid credentials' });

            case 'get_candidates':
                const [candidates] = await pool.query('SELECT * FROM candidates ORDER BY createdAt DESC');
                const formatted = candidates.map(c => ({
                    ...c,
                    personalDetails: typeof c.personalDetails === 'string' ? JSON.parse(c.personalDetails) : c.personalDetails,
                    contactDetails: typeof c.contactDetails === 'string' ? JSON.parse(c.contactDetails) : c.contactDetails,
                    addressDetails: typeof c.addressDetails === 'string' ? JSON.parse(c.addressDetails) : c.addressDetails,
                    travelDetails: typeof c.travelDetails === 'string' ? JSON.parse(c.travelDetails) : c.travelDetails,
                    paymentHistory: typeof c.paymentHistory === 'string' ? JSON.parse(c.paymentHistory) : c.paymentHistory
                }));
                return res.json(formatted);

            case 'save_candidate':
                const c = req.body.candidate;
                const candQuery = `
                    INSERT INTO candidates (id, batchId, executiveId, status, paymentStatus, personalDetails, contactDetails, addressDetails, travelDetails, paymentHistory, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    batchId=VALUES(batchId), status=VALUES(status), paymentStatus=VALUES(paymentStatus),
                    personalDetails=VALUES(personalDetails), contactDetails=VALUES(contactDetails),
                    addressDetails=VALUES(addressDetails), travelDetails=VALUES(travelDetails),
                    paymentHistory=VALUES(paymentHistory), updatedAt=VALUES(updatedAt)
                `;
                await pool.query(candQuery, [
                    c.id, c.batchId, c.executiveId, c.status, c.paymentStatus,
                    JSON.stringify(c.personalDetails), JSON.stringify(c.contactDetails),
                    JSON.stringify(c.addressDetails), JSON.stringify(c.travelDetails),
                    JSON.stringify(c.paymentHistory), c.createdAt || Date.now(), Date.now()
                ]);
                return res.json({ status: 'success' });

            case 'get_batches':
                const [batches] = await pool.query('SELECT * FROM batches');
                return res.json(batches);

            case 'save_batch':
                const b = req.body.batch;
                await pool.query('REPLACE INTO batches (id, name, maxSeats, createdAt) VALUES (?, ?, ?, ?)', [b.id, b.name, b.maxSeats, b.createdAt]);
                return res.json({ status: 'success' });

            case 'delete_batch':
                await pool.query('DELETE FROM batches WHERE id = ?', [req.body.id]);
                return res.json({ status: 'success' });

            case 'get_users':
                const [allUsers] = await pool.query('SELECT id, username, name, role, isActive FROM users');
                return res.json(allUsers);

            case 'save_user':
                const u = req.body.user;
                const pass = req.body.password;
                if (pass) {
                    await pool.query('REPLACE INTO users (id, username, name, role, isActive, password) VALUES (?, ?, ?, ?, ?, ?)', 
                        [u.id, u.username, u.name, u.role, u.isActive ? 1 : 0, pass]);
                } else {
                    await pool.query('UPDATE users SET name=?, role=?, isActive=? WHERE id=?', 
                        [u.name, u.role, u.isActive ? 1 : 0, u.id]);
                }
                return res.json({ status: 'success' });

            case 'delete_user':
                await pool.query('DELETE FROM users WHERE id = ?', [req.body.id]);
                return res.json({ status: 'success' });

            default:
                return res.status(400).json({ error: 'Unknown action: ' + action });
        }
    } catch (err) {
        console.error("API Error at " + action + ":", err);
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({ error: "Database tables missing. Please run schema.sql in phpMyAdmin." });
        }
        res.status(500).json({ error: err.message });
    }
});

// 3. STATIC FILES (React Build)
if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
}

// 4. SPA ROUTING
app.get('*', (req, res) => {
    const indexPath = path.join(buildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("Build not found. Please run 'npm run build' first.");
    }
});

app.listen(port, () => {
    console.log(`>> Server listening on port ${port}`);
});
