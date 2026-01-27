
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

// 1. API STATUS & BUILD TRIGGER
app.get('/api-status', (req, res) => {
    res.json({ 
        status: 'active', 
        build_folder_exists: fs.existsSync(buildPath),
        time: new Date().toISOString()
    });
});

app.get('/trigger-build', (req, res) => {
    console.log("Starting build process...");
    // Increased buffer for large Vite builds
    exec("npx vite build", { maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Build Error: ${error.message}`);
            return res.status(500).json({ status: 'error', error: error.message });
        }
        res.json({ status: 'success', message: 'Build completed successfully' });
    });
});

// 2. MOCK API (To keep frontend working without DB config initially)
app.post('/api-v1', (req, res) => {
    const { action } = req.body;
    res.json({ status: 'mock_active', action_received: action });
});

// 3. STATIC FILES
if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
}

// 4. SPA ROUTING
app.get('*', (req, res) => {
    const indexPath = path.join(buildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // Render a setup page if build is missing
        res.status(200).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8"><title>CRM Initializing</title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-slate-50 min-h-screen flex items-center justify-center p-6 text-center">
                <div class="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
                    <div class="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-indigo-100">
                        <i class="fa-solid fa-rocket text-3xl"></i>
                    </div>
                    <h1 class="text-2xl font-black text-slate-900 mb-2">Welcome to EHA CRM</h1>
                    <p class="text-slate-500 text-sm mb-8 leading-relaxed">The system needs a one-time compilation to optimize performance for your server.</p>
                    <button id="buildBtn" onclick="runBuild()" class="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all">Compile System Now</button>
                    <p id="log" class="mt-4 text-[10px] font-mono text-slate-400"></p>
                </div>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>
                <script>
                    function runBuild() {
                        const btn = document.getElementById('buildBtn');
                        const log = document.getElementById('log');
                        btn.disabled = true;
                        btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin mr-2"></i> Compiling...';
                        log.innerText = 'Initializing Vite...';
                        
                        fetch('/trigger-build')
                            .then(r => r.json())
                            .then(data => {
                                if(data.status === 'success') {
                                    log.innerText = 'Success! Reloading...';
                                    setTimeout(() => window.location.reload(), 1500);
                                } else {
                                    log.innerText = 'Error: ' + data.error;
                                    btn.disabled = false;
                                    btn.innerText = 'Retry Compilation';
                                }
                            })
                            .catch(err => {
                                log.innerText = 'Network Error. Check console.';
                                btn.disabled = false;
                                btn.innerText = 'Retry';
                            });
                    }
                </script>
            </body>
            </html>
        `);
    }
});

app.listen(port, () => {
    console.log(`>> Server listening on port ${port}`);
});
