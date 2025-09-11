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
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
        <style>
            @font-face {
                font-family: 'Digital-7 Mono';
                src: url('https://raw.githubusercontent.com/Stefano-Sacchi/Digital-7/main/Digital-7%20Mono.ttf') format('truetype');
                font-weight: normal;
                font-style: normal;
            }

            :root {
                --matrix-green: #00ff41; /* Primary Matrix Green */
                --matrix-dark: #0a0a0a;
                --matrix-dark-alt: #1a1a1a;
                --matrix-red: #ff0000;
                --text-shadow-green: 0 0 8px var(--matrix-green);
                --box-shadow-green: 0 0 15px rgba(0, 255, 65, 0.4);
            }

            body {
                font-family: 'Share Tech Mono', monospace;
                background: linear-gradient(135deg, var(--matrix-dark), var(--matrix-dark-alt));
                color: var(--matrix-green);
                margin: 0;
                padding: 10px;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                overflow-x: hidden; /* Only prevent horizontal scroll */
                overflow-y: auto; /* Allow vertical scroll if needed */
                box-sizing: border-box;
            }
            .container {
                max-width: 800px;
                width: 95%;
                max-height: 95vh; /* Ensure it fits in viewport */
                padding: 20px;
                background: rgba(0,0,0,0.8);
                border-radius: 12px;
                box-shadow: var(--box-shadow-green);
                border: 1px solid var(--matrix-green);
                position: relative;
                z-index: 10;
                box-sizing: border-box;
                overflow-y: auto; /* Allow internal scrolling if needed */
            }
            .title {
                font-family: 'Orbitron', sans-serif;
                text-align: center;
                font-size: 2.2em;
                margin-bottom: 25px;
                text-shadow: var(--text-shadow-green);
                color: var(--matrix-green);
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 15px;
                margin-bottom: 25px;
            }
            .stat-box {
                background: rgba(0, 255, 65, 0.08);
                padding: 15px;
                border-radius: 8px;
                border: 1px solid rgba(0, 255, 65, 0.3);
                text-align: center;
                box-shadow: var(--box-shadow-green);
                transition: transform 0.2s ease-in-out;
            }
            .stat-box:hover {
                transform: translateY(-3px);
            }
            .stat-value {
                font-family: 'Digital-7 Mono', monospace;
                font-size: 1.8em;
                font-weight: bold;
                color: var(--matrix-green);
                display: block;
                text-shadow: var(--text-shadow-green);
            }
            .stat-label {
                font-size: 0.85em;
                opacity: 0.7;
                margin-top: 5px;
                color: var(--matrix-green);
            }
            .live-counter {
                font-family: 'Digital-7 Mono', monospace;
                font-size: 2.5em;
                text-align: center;
                margin: 25px 0;
                color: var(--matrix-green);
                text-shadow: 0 0 20px var(--matrix-green);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .failure-counter {
                background: rgba(255,0,0,0.15);
                border: 2px solid var(--matrix-red);
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                margin: 20px 0;
                box-shadow: 0 0 15px rgba(255, 0, 0, 0.4);
            }
            .failure-counter .count {
                font-family: 'Orbitron', sans-serif;
                font-size: 2.2em;
                color: var(--matrix-red);
                font-weight: bold;
                text-shadow: 0 0 15px var(--matrix-red);
            }
            .status-indicator {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: var(--matrix-green);
                display: inline-block;
                animation: pulse 2s infinite;
                margin-right: 10px;
                box-shadow: 0 0 10px var(--matrix-green);
            }
            @keyframes pulse {
                0% { opacity: 1; box-shadow: 0 0 10px var(--matrix-green); }
                50% { opacity: 0.6; box-shadow: 0 0 20px var(--matrix-green); }
                100% { opacity: 1; box-shadow: 0 0 10px var(--matrix-green); }
            }
            .warning {
                background: rgba(255, 255, 0, 0.1);
                border: 1px solid yellow;
                padding: 12px;
                border-radius: 6px;
                margin: 15px 0 0 0;
                text-align: center;
                color: yellow;
                text-shadow: 0 0 5px yellow;
                font-size: 0.9em;
            }
            /* Styling for terminal state */
            body.terminated {
                background: linear-gradient(135deg, #440000, #8B0000) !important;
                animation: none !important;
            }
            .container.terminated {
                border-color: #ff0000 !important;
                box-shadow: 0 0 50px rgba(255, 0, 0, 0.8) !important;
            }
            .title.terminated {
                color: #ff0000 !important;
                text-shadow: 0 0 20px #ff0000 !important;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="title">CHAOS DEMO INTERFACE</h1>
            
            <div class="stats-grid">
                <div class="stat-box">
                    <span class="stat-value" id="uptime-display">${uptime}s</span>
                    <div class="stat-label">SYSTEM UPTIME</div>
                </div>
                <div class="stat-box">
                    <span class="stat-value" id="requests">${appStats.requestCount}</span>
                    <div class="stat-label">TOTAL REQUESTS</div>
                </div>
                <div class="stat-box">
                    <span class="stat-value" id="latency-display">--</span>
                    <div class="stat-label">AVG LATENCY</div>
                </div>
            </div>

            <div class="live-counter">
                <span class="status-indicator"></span>LIVE: <span id="counter">0</span>
            </div>

            <div class="failure-counter">
                <div style="color: rgba(255,255,255,0.8); font-size: 0.9em;">CRITICAL FAILURES DETECTED</div>
                <div class="count" id="failures">${appStats.failureCount}</div>
                <div style="font-size: 0.8em; margin-top: 10px; color: rgba(255,255,255,0.8);" id="lastFailure">
                    ${appStats.lastFailureTime ? 'LAST FAILURE: ' + new Date(appStats.lastFailureTime).toLocaleString() : 'NO FAILURES YET'}
                </div>
            </div>

            <div class="warning">
                ⚠️ WARNING: This application will crash if its pod is terminated (either directly or due to high latency).
            </div>
        </div>

        <script>
            let counter = 0;
            let requestCounter = ${appStats.requestCount};
            let startTime = ${appStats.startTime};
            
            function updateDisplay() {
                counter++;
                document.getElementById('counter').textContent = counter;
                
                // Update uptime
                const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
                document.getElementById('uptime-display').textContent = uptimeSeconds + 's';

                // Random glitch effect on counter
                if (Math.random() < 0.03) { 
                    const counterEl = document.getElementById('counter');
                    counterEl.style.color = '#ff0080';
                    setTimeout(() => {
                        counterEl.style.color = 'var(--matrix-green)';
                    }, 100);
                }
            }
            
            const interval = setInterval(updateDisplay, 1000);
            
            // Add matrix rain effect with Korean sentences
            function createMatrixRain() {
                const koreanSentences = [
                    '저는 커피를 마시러 갈 겁니다',
                    '강아지가 제 숙제를 먹었어요',
                    '쓰레기 버리는 거 잊지 않았지?',
                    '아이고 허리야',
                    '치킨 시킬까?',
                    '내가 뭘 하고 있는 거지?',
                    '피곤해 죽겠어요',
                    '피할 수 없으면 즐겨라',
                    '인생은 원래 그런 거야',
                    '내가 지금 어디에 있는 거지?',
                    '나 오늘 야근해요',
                    '월요일 아침 8시',
                    '떡볶이 먹고 싶다',
                    '핵노잼',
                    '이것이 현실이다',
                    '몰라요? 몰라요? 모르면 맞아야죠!'
                ];
                
                const drops = [];
                const dropSentences = []; // Store which sentence each drop is using
                const dropProgress = []; // Track how far through the sentence each drop is
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.style.position = 'fixed';
                canvas.style.top = '0';
                canvas.style.left = '0';
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.zIndex = '1';
                canvas.style.pointerEvents = 'none';
                canvas.style.opacity = '0.3';
                
                document.body.appendChild(canvas);
                
                function resizeCanvas() {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                }
                
                function initDrops() {
                    const columns = Math.floor(canvas.width / 80); // Reasonable spacing for Korean text
                    drops.length = 0;
                    dropSentences.length = 0;
                    dropProgress.length = 0;
                    
                    for (let i = 0; i < columns; i++) {
                        drops[i] = -Math.random() * canvas.height; // Start above screen
                        dropSentences[i] = koreanSentences[Math.floor(Math.random() * koreanSentences.length)];
                        dropProgress[i] = 0;
                    }
                }
                
                function draw() {
                    ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    ctx.font = '12px "Share Tech Mono", monospace';
                    
                    for (let i = 0; i < drops.length; i++) {
                        const sentence = dropSentences[i];
                        const x = i * 80 + 10;
                        
                        // Draw each character of the sentence vertically
                        for (let j = 0; j < sentence.length; j++) {
                            const char = sentence[j];
                            const y = drops[i] + (j * 18); // 18px spacing between characters
                            
                            if (y > 0 && y < canvas.height + 50) {
                                // Create trailing effect - brighter at the head, dimmer at the tail
                                let alpha = 1;
                                if (j > 0) {
                                    alpha = Math.max(0.1, 1 - (j * 0.08));
                                }
                                
                                // Make the first few characters brighter (the "head" of the stream)
                                if (j < 3) {
                                    alpha = Math.min(1, alpha + 0.3);
                                }
                                
                                ctx.fillStyle = \`rgba(0, 255, 65, \${alpha})\`;
                                ctx.fillText(char, x, y);
                            }
                        }
                        
                        // Move the drop down
                        drops[i] += 2;
                        
                        // Reset drop when the entire sentence has passed off screen
                        const sentenceHeight = sentence.length * 18;
                        if (drops[i] - sentenceHeight > canvas.height) {
                            drops[i] = -sentenceHeight - Math.random() * 200; // Random delay before reappearing
                            dropSentences[i] = koreanSentences[Math.floor(Math.random() * koreanSentences.length)]; // Pick new sentence
                        }
                    }
                }
                
                resizeCanvas();
                initDrops();
                
                setInterval(draw, 80); // Good balance between smooth animation and readability
                window.addEventListener('resize', () => {
                    resizeCanvas();
                    initDrops();
                });
            }
            
            createMatrixRain();
            
            // Simulate some activity by making periodic requests to track failures
            let heartbeatInterval = setInterval(() => {
                fetch('/heartbeat')
                    .then(response => {
                        if (!response.ok) throw new Error('Network response was not ok');
                        return response.json();
                    })
                    .then(data => {
                        // Update request count and failures from actual stats
                        fetch('/stats').then(res => res.json()).then(stats => {
                            document.getElementById('requests').textContent = stats.requestCount;
                            document.getElementById('failures').textContent = stats.failureCount;
                            if (stats.lastFailureTime) {
                                document.getElementById('lastFailure').textContent = 'LAST FAILURE: ' + new Date(stats.lastFailureTime).toLocaleString();
                            }
                        });
                    })
                    .catch(() => {
                        // If this fails, the pod is probably down
                        clearInterval(interval);
                        clearInterval(heartbeatInterval);
                        clearInterval(latencyMeasureInterval);

                        document.body.classList.add('terminated');
                        document.querySelector('.container').classList.add('terminated');
                        document.querySelector('.title').classList.add('terminated');
                        document.querySelector('.title').textContent = '💀 SYSTEM FAILURE - POD TERMINATED';
                        
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
            
            // Add scan line effect - moved to z-index 100 to be above matrix but below content
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
                        rgba(0, 255, 65, 0.015) 2px,
                        rgba(0, 255, 65, 0.015) 4px
                    );
                    pointer-events: none;
                    z-index: 100;
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
            let latencyMeasureInterval;

            function measureLatency() {
                const start = Date.now();
                fetch('/heartbeat')
                    .then(response => {
                        if (!response.ok) throw new Error('Network response was not ok');
                        return response.json();
                    })
                    .then(() => {
                        const latency = Date.now() - start;
                        latencyHistory.push(latency);
                        if (latencyHistory.length > 10) latencyHistory.shift();
                        
                        const avgLatency = latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length;
                        document.getElementById('latency-display').textContent = avgLatency.toFixed(0) + 'ms';
                        
                        // Change color based on latency
                        const latencyEl = document.getElementById('latency-display');
                        if (avgLatency > 1000) {
                            latencyEl.style.color = 'var(--matrix-red)';
                            latencyEl.style.textShadow = '0 0 20px var(--matrix-red)';
                        } else if (avgLatency > 500) {
                            latencyEl.style.color = '#ffaa00'; 
                            latencyEl.style.textShadow = '0 0 10px #ffaa00';
                        } else {
                            latencyEl.style.color = 'var(--matrix-green)';
                            latencyEl.style.textShadow = 'var(--text-shadow-green)';
                        }
                    })
                    .catch(() => {
                        document.getElementById('latency-display').textContent = 'OFFLINE';
                        document.getElementById('latency-display').style.color = 'var(--matrix-red)';
                        document.getElementById('latency-display').style.textShadow = '0 0 20px var(--matrix-red)';
                        updateState('terminated');
                    });
            }

        latencyMeasureInterval = setInterval(measureLatency, 2000);
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