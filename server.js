
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const buildPath = path.resolve(__dirname, 'build');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Diagnostic endpoint to check if build exists
app.get('/api-status', (req, res) => {
    const buildExists = fs.existsSync(buildPath);
    res.json({ 
        status: 'active', 
        build_folder_exists: buildExists,
        node_version: process.version,
        dir: __dirname
    });
});

// Manual build trigger via browser
app.get('/trigger-build', (req, res) => {
    console.log("Starting build process...");
    exec("npx vite build", { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Build Error: ${error.message}`);
            return res.status(500).json({ status: 'error', error: error.message, stderr });
        }
        res.json({ status: 'success', stdout });
    });
});

// Mock API Route (until DB is connected)
app.post('/api-v1', (req, res) => {
    const { action } = req.body;
    console.log(`API Action: ${action}`);
    // In a real scenario, this would interact with MySQL
    res.json({ status: 'API Online', message: 'Database connection pending configuration' });
});

// Serve Static Files from Build
app.use(express.static(buildPath));

// SPA Catch-all
app.get('*', (req, res) => {
    const indexPath = path.join(buildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head><title>System Setup</title>
            <style>body{font-family:sans-serif;text-align:center;padding:50px;background:#f8fafc;}</style>
            </head>
            <body>
                <h1>English House Academy CRM</h1>
                <p>The system needs to be compiled. Please click the button below.</p>
                <button onclick="startBuild()" id="btn" style="padding:15px 30px;background:#4f46e5;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:bold;">Start System Build</button>
                <div id="status" style="margin-top:20px;font-family:monospace;font-size:12px;color:#64748b;"></div>
                <script>
                    function startBuild() {
                        const btn = document.getElementById('btn');
                        btn.disabled = true;
                        btn.innerText = 'Building... (Please wait)';
                        fetch('/trigger-build')
                            .then(r => r.json())
                            .then(data => {
                                if(data.status === 'success') window.location.reload();
                                else document.getElementById('status').innerText = data.error;
                            })
                            .catch(err => {
                                document.getElementById('status').innerText = 'Error: ' + err.message;
                                btn.disabled = false;
                            });
                    }
                </script>
            </body>
            </html>
        `);
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`>> CRM Server listening on port ${port}`);
});
