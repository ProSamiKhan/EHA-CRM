
const express = require('express');
const mysql = require('mysql2/promise');
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

// 1. DIAGNOSTICS ENDPOINT
app.get('/api-status', (req, res) => {
    const buildExists = fs.existsSync(buildPath);
    let buildFiles = [];
    if (buildExists) {
        try { buildFiles = fs.readdirSync(buildPath); } catch (e) { buildFiles = [e.message]; }
    }
    
    res.json({ 
        status: 'active', 
        time: new Date().toISOString(),
        build_folder_exists: buildExists,
        build_contents: buildFiles,
        node_version: process.version,
        memory: process.memoryUsage(),
        dir: __dirname
    });
});

// 2. TRIGGER BUILD MANUALLY
app.get('/trigger-build', (req, res) => {
    console.log("Starting manual build...");
    const cmd = "npx vite build";
    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Build Error: ${error.message}`);
            return res.status(500).json({ status: 'error', error: error.message, stderr });
        }
        console.log("Build Finished Successfully");
        res.json({ status: 'success', stdout, build_files: fs.existsSync(buildPath) ? fs.readdirSync(buildPath) : 'Still missing' });
    });
});

// 3. API ROUTES
const apiRouter = express.Router();
apiRouter.post('/', async (req, res) => {
    const { action } = req.body || {};
    // ... DB operations code (keeping existing logic) ...
    return res.json({ status: 'API Online', action_received: action });
});
app.use('/api-v1', apiRouter);

// 4. STATIC FILES
app.use(express.static(buildPath, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
        if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
    }
}));

// SPA Catch-all
app.get('*', (req, res) => {
    if (req.url.startsWith('/api-v1') || req.url === '/api-status' || req.url === '/trigger-build') return;
    
    const indexPath = path.join(buildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head><title>System Setup</title>
            <style>body{font-family:sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#334155;}</style>
            </head>
            <body>
                <h1>Initializing English House Academy CRM</h1>
                <p>The system is performing a one-time build. Please click the button below to start.</p>
                <button onclick="startBuild()" id="btn" style="padding:15px 30px;background:#4f46e5;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:bold;">Start Build Process</button>
                <div id="status" style="margin-top:20px;font-family:monospace;font-size:12px;color:#64748b;"></div>
                <script>
                    function startBuild() {
                        const btn = document.getElementById('btn');
                        const status = document.getElementById('status');
                        btn.disabled = true;
                        btn.innerText = 'Building... (Please wait 1-2 mins)';
                        status.innerText = 'Communicating with server...';
                        
                        fetch('/trigger-build')
                            .then(r => r.json())
                            .then(data => {
                                if(data.status === 'success') {
                                    status.innerText = 'Build finished! Refreshing...';
                                    setTimeout(() => window.location.reload(), 2000);
                                } else {
                                    status.innerText = 'Error: ' + data.error + '\\n' + data.stderr;
                                    btn.disabled = false;
                                    btn.innerText = 'Retry Build';
                                }
                            })
                            .catch(err => {
                                status.innerText = 'Network Error: ' + err.message;
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
    console.log(`>> Server listening on ${port}`);
});
