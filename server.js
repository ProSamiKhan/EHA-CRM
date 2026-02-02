const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
// Vercel uses 'dist' by default for Vite projects
const buildPath = path.resolve(__dirname, 'dist');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASS || process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Diagnostic Route
app.get('/api-status', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ 
            status: 'active', 
            database: 'connected',
            buildFound: fs.existsSync(buildPath),
            directory: buildPath
        });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
});

// API Endpoint
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
                return res.json(candidates.map(c => ({
                    ...c,
                    personalDetails: typeof c.personalDetails === 'string' ? JSON.parse(c.personalDetails) : c.personalDetails,
                    contactDetails: typeof c.contactDetails === 'string' ? JSON.parse(c.contactDetails) : c.contactDetails,
                    addressDetails: typeof c.addressDetails === 'string' ? JSON.parse(c.addressDetails) : c.addressDetails,
                    travelDetails: typeof c.travelDetails === 'string' ? JSON.parse(c.travelDetails) : c.travelDetails,
                    paymentHistory: typeof c.paymentHistory === 'string' ? JSON.parse(c.paymentHistory) : c.paymentHistory
                })));

            case 'get_batches':
                const [batches] = await pool.query('SELECT * FROM batches');
                return res.json(batches);

            case 'get_users':
                const [allUsers] = await pool.query('SELECT id, username, name, role, isActive FROM users');
                return res.json(allUsers);

            case 'save_candidate':
                const { candidate } = req.body;
                await pool.query(
                    `INSERT INTO candidates (id, batchId, executiveId, status, paymentStatus, personalDetails, contactDetails, addressDetails, travelDetails, paymentHistory, createdAt, updatedAt) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE 
                     batchId=VALUES(batchId), status=VALUES(status), paymentStatus=VALUES(paymentStatus), 
                     personalDetails=VALUES(personalDetails), contactDetails=VALUES(contactDetails), 
                     addressDetails=VALUES(addressDetails), travelDetails=VALUES(travelDetails), 
                     paymentHistory=VALUES(paymentHistory), updatedAt=VALUES(updatedAt)`,
                    [
                        candidate.id, candidate.batchId, candidate.executiveId, candidate.status, candidate.paymentStatus,
                        JSON.stringify(candidate.personalDetails), JSON.stringify(candidate.contactDetails),
                        JSON.stringify(candidate.addressDetails), JSON.stringify(candidate.travelDetails),
                        JSON.stringify(candidate.paymentHistory), candidate.createdAt || Date.now(), Date.now()
                    ]
                );
                return res.json({ status: 'success' });

            case 'save_batch':
                const { batch } = req.body;
                await pool.query(
                    `REPLACE INTO batches (id, name, maxSeats, createdAt) VALUES (?, ?, ?, ?)`,
                    [batch.id, batch.name, batch.maxSeats, batch.createdAt]
                );
                return res.json({ status: 'success' });

            case 'delete_batch':
                await pool.query(`DELETE FROM batches WHERE id = ?`, [req.body.id]);
                return res.json({ status: 'success' });

            case 'save_user':
                const { user: userData, password: userPass } = req.body;
                if (userPass) {
                    await pool.query(
                        `REPLACE INTO users (id, username, name, role, isActive, password) VALUES (?, ?, ?, ?, ?, ?)`,
                        [userData.id, userData.username, userData.name, userData.role, userData.isActive ? 1 : 0, userPass]
                    );
                } else {
                    await pool.query(
                        `UPDATE users SET name=?, role=?, isActive=? WHERE id=?`,
                        [userData.name, userData.role, userData.isActive ? 1 : 0, userData.id]
                    );
                }
                return res.json({ status: 'success' });

            case 'delete_user':
                await pool.query(`DELETE FROM users WHERE id = ?`, [req.body.id]);
                return res.json({ status: 'success' });

            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Production Static Serving
if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
        res.sendFile(path.join(buildPath, 'index.html'));
    });
} else {
    // If running on Vercel, the static files are handled by the 'rewrites' in vercel.json
    // but for local testing or traditional servers, this fallback is useful.
    app.get('/api-check', (req, res) => {
        res.json({ message: "API is online, but static build directory was not found in this environment." });
    });
}

// Export for Vercel Serverless Functions
module.exports = app;

if (require.main === module) {
    app.listen(port, () => {
        console.log(`>> Server listening on port ${port}`);
    });
}
