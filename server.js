const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 1. Basic Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging for Hostinger console
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// 2. Database Connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    multipleStatements: true
};

const pool = mysql.createPool(dbConfig);

// 3. API Router
const apiRouter = express.Router();

// Health check / Status
// Matches /admission-api or /admission-api/
apiRouter.get('/', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [users] = await conn.execute('SELECT COUNT(*) as count FROM users');
        conn.release();
        return res.json({ 
            status: 'online', 
            database: 'connected', 
            userCount: users[0].count,
            timestamp: new Date().toISOString(),
            message: "EHA CRM API is functional"
        });
    } catch (err) {
        return res.status(500).json({ 
            status: 'online', 
            database: 'error', 
            message: err.message,
            hint: "Check if database credentials in Hostinger Environment Variables are correct."
        });
    }
});

// Main POST handler for actions
apiRouter.post('/', async (req, res) => {
    const { action } = req.body;
    if (!action) return res.status(400).json({ error: 'Missing action' });

    try {
        switch (action) {
            case 'login':
                const [users] = await pool.execute('SELECT * FROM users WHERE username = ? AND isActive = 1', [req.body.username]);
                const user = users[0];
                if (user && user.password === req.body.password) {
                    const responseUser = { ...user };
                    delete responseUser.password;
                    res.json({ status: 'success', user: responseUser });
                } else {
                    res.status(401).json({ error: 'Invalid credentials' });
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
        console.error('API Error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

// Mount the API Router explicitly
app.use('/admission-api', apiRouter);

// 4. Static File Serving (Vite Build Output)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    // SPA Fallback: Send all other requests to index.html
    app.get('*', (req, res) => {
        // Only fallback if it's not trying to hit the API
        if (req.originalUrl.startsWith('/admission-api')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    // Basic root handler if dist is missing (useful during initial deployment)
    app.get('/', (req, res) => {
        res.status(200).send(`
            <h1>EHA CRM Backend</h1>
            <p>Status: Running</p>
            <p>API Endpoint: <a href="/admission-api">/admission-api</a></p>
            <hr>
            <p style="color:red">Warning: 'dist' folder not found. Please run 'npm run build' locally and upload the folder.</p>
        `);
    });
}

// 5. Database Initialization (Seeder)
async function dbInit() {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (!fs.existsSync(schemaPath)) return;
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        const statements = schemaSql.split(/;\s*$/m).map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
        const conn = await pool.getConnection();
        for (let statement of statements) {
            try { 
                await conn.query(statement); 
            } catch (e) {
                if (!e.message.includes('already exists') && !e.message.includes('Duplicate entry')) {
                    console.error('DB Init Warning:', e.message);
                }
            }
        }
        conn.release();
        console.log('Database schema verified/initialized.');
    } catch (err) {
        console.error('Database initialization failed:', err.message);
    }
}

// 6. Start Server
app.listen(port, () => {
    console.log(`Server process started on port ${port}`);
    dbInit();
});