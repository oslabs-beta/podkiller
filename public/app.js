// Initial App State
let isConnected = false;
let pods = [];
let activityLog = [];
let chart = null;
let currentNamespace = 'default';
let isMinikubeOperationInProgress = false;

// Current Session Stats Tracker
let sessionStats = {
    podsKilled: 0,
    totalRecoveryTime: 0,
    recoveryTimes: [],
    failedRecoveries: 0
};

// Function to update session statistics
function updateSessionStats(recoveryTime) {
    sessionStats.podsKilled++;
    
    if (recoveryTime !== null && recoveryTime > 0) {
        sessionStats.totalRecoveryTime += recoveryTime;
        sessionStats.recoveryTimes.push(recoveryTime);
    } else {
        sessionStats.failedRecoveries++;
    }
    
    renderStatistics();
}

// Function to calculate average recovery time
function getAverageRecoveryTime() {
    if (sessionStats.recoveryTimes.length === 0) {
        return 0;
    }
    return sessionStats.totalRecoveryTime / sessionStats.recoveryTimes.length;
}

// Function to render statistics in the UI
function renderStatistics() {
    const statisticsDiv = document.getElementById('statistics');
    const averageRecovery = getAverageRecoveryTime();
    
    if (!statisticsDiv) {
        console.warn('Statistics div not found');
        return;
    }

    statisticsDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h2 style="margin: 0; text-align: center; width: 100%;">Session Statistics</h2>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px;">
            <div style="text-align: center; padding: 15px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08);">
                <div style="font-size: 1.8em; font-weight: bold; color: #00ff88; margin-bottom: 5px;">${sessionStats.podsKilled}</div>
                <div style="font-family: 'Asimovian', sans-serif; font-weight: 400; font-style: normal; font-size: 0.8em; color: rgba(255, 255, 255, 0.7); text-transform: uppercase;">Pods Killed</div>
            </div>
            <div style="text-align: center; padding: 15px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08);">
                <div style="font-size: 1.8em; font-weight: bold; color: #00ff88; margin-bottom: 5px;">${averageRecovery.toFixed(2)}s</div>
                <div style="font-family: 'Asimovian', sans-serif; font-weight: 400; font-style: normal; font-size: 0.8em; color: rgba(255, 255, 255, 0.7); text-transform: uppercase;">Avg Recovery</div>
            </div>
            <div style="text-align: center; padding: 15px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08);">
                <div style="font-size: 1.8em; font-weight: bold; color: #00ff88; margin-bottom: 5px;">${sessionStats.recoveryTimes.length}</div>
                <div style="font-family: 'Asimovian', sans-serif; font-weight: 400; font-style: normal; font-size: 0.8em; color: rgba(255, 255, 255, 0.7); text-transform: uppercase;">Recoveries</div>
            </div>
            <div style="text-align: center; padding: 15px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08);">
                <div style="font-size: 1.8em; font-weight: bold; color: #ef4444; margin-bottom: 5px;">${sessionStats.failedRecoveries}</div>
                <div style="font-family: 'Asimovian', sans-serif; font-weight: 400; font-style: normal; font-size: 0.8em; color: rgba(255, 255, 255, 0.7); text-transform: uppercase;">Failed</div>
            </div>
            <button onclick="resetSessionStats()" style="background: rgba(88, 236, 204, 0.2); border: 1px solid rgba(31, 149, 94, 0.3); color: #26e9dfff; padding: 6px 12px; border-radius: 4px; font-size: 0.8em; cursor: pointer;">
                Reset Session
            </button>
            <button style="background: rgba(88, 236, 204, 0.2); border: 1px solid rgba(31, 149, 94, 0.3); color: #26e9dfff; padding: 6px 12px; border-radius: 4px; font-size: 0.8em; cursor: pointer;">
                Download Report
            </button>
        </div>
    `;
}

// Function to reset session statistics
function resetSessionStats() {
    sessionStats = {
        podsKilled: 0,
        totalRecoveryTime: 0,
        recoveryTimes: [],
        failedRecoveries: 0
    };
    renderStatistics();
    addLogEntry('Session statistics reset', 'info');
}

// Launch App
document.addEventListener('DOMContentLoaded', () => {
    initStarfield();
    checkConnection();
    loadNamespaces();
    addLogEntry('Dashboard initialized', 'info');
    initializeChart();
    fetchReports();
    renderStatistics();
});

// Initialize Recovery Chart
function initializeChart() {
    const ctx = document.getElementById('chaosChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Recovery Time (seconds)',
                data: [],
                borderColor: 'rgba(75, 194, 92, 0.52)',
                backgroundColor: 'rgba(191, 240, 176, 0.1)',
                fill: true,
                tension: 0.1,
                pointBackgroundColor: 'rgba(120, 230, 61, 1)',
                pointBorderColor: '#24db1dff',
                pointHoverBackgroundColor: '#6fed42ff',
                pointHoverBorderColor: 'rgba(159, 255, 149, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'RT(seconds)',
                        color: 'rgba(159, 255, 149, 1)',
                        font: {family: 'Share Tech, sans-serif'}
                    },
                    ticks: {
                        color: '#d3d3d3ff',
                        font: {family: 'Share Tech, sans-serif'}
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time of Chaos Event',
                        color: 'rgba(159, 255, 149, 1)',
                        font: {family: 'Share Tech, sans-serif'}
                    },
                    ticks: {
                        color: '#a4a4a4ff',
                        font: {family: 'Share Tech, sans-serif'}
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.parsed.y;
                            return `Recovery Time: ${value.toFixed(2)}s`;
                        }
                    }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: 'rgba(159, 255, 149, 1)',
                        font: {family: 'Share Tech, sans-serif'}
                    }
                }
            }
        }
    });
}

// Fetch and display recovery reports
async function fetchReports() {
    try {
        addLogEntry('Compiling recovery analytics...', 'info');
        const response = await fetch('http://localhost:3000/api/reports');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.reports || data.reports.length === 0) {
            addLogEntry('No recovery data found', 'info');
            return;
        }

        const reports = data.reports
        const labels = reports.map((r) =>
            new Date(r.deletionTime).toLocaleTimeString()
        );
        const recoveryTimes = reports.map((r) => r.recoveryTime);

        // Update chart data
        chart.data.labels = labels;
        chart.data.datasets[0].data = recoveryTimes;
        chart.update();

        addLogEntry(`Loaded ${reports.length} recovery records`, 'success');
    } catch (error) {
        addLogEntry('Failed to load recovery data: ' + error.message, 'error');
        console.error('Error fetching reports:', error);
    }
}

// Check Minikube connection
async function checkConnection() {

    // Don't check connection during Minikube operations
    if (isMinikubeOperationInProgress) {
        console.log('⏸️ Skipping connection check - Minikube operation in progress');
        return;
    }

    try {
        console.log('📡 Automatic Minikube connection check')
        const response = await fetch('/api/status');
        const data = await response.json();

        // Use the 'connected' flag from the server response
        setConnectionStatus(data.connected); 

        // Load pods only if a connection is established
        if (data.connected) {
            console.log('✅ Confirmed Connection - Reloading Pods');
            loadPods(currentNamespace);
        }

    } catch (error) {
        console.log('💥 Minikube connection check failed:', error.message);
        setConnectionStatus(false);
    }
}

// Set connection status
function setConnectionStatus(connected) {
    const wasConnected = isConnected;
    isConnected = connected;

    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const killBtn = document.getElementById('killBtn');
    const minikubeBtn = document.getElementById('minikubeBtn')
    const namespaceSelect = document.getElementById('namespace-select');
    
    // 9/8 DJ - This will probably become obsolete soon, 
    // but I needed a check for frontend elements that were used as flags
    if (!statusDot || !statusText || !killBtn || !minikubeBtn) {
        console.warn("⚠️ UI elements not ready yet, skipping connection status update");
        return;
    }

    if (connected) {
        statusDot.classList.add('connected');
        statusDot.classList.remove('working');
        statusText.textContent = 'Connected';
        statusText.style = 'font-family: "Kode Mono", monospace; font-optical-sizing: auto; font-weight: 800; color: #a4f2b9'
        killBtn.disabled = false;
        loadNamespaces;

        // Set the button to "Stop Minikube" and change its functionality
        if (!isMinikubeOperationInProgress) {
        minikubeBtn.disabled = false;
        minikubeBtn.onclick = stopMinikube;
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
        statusText.style = 'font-family: "Kode Mono", monospace; font-optical-sizing: auto; font-weight: 800; color: #a4f2b9'
        }

        // Only log connection message if state actually changed
        if (!wasConnected) {
            addLogEntry('Connected to Minikube', 'success');
        }

    } else {
        statusDot.classList.remove('connected');
        statusDot.classList.remove('working');
        statusText.textContent = 'Disconnected';
        statusText.style = 'font-family: "Kode Mono", monospace; font-optical-sizing: auto; font-weight: 800; color: #f84848ff'
        killBtn.disabled = true;

        // Set the button to "Start Minikube" when disconnected
        if (!isMinikubeOperationInProgress) {
        minikubeBtn.disabled = false;
        minikubeBtn.onclick = startMinikube;
        statusText.style = 'font-family: "Kode Mono", monospace; font-optical-sizing: auto; font-weight: 800; color: #f84848ff'
        }

        // Only log disconnection message if state actually changed
        if (wasConnected) {
            addLogEntry('Disconnected from Minikube', 'kill');
        }
    }
}

// Function to clear namespace list
function clearNamespaces() {
    const namespaceSelect = document.getElementById('namespace-select');
    if (namespaceSelect) {
        namespaceSelect.textContent = '---';
        currentNamespace = 'default'; // Reset to default
        addLogEntry('Namespace list cleared', 'error');
    }
}

// Function to clear pods list
function clearPods() {
    pods = []; // Clear the global pods array
    renderPods(); // This will show "No Pods Found" message
    addLogEntry('Pods list cleared', 'error');
}

// Function to clear all UI state when disconnecting
function clearAllUIState() {
    clearNamespaces();
    clearPods();    
    addLogEntry('UI state cleared for disconnect', 'error');
}

// Function to initialize UI state when connecting
function initializeUIState() {
    addLogEntry('Initializing UI state for connection...', 'info');
    
    // Load namespaces first
    loadNamespaces();
    
    // Refresh chart data
    fetchReports();
    
    addLogEntry('UI state initialized', 'success');
}


async function pollForConnection(maxWaitMs) {
    const startTime = Date.now();
    const pollInterval = 500;
    
    while (Date.now() - startTime < maxWaitMs) {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            if (data.connected) {
                console.log('✅ Minikube is ready!');
                setConnectionStatus(true);
                // Initialize UI state when connection is established
                initializeUIState();
                return;
            }
        } catch (error) {
            console.log('Still waiting for Minikube...');
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    console.log('⚠️ Minikube response timeout - forcing connection check');
        checkConnection();
}

// 9/8 Pete - Start & Stop Minikube
async function startMinikube() {
    console.log('Initiating Minikube...');
    isMinikubeOperationInProgress = true;
    addLogEntry('Connecting to Minikube...', 'info');

    const minikubeBtn = document.getElementById('minikubeBtn');
    minikubeBtn.disabled = true;
    statusDot.classList.add('working');
    statusText.textContent = 'Connecting...';
    statusText.style = 'font-family: "Kode Mono", monospace; font-optical-sizing: auto; font-weight: 800; color: yellow';

    try {
        console.log('📡 Sending POST request to /api/minikube/start');
        const response = await fetch('/api/minikube/start', {
        method: 'POST',
        });
        
        console.log(`📊 Response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            console.error(`❌ Failed to start Minikube - HTTP ${response.status}: ${response.statusText}`);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
            if (data.success) {
                console.log('✅ Minikube started successfully!');
                console.log(`📝 Details:`, {
                    status: data.status,
                    cluster: data.cluster || 'minikube',
                    duration: data.startupTime ? `${data.startupTime}ms` : 'unknown'
                });
                } else {
                console.warn('⚠️ Minikube start completed with warnings:', data.message || 'No message provided');
                }
                return data;
    } catch (err) {
        console.error('💥 Critical error starting Minikube:', {
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
        });
        throw err; // Re-throw to allow caller to handle
    } finally {
        // Re-enable pod loading and reset button state
        isMinikubeOperationInProgress = false;
        console.log('🔄 Pod loading re-enabled after Minikube startup attempt');
        // Force a connection check after startup - this will set the correct button state
        pollForConnection(500); // Poll for 30 seconds
    }
}

async function stopMinikube() {
    console.log('🛑 Initiating Minikube shutdown...');
    addLogEntry('Shutting down Minikube...', 'kill');
    isMinikubeOperationInProgress = true;
    console.log('🚫 Pod loading disabled during Minikube shutdown');

    const minikubeBtn = document.getElementById('minikubeBtn');
    minikubeBtn.disabled = true;
    statusDot.classList.add('working');
    statusText.textContent = 'Disconnecting...';
    statusText.style = 'font-family: "Kode Mono", monospace; font-optical-sizing: auto; font-weight: 800; color: yellow';

    // Clear UI state immediately when starting shutdown
    clearAllUIState();

    try {
        console.log('📡 Sending POST request to /api/minikube/stop');
        const response = await fetch('/api/minikube/stop', {
        method: 'POST',
        });
    
    console.log(`📊 Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`❌ Failed to stop Minikube - HTTP ${response.status}: ${response.statusText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Minikube stopped successfully!');
      console.log(`📝 Details:`, {
        status: data.status,
        cluster: data.cluster || 'minikube',
        shutdownTime: data.shutdownTime ? `${data.shutdownTime}ms` : 'unknown'
      });
    } else {
      console.warn('⚠️ Minikube stop completed with warnings:', data.message || 'No message provided');
    }
    return data;
  } catch (err) {
    console.error('💥 Critical error stopping Minikube:', {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    throw err; // Re-throw to allow caller to handle
  } finally {
        // Reset operation flag and button state
        isMinikubeOperationInProgress = false;
        console.log('ℹ️ Minikube operation completed');
        // Force a connection check after shutdown - this will set the correct button state
        pollForConnection(500)
    }
}

// 9/4 DJ - Function to load available Namespaces
async function loadNamespaces() {
    try {
        const response = await fetch('/api/namespaces');
        const data = await response.json();
        const namespaceSelect = document.getElementById('namespace-select');
        namespaceSelect.innerHTML = ''; // Clear existing options
        
        // Add a default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        namespaceSelect.appendChild(defaultOption);

        data.namespaces.forEach(ns => {
            const option = document.createElement('option');
            option.value = ns.name;
            option.text = ns.name;
            // Pre-select 'default' namespace if it exists
            if (ns.name === 'default') {
                option.selected = true;
            }
            namespaceSelect.appendChild(option);
        });

        // Load pods for the current namespace
        loadPods(currentNamespace);

        // Add event listener to reload pods when namespace changes
        namespaceSelect.addEventListener('change', (event) => {
            const selectedNamespace = event.target.value;
            if (selectedNamespace) {
                currentNamespace = selectedNamespace; // ✅ Update the global variable
                loadPods(selectedNamespace); // ✅ Use the selected namespace
                addLogEntry(`Switched to namespace: ${selectedNamespace}`, 'info');
            }
        });

    } catch (error) {
        console.error('Error loading namespaces:', error);
        addLogEntry('Failed to load namespaces: ' + error.message, 'error');
    }
}

// Load pods list (auto-refresh)
async function loadPods(namespace = 'default') {

    console.log('Loading pods for namespace:', namespace);

    // Check if Minikube operation is in progress
    if (isMinikubeOperationInProgress) {
        console.log('⏸️ Skipping pod loading - Minikube operation in progress');
        return;
    }

    if (!isConnected) {
        console.log('📡 Not connected to cluster - rendering empty pods list');
        renderPods();
        return;
    }

    try {
        console.log('📡 Fetching pods from API...');
        const response = await fetch(`/api/pods?namespace=${namespace}`);
        
        if (response.ok) {
            const data = await response.json();
            pods = data.pods || [];
            console.log(`✅ Successfully loaded ${pods.length} pods from namespace: ${namespace}`);
            renderPods();
        } else {
            throw new Error('Failed to fetch pods');
        }
    } catch (error) {
        addLogEntry('❌ Failed to load pods: ' + error.message, 'error');
        pods = [];
        renderPods();
    }
}

// 9/5 DJ - New Render pods list
function renderPods() {
    const podsList = document.getElementById('podsList');
    
    if (pods.length === 0) {
        podsList.innerHTML = `<div class="pod-item">
            <span class="pod-name" style="margin: 0.5rem; color: white">No Pods Found</span>
            <span class="pod-status" style="margin: 0.5rem; color: white">Empty Namespace</span>
        </div>`;
        return;
    }
    
    podsList.innerHTML = pods.map(pod => {
        let liquidClass = '';
        let statusText = pod.status;
        let statusClass = '';
        
        if (pod.status === 'Running') {
            liquidClass = 'running';
            statusClass = 'running';
        } else if (pod.status === 'Pending') {
            liquidClass = 'pending';
            statusText = 'Pending';
            statusClass = 'pending';
        } else if (pod.status === 'Terminating') {
            liquidClass = 'terminating';
            statusText = 'Terminating';
            statusClass = 'terminating';
        }

        return `
        <div class="pod-item ${liquidClass}">
            <div class="pod-liquid"></div>
            <div class="pod-info">
                <span class="pod-name">${pod.name}</span>
                <span class="pod-status ${statusClass}">${statusText}</span>
            </div>
        </div>
        `;
    }).join('');
}

// Main Function = Kill Random Pod
async function killRandomPod() {
    fireLasers();

    if (!isConnected || pods.length === 0) {
        addLogEntry('No pods available to kill', 'error');
        return;
    }

    const btn = document.getElementById('killBtn');
    btn.innerHTML = '<div class="spinner"></div>Killing';
    btn.disabled = true;

    const runningPods = pods.filter(p => p.status === 'Running');
    if (runningPods.length === 0) {
        addLogEntry('No running pods to kill', 'error');
        btn.innerHTML = '<div>💀</div>Kill Pod';
        btn.disabled = false;
        return;
    }

    const targetPod = runningPods[Math.floor(Math.random() * runningPods.length)];
    
    try {
        const response = await fetch('/api/kill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                podName: targetPod.name,
                namespace: currentNamespace
            })
        });

        // Add a small delay to allow K8 to process the deletion
        setTimeout(() => {
            loadPods(currentNamespace);
        }, 2000);

        if (response.ok) {
            const result = await response.json();
            addLogEntry(`Pod killed: ${result.killedPodName || targetPod.name}`, 'kill');

            if (result.replacementPodName) {
            addLogEntry(`Replacement pod created: ${result.replacementPodName}`, 'replacement');
            }

            if (result.recoveryTime !== null) {
            addLogEntry(`Pod recovered in ${result.recoveryTime.toFixed(2)} seconds`, 'success');
            updateSessionStats(result.recoveryTime);
            
            // Auto-refresh chart data after a successful kill
            setTimeout(() => {
                fetchReports();
            }, 1000);

            } else {
                addLogEntry('Pod killed, but no new replacement pod found.', 'info');
            }

            // Reload pods again after the response to show final state
            loadPods(currentNamespace);

        } else {
            throw new Error('Failed to kill pod');
        }
    } catch (error) {
        addLogEntry('Failed to kill pod: ' + error.message, 'error');
        updateSessionStats(null);
    }

    btn.innerHTML = '<div>💀</div>Kill Pod';
    btn.disabled = false;
}

// Add log entry
function addLogEntry(message, type = 'info') {
    const time = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    
    const logEntry = {
        time: time,
        message: message,
        type: type
    };
    
    activityLog.unshift(logEntry);
    if (activityLog.length > 50) {
        activityLog = activityLog.slice(0, 50);
    }
    
    renderLogs();
}

// Render activity logs
function renderLogs() {
    const logEntries = document.getElementById('logEntries');
    
    if (activityLog.length === 0) {
        logEntries.innerHTML = '<div class="empty-log">No activity yet. Kill a pod to see logs.</div>';
        return;
    }
    
    logEntries.innerHTML = activityLog.map(log => `
        <div class="log-entry ${log.type}">
            <div class="log-time">${log.time}</div>
            <div class="log-message">${log.message}</div>
        </div>
    `).join('');
}