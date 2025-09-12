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
                --matrix-green: #00ff41;
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
                overflow-x: hidden;
                overflow-y: auto;
                box-sizing: border-box;
            }
            .container {
                max-width: 800px;
                width: 95%;
                max-height: 95vh;
                padding: 20px;
                background: rgba(0,0,0,0.8);
                border-radius: 12px;
                box-shadow: var(--box-shadow-green);
                border: 1px solid var(--matrix-green);
                position: relative;
                z-index: 10;
                box-sizing: border-box;
                overflow-y: auto;
            }
            #title-h1 {
                font-family: 'Orbitron', sans-serif;
                text-align: center;
                font-size: 2.2em;
                margin-bottom: 10px;
                text-shadow: var(--text-shadow-green);
                color: var(--matrix-green);
            }
            #title-h2 {
                font-family: 'Orbitron', sans-serif;
                text-align: center;
                font-size: 1.8em;
                margin-bottom: 15px;
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
            body.terminated {
                background: linear-gradient(135deg, #440000, #8B0000) !important;
                animation: none !important;
            }
            .container.terminated {
                border-color: #ff0000 !important;
                box-shadow: 0 0 50px rgba(255, 0, 0, 0.8) !important;
            }
            #title-h1.terminated, #title-h2.terminated {
                color: #ff0000 !important;
                text-shadow: 0 0 20px #ff0000 !important;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 id="title-h1">CHAOS DEMO INTERFACE</h1>
            <h2 id="title-h2">POD RUNNING</h2>
            
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

            <div class="warning">
                ⚠️ Website will crash if its pod is terminated, either directly or due to high latency.
            </div>
        </div>

        <script>
            let counter = 0;
            let requestCounter = ${appStats.requestCount};
            let startTime = ${appStats.startTime};
            let interval;
            let heartbeatInterval;
            let latencyHistory = [];
            
            function updateDisplay() {
                counter++;
                document.getElementById('counter').textContent = counter;
                
                const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
                document.getElementById('uptime-display').textContent = uptimeSeconds + 's';

                if (Math.random() < 0.03) { 
                    const counterEl = document.getElementById('counter');
                    counterEl.style.color = '#ff0080';
                    setTimeout(() => {
                        counterEl.style.color = 'var(--matrix-green)';
                    }, 100);
                }
            }
            
            interval = setInterval(updateDisplay, 1000);
            
            function createMatrixRain() {
                const koreanSentences = [
                    '저는 커피를 마시러 갈 겁니다',
                    '강아지가 제 숙제를 먹었어요',
                    '분리수거 잊지 않았지?',
                    '아이고 허리야',
                    '치킨 시킬까?',
                    '내가 뭘 하고 있는 거지?',
                    '피곤해 죽겠어요',
                    '피할 수 없으면 즐겨라',
                    '인생은 원래 그런 거야',
                    '나는 지금 어디에 있는가',
                    '나 오늘 야근해요',
                    '월요일 아침 8시',
                    '떡볶이 먹고 싶다',
                    '헬노잼',
                    '이것이 현실이다',
                    '모르나요? 모르나요? 모르면 맞아야죠!',
                    '참을수 없는 존재의 가벼움',
                    'BTS',
                    'BLACKPINK',
                    'yolo',
                    '지금 바로 시작해',
                    '죽음의 이지선다',
                    '탈명권',
                    '베르세르크',
                    'Power',
                    'EWGF',
                    '고양이 똥 커피',
                    'Unagi',
                    'Hamachi-Toro',
                    'コンピュータ',
                    'プログラム', 
                    'システム',
                    'データベース',
                    'ネットワーク',
                    'インターネット',
                    'ウイルス',
                    'ハッカー',
                    'セキュリティ',
                    'アクセス',
                    'パスワード',
                    'ログイン',
                    'ダウンロード',
                    'アップロード',
                    'バックアップ',
                    'クラウド',
                    'サーバー',
                    'クライアント',
                    'ブラウザ',
                    'メモリ',
                    'プロセッサ',
                    'キーボード',
                    'マウス',
                    'モニター',
                    'スピーカー',
                    'こんにちは',
                    'おはよう',
                    'こんばんは',
                    'ありがとう',
                    'すみません',
                    'はじめまして',
                    'よろしく',
                    'さようなら',
                    'いただきます',
                    'ごちそうさま',
                    'おつかれさま',
                    'がんばって',
                    'だいじょうぶ',
                    'わかりません',
                    'すばらしい',
                    '人工知能',
                    '仮想現実',
                    '未来技術',
                    '電子回路',
                    '情報処理',
                    '暗号化',
                    '復号化',
                    '認証システム',
                    'データ転送',
                    '通信プロトコル',
                    '機械学習',
                    '深層学習',
                    '量子計算',
                    '生体認証',
                    '画像認識'
                ];
    
                const drops = [];
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; opacity: 0.3;';
                document.body.appendChild(canvas);
                
                function resizeCanvas() {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                }
                
                const dropSentenceQueues = [];

                function initDrops() {
                    const columns = Math.floor(canvas.width / 20);
                    drops.length = 0;
                    dropSentenceQueues.length = 0;
                    
                    for (let i = 0; i < columns; i++) {
                        drops[i] = -Math.random() * canvas.height;
                        dropSentenceQueues[i] = [];
                        const numSentences = 3 + Math.floor(Math.random() * 3);
                        for (let j = 0; j < numSentences; j++) {
                            const randomSentence = koreanSentences[Math.floor(Math.random() * koreanSentences.length)];
                            dropSentenceQueues[i].push(randomSentence + ' ');
                        }
                    }
                }
                
                function draw() {
                    ctx.fillStyle = 'rgba(10, 10, 10, 0.99)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.font = '24px "Share Tech Mono", monospace';
                    
                    for (let i = 0; i < drops.length; i++) {
                        const sentenceQueue = dropSentenceQueues[i];
                        const combinedText = sentenceQueue.join('');
                        const x = i * 24 + 20;
                        const characterHeight = 24;
                        
                        for (let j = 0; j < combinedText.length; j++) {
                            const char = combinedText[j];
                            const y = drops[i] + (j * characterHeight);
                            
                            if (y > -characterHeight && y < canvas.height + characterHeight) {
                                ctx.fillStyle = 'rgba(0, 255, 65, 1)';
                                ctx.fillText(char, x, y);
                            }
                        }
                        
                        drops[i] += 8;
                        
                        if (drops[i] > characterHeight * 20) {
                            const newSentence = koreanSentences[Math.floor(Math.random() * koreanSentences.length)] + ' ';
                            dropSentenceQueues[i].push(newSentence);
                            
                            if (dropSentenceQueues[i].length > 5) {
                                dropSentenceQueues[i].shift();
                            }
                            
                            drops[i] = -characterHeight * 10;
                        }
                    }
                }

                resizeCanvas();
                initDrops();
                setInterval(draw, 100);

                window.addEventListener('resize', () => {
                    resizeCanvas();
                    initDrops();
                });
            }
            
            createMatrixRain();
            
            function startHeartbeatMonitoring() {
                heartbeatInterval = setInterval(() => {
                    const start = Date.now();
                    fetch('/heartbeat')
                        .then(response => {
                            if (!response.ok) throw new Error('Network response was not ok');
                            
                            const latency = Date.now() - start;
                            latencyHistory.push(latency);
                            if (latencyHistory.length > 10) latencyHistory.shift();
                            
                            const avgLatency = latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length;
                            document.getElementById('latency-display').textContent = avgLatency.toFixed(0) + 'ms';
                            
                            const latencyEl = document.getElementById('latency-display');
                            if (avgLatency > 200) {
                                latencyEl.style.color = 'var(--matrix-red)';
                                latencyEl.style.textShadow = '0 0 20px var(--matrix-red)';
                            } else if (avgLatency > 100) {
                                latencyEl.style.color = '#ffaa00';
                                latencyEl.style.textShadow = '0 0 10px #ffaa00';
                            } else {
                                latencyEl.style.color = 'var(--matrix-green)';
                                latencyEl.style.textShadow = 'var(--text-shadow-green)';
                            }
                            
                            if (avgLatency > 100 && !document.querySelector('.container').classList.contains('terminated')) {
                                document.querySelector('.container').style.boxShadow = '0 0 30px rgba(138, 43, 226, 0.6)';
                                document.querySelector('.container').style.border = '1px solid #8a2be2';
                                document.getElementById('title-h1').style.color = '#871cebff';
                                document.getElementById('title-h1').style.textShadow = '0 0 15px #8a2be2';
                                document.getElementById('title-h2').style.color = '#871cebff';
                                document.getElementById('title-h2').style.textShadow = '0 0 15px #8a2be2';
                                document.getElementById('title-h2').textContent = 'POD LAGGING';
                            } else if (!document.querySelector('.container').classList.contains('terminated')) {
                                document.querySelector('.container').style.boxShadow = 'var(--box-shadow-green)';
                                document.querySelector('.container').style.border = '1px solid var(--matrix-green)';
                                document.getElementById('title-h1').style.color = 'var(--matrix-green)';
                                document.getElementById('title-h1').style.textShadow = 'var(--text-shadow-green)';
                                document.getElementById('title-h2').style.color = 'var(--matrix-green)';
                                document.getElementById('title-h2').style.textShadow = 'var(--text-shadow-green)';
                                document.getElementById('title-h2').textContent = 'POD RUNNING';
                            }

                            return response.json();
                        })
                        .then(data => {
                            fetch('/stats').then(res => res.json()).then(stats => {
                                document.getElementById('requests').textContent = stats.requestCount;
                            });
                        })
                        .catch(() => {
                            document.getElementById('latency-display').textContent = 'OFFLINE';
                            document.getElementById('latency-display').style.color = 'var(--matrix-red)';
                            document.getElementById('latency-display').style.textShadow = '0 0 20px var(--matrix-red)';
                            
                            clearInterval(interval);
                            clearInterval(heartbeatInterval);

                            document.body.classList.add('terminated');
                            document.querySelector('.container').classList.add('terminated');
                            document.getElementById('title-h1').classList.add('terminated');
                            document.getElementById('title-h2').classList.add('terminated');
                            document.getElementById('title-h1').textContent = 'SYSTEM FAILURE';
                            document.getElementById('title-h2').textContent = 'POD TERMINATED';
                            
                            let flashCount = 0;
                            const flashInterval = setInterval(() => {
                                document.body.style.background = flashCount % 2 === 0 ? 
                                    'linear-gradient(135deg, #8B0000, #DC143C)' : 
                                    'linear-gradient(135deg, #000000, #440000)';
                                flashCount++;
                                if (flashCount > 10) clearInterval(flashInterval);
                            }, 200);
                            
                            startResurrectionPolling();
                        });
                }, 2000);
            }
            
            function startResurrectionPolling() {
                const resurrectInterval = setInterval(() => {
                    fetch('/heartbeat')
                        .then(response => {
                            if (response.ok) {
                                clearInterval(resurrectInterval);
                                restoreWebsiteState();
                            }
                        })
                        .catch(() => {
                            console.log('Pod still offline, continuing to poll...');
                        });
                }, 5000);
            }

            function restoreWebsiteState() {
                document.body.classList.remove('terminated');
                document.querySelector('.container').classList.remove('terminated');
                document.getElementById('title-h1').classList.remove('terminated');
                document.getElementById('title-h2').classList.remove('terminated');
                
                document.getElementById('title-h1').textContent = 'CHAOS DEMO INTERFACE';
                document.getElementById('title-h2').textContent = 'POD RUNNING';
                
                document.querySelector('.container').style.boxShadow = 'var(--box-shadow-green)';
                document.querySelector('.container').style.border = '1px solid var(--matrix-green)';
                document.getElementById('title-h1').style.color = 'var(--matrix-green)';
                document.getElementById('title-h1').style.textShadow = 'var(--text-shadow-green)';
                document.getElementById('title-h2').style.color = 'var(--matrix-green)';
                document.getElementById('title-h2').style.textShadow = 'var(--text-shadow-green)';
                
                document.body.style.background = 'linear-gradient(135deg, var(--matrix-dark), var(--matrix-dark-alt))';
                
                document.getElementById('latency-display').textContent = '--';
                document.getElementById('latency-display').style.color = 'var(--matrix-green)';
                document.getElementById('latency-display').style.textShadow = 'var(--text-shadow-green)';
                
                latencyHistory = [];
                
                fetch('/stats')
                    .then(res => res.json())
                    .then(stats => {
                        document.getElementById('requests').textContent = stats.requestCount;
                    })
                    .catch(() => {
                        console.log('Error fetching stats after resurrection');
                    });
                
                if (typeof interval !== 'undefined') {
                    clearInterval(interval);
                }
                interval = setInterval(updateDisplay, 1000);
                
                startHeartbeatMonitoring();
            }
            
            function addScanLines() {
                const scanline = document.createElement('div');
                scanline.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 65, 0.015) 2px, rgba(0, 255, 65, 0.015) 4px); pointer-events: none; z-index: 100; animation: scanlines 0.1s linear infinite;';
                
                const style = document.createElement('style');
                style.textContent = '@keyframes scanlines { 0% { transform: translateY(0); } 100% { transform: translateY(4px); } }';
                document.head.appendChild(style);
                document.body.appendChild(scanline);
            }
            
            addScanLines();
            startHeartbeatMonitoring();
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