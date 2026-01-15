
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Enable JSON body parsing first
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Request logger for debugging 404s
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Database Configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    }
};

async function getConn() {
    try {
        return await mysql.createConnection(dbConfig);
    } catch (err) {
        console.error('DATABASE CONNECTION FAILED:', err.message);
        throw err;
    }
}

// API Route - defined BEFORE static files to prevent 404s/interceptions
app.post('/api', async (req, res) => {
    const { action } = req.body;
    let conn;
    
    if (!action) {
        return res.status(400).json({ error: 'Missing action in request body' });
    }

    try {
        conn = await getConn();
        
        switch (action) {
            case 'login':
                console.log('Attempting login for:', req.body.username);
                const [users] = await conn.execute('SELECT * FROM users WHERE username = ? AND isActive = 1', [req.body.username]);
                const user = users[0];
                if (user && user.password === req.body.password) {
                    delete user.password;
                    res.json({ status: 'success', user });
                } else {
                    res.status(401).json({ error: 'Invalid credentials' });
                }
                break;

            case 'get_candidates':
                const [candidates] = await conn.execute('SELECT * FROM candidates ORDER BY createdAt DESC');
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
                await conn.execute(
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
                const [batches] = await conn.execute('SELECT * FROM batches');
                res.json(batches);
                break;

            case 'save_batch':
                const b = req.body.batch;
                await conn.execute('REPLACE INTO batches (id, name, maxSeats, createdAt) VALUES (?, ?, ?, ?)', 
                    [b.id, b.name, b.maxSeats, b.createdAt]);
                res.json({ status: 'success' });
                break;

            case 'get_users':
                const [userList] = await conn.execute('SELECT id, username, name, role, isActive FROM users');
                res.json(userList);
                break;

            case 'save_user':
                const u = req.body.user;
                if (req.body.password) {
                    await conn.execute('REPLACE INTO users (id, username, name, role, isActive, password) VALUES (?, ?, ?, ?, ?, ?)',
                        [u.id, u.username, u.name, u.role, u.isActive ? 1 : 0, req.body.password]);
                } else {
                    await conn.execute('UPDATE users SET name=?, role=?, isActive=? WHERE id=?',
                        [u.name, u.role, u.isActive ? 1 : 0, u.id]);
                }
                res.json({ status: 'success' });
                break;

            case 'delete_user':
                await conn.execute('DELETE FROM users WHERE id = ?', [req.body.id]);
                res.json({ status: 'success' });
                break;

            case 'delete_batch':
                await conn.execute('DELETE FROM batches WHERE id = ?', [req.body.id]);
                res.json({ status: 'success' });
                break;

            default:
                res.status(400).json({ error: 'Invalid action provided' });
        }
    } catch (err) {
        console.error('API Error Processing Request:', err);
        res.status(500).json({ error: 'Server Internal Error', message: err.message });
    } finally {
        if (conn) await conn.end();
    }
});

// Serve static files from the 'dist' directory
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Catch-all route to serve the SPA frontend
app.get('*', (req, res) => {
    // If it's a request for an API, but using GET, explicitly 404
    if (req.url.startsWith('/api')) {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running and listening on port ${port}`);
});
