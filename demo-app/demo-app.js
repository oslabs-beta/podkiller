// demo-app.js - A live demo app for chaos engineering demonstrations
const express = require('express');
const app = express();
const port = 8080;

// In-memory storage for demonstration
let appStats = {
    startTime: Date.now(),
    requestCount: 0,
    failureCount: 0,
    lastFailureTime: null
};

// Middleware to track requests
app.use((req, res, next) => {
    appStats.requestCount++;
    next();
});

// Main demo page
app.get('/', (req, res) => {
    const uptime = Math.floor((Date.now() - appStats.startTime) / 1000);
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Chaos Demo App</title>
        <style>
            body {
                font-family: 'Courier New', monospace;
                background: linear-gradient(135deg, #1e3c72, #2a5298);
                color: white;
                margin: 0;
                padding: 20px;
                min-height: 100vh;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: rgba(0,0,0,0.3);
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,255,255,0.3);
            }
            .title {
                text-align: center;
                font-size: 2.5em;
                margin-bottom: 30px;
                text-shadow: 0 0 10px cyan;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            .stat-box {
                background: rgba(0,255,255,0.1);
                padding: 20px;
                border-radius: 8px;
                border: 1px solid cyan;
                text-align: center;
            }
            .stat-value {
                font-size: 2em;
                font-weight: bold;
                color: #00ffff;
                display: block;
            }
            .stat-label {
                font-size: 0.9em;
                opacity: 0.8;
                margin-top: 5px;
            }
            .live-counter {
                font-size: 3em;
                text-align: center;
                margin: 30px 0;
                color: #00ff00;
                text-shadow: 0 0 15px #00ff00;
            }
            .failure-counter {
                background: rgba(255,0,0,0.2);
                border: 2px solid #ff0000;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                margin: 20px 0;
            }
            .failure-counter .count {
                font-size: 2.5em;
                color: #ff4444;
                font-weight: bold;
            }
            .status-indicator {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #00ff00;
                display: inline-block;
                animation: pulse 2s infinite;
                margin-right: 10px;
            }
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
            .warning {
                background: rgba(255,255,0,0.1);
                border: 1px solid yellow;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="title">🎯 Chaos Demo Target</h1>
            
            <div class="stats-grid">
                <div class="stat-box">
                    <span class="stat-value" id="uptime">${uptime}</span>
                    <div class="stat-label">Seconds Online</div>
                </div>
                <div class="stat-box">
                    <span class="stat-value" id="requests">${appStats.requestCount}</span>
                    <div class="stat-label">Total Requests</div>
                </div>
                <div class="stat-box">
                    <span class="stat-value" id="timestamp"></span>
                    <div class="stat-label">Current Time</div>
                </div>
                <div class="stat-box">
                    <span class="stat-value" id="latency-display">--</span>
                    <div class="stat-label">Network Latency</div>
                </div>
            </div>

            <div class="live-counter">
                <div><span class="status-indicator"></span>Live Counter: <span id="counter">0</span></div>
            </div>

            <div class="failure-counter">
                <div>Pod Failures Detected</div>
                <div class="count" id="failures">${appStats.failureCount}</div>
                <div style="font-size: 0.8em; margin-top: 10px;" id="lastFailure">
                    ${appStats.lastFailureTime ? 'Last failure: ' + new Date(appStats.lastFailureTime).toLocaleString() : 'No failures yet'}
                </div>
            </div>

            <div class="warning">
                ⚠️ This app will become unresponsive when its pod is killed
            </div>
        </div>

        <script>
            let counter = 0;
            let requestCounter = ${appStats.requestCount};
            let startTime = ${appStats.startTime};
            let cpuUsage = 42;
            
            function updateDisplay() {
                // Update live counter with glitch effect occasionally
                counter++;
                document.getElementById('counter').textContent = counter;
                
                // Update timestamp
                document.getElementById('timestamp').textContent = new Date().toLocaleTimeString();
                
                // Update uptime
                const uptime = Math.floor((Date.now() - startTime) / 1000);
                document.getElementById('uptime').textContent = uptime;
                
                // Update request count
                document.getElementById('requests').textContent = ++requestCounter;
                
                // Simulate fluctuating CPU usage
                cpuUsage += (Math.random() - 0.5) * 10;
                cpuUsage = Math.max(10, Math.min(95, cpuUsage));
                document.getElementById('cpu-usage').textContent = Math.round(cpuUsage) + '%';
                
                // Random glitch effect on counter
                if (Math.random() < 0.05) {
                    const counterEl = document.getElementById('counter');
                    counterEl.style.color = '#ff0080';
                    setTimeout(() => {
                        counterEl.style.color = '#00ffff';
                    }, 100);
                }
            }
            
            // Update every second
            const interval = setInterval(updateDisplay, 1000);
            
            // Add matrix rain effect
            function createMatrixRain() {
                const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
                const drops = [];
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.style.position = 'fixed';
                canvas.style.top = '0';
                canvas.style.left = '0';
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.zIndex = '-1';
                canvas.style.pointerEvents = 'none';
                canvas.style.opacity = '0.1';
                
                document.body.appendChild(canvas);
                
                function resizeCanvas() {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                }
                
                function initDrops() {
                    const columns = Math.floor(canvas.width / 20);
                    for (let i = 0; i < columns; i++) {
                        drops[i] = Math.random() * canvas.height;
                    }
                }
                
                function draw() {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    ctx.fillStyle = '#00ff41';
                    ctx.font = '15px monospace';
                    
                    for (let i = 0; i < drops.length; i++) {
                        const text = chars[Math.floor(Math.random() * chars.length)];
                        ctx.fillText(text, i * 20, drops[i]);
                        
                        if (drops[i] > canvas.height && Math.random() > 0.975) {
                            drops[i] = 0;
                        }
                        drops[i] += 20;
                    }
                }
                
                resizeCanvas();
                initDrops();
                
                setInterval(draw, 50);
                window.addEventListener('resize', () => {
                    resizeCanvas();
                    initDrops();
                });
            }
            
            // Initialize matrix effect
            createMatrixRain();
            
            // Simulate some activity by making periodic requests to track failures
            setInterval(() => {
                fetch('/heartbeat')
                    .catch(() => {
                        // If this fails, the pod is probably down
                        clearInterval(interval);
                        document.body.style.background = 'linear-gradient(135deg, #8B0000, #DC143C)';
                        document.body.style.animation = 'none';
                        document.querySelector('.title').textContent = '💀 SYSTEM FAILURE - POD TERMINATED';
                        document.querySelector('.title').style.color = '#ff0000';
                        document.querySelector('.title').style.animation = 'none';
                        
                        // Add critical error styling
                        document.querySelector('.container').style.borderColor = '#ff0000';
                        document.querySelector('.container').style.boxShadow = '0 0 50px rgba(255, 0, 0, 0.5)';
                        
                        // Flash warning effect
                        let flashCount = 0;
                        const flashInterval = setInterval(() => {
                            document.body.style.background = flashCount % 2 === 0 ? 
                                'linear-gradient(135deg, #8B0000, #DC143C)' : 
                                'linear-gradient(135deg, #000000, #440000)';
                            flashCount++;
                            if (flashCount > 10) clearInterval(flashInterval);
                        }, 200);
                    });
            }, 2000);
            
            // Add scan line effect
            function addScanLines() {
                const scanline = document.createElement('div');
                scanline.style.cssText = \`
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: repeating-linear-gradient(
                        0deg,
                        transparent,
                        transparent 2px,
                        rgba(0, 255, 65, 0.03) 2px,
                        rgba(0, 255, 65, 0.03) 4px
                    );
                    pointer-events: none;
                    z-index: 1000;
                    animation: scanlines 0.1s linear infinite;
                \`;
                
                const style = document.createElement('style');
                style.textContent = \`
                    @keyframes scanlines {
                        0% { transform: translateY(0); }
                        100% { transform: translateY(4px); }
                    }
                \`;
                document.head.appendChild(style);
                document.body.appendChild(scanline);
            }
            
            addScanLines();

            let latencyHistory = [];

            function measureLatency() {
                const start = Date.now();
                fetch('/heartbeat')
                    .then(() => {
                        const latency = Date.now() - start;
                        latencyHistory.push(latency);
                        if (latencyHistory.length > 10) latencyHistory.shift();
                        
                        const avgLatency = latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length;
                        document.getElementById('latency-display').textContent = avgLatency.toFixed(0) + 'ms';
                        
                        // Change color based on latency
                        const latencyEl = document.getElementById('latency-display');
                        if (avgLatency > 1000) {
                            latencyEl.style.color = '#ff0000';
                            latencyEl.style.textShadow = '0 0 20px #ff0000';
                        } else if (avgLatency > 500) {
                            latencyEl.style.color = '#ffaa00';
                        } else {
                            latencyEl.style.color = '#00ffff';
                        }
                    })
                    .catch(() => {
                        document.getElementById('latency-display').textContent = 'OFFLINE';
                    });
            }

        // Check latency every 2 seconds
        setInterval(measureLatency, 2000);
        </script>
    </body>
    </html>
    `);
});

// Heartbeat endpoint to detect when the app goes down
app.get('/heartbeat', (req, res) => {
    res.json({ 
        status: 'alive', 
        timestamp: Date.now(),
        uptime: Date.now() - appStats.startTime
    });
});

// Endpoint to manually increment failure counter (for testing)
app.post('/failure', (req, res) => {
    appStats.failureCount++;
    appStats.lastFailureTime = Date.now();
    res.json({ 
        message: 'Failure recorded', 
        totalFailures: appStats.failureCount 
    });
});

// Endpoint to get current stats
app.get('/stats', (req, res) => {
    res.json({
        ...appStats,
        uptime: Date.now() - appStats.startTime,
        currentTime: Date.now()
    });
});

// Health check endpoint for Kubernetes
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Chaos Demo App running on http://0.0.0.0:${port}`);
    console.log(`Started at: ${new Date().toISOString()}`);
});