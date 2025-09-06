// Initial App State
let isConnected = false;
let pods = [];
let activityLog = [];
let chart = null;
currentNamespace = 'default';

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
            <h2 style="margin: 0;">Session Statistics</h2>
            <button onclick="resetSessionStats()" style="background: rgba(88, 236, 204, 0.2); border: 1px solid rgba(31, 149, 94, 0.3); color: #26e9dfff; padding: 6px 12px; border-radius: 4px; font-size: 0.8em; cursor: pointer;">
                Reset
            </button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px;">
            <div style="text-align: center; padding: 15px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08);">
                <div style="font-size: 1.8em; font-weight: bold; color: #00ff88; margin-bottom: 5px;">${sessionStats.podsKilled}</div>
                <div style="font-size: 0.8em; color: rgba(255, 255, 255, 0.7); text-transform: uppercase;">Pods Killed</div>
            </div>
            <div style="text-align: center; padding: 15px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08);">
                <div style="font-size: 1.8em; font-weight: bold; color: #00ff88; margin-bottom: 5px;">${averageRecovery.toFixed(2)}s</div>
                <div style="font-size: 0.8em; color: rgba(255, 255, 255, 0.7); text-transform: uppercase;">Avg Recovery</div>
            </div>
            <div style="text-align: center; padding: 15px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08);">
                <div style="font-size: 1.8em; font-weight: bold; color: #00ff88; margin-bottom: 5px;">${sessionStats.recoveryTimes.length}</div>
                <div style="font-size: 0.8em; color: rgba(255, 255, 255, 0.7); text-transform: uppercase;">Recoveries</div>
            </div>
            <div style="text-align: center; padding: 15px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08);">
                <div style="font-size: 1.8em; font-weight: bold; color: #ef4444; margin-bottom: 5px;">${sessionStats.failedRecoveries}</div>
                <div style="font-size: 0.8em; color: rgba(255, 255, 255, 0.7); text-transform: uppercase;">Failed</div>
            </div>
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
    setInterval(checkConnection, 5000); // Check connection every 5 seconds
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
                        color: 'rgba(159, 255, 149, 1)'
                    },
                    ticks: {
                        color: '#d3d3d3ff'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time of Chaos Event',
                        color: 'rgba(159, 255, 149, 1)'
                    },
                    ticks: {
                        color: '#a4a4a4ff'
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
                        color: '#cbcbcbff' // Change legend label color
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
    try {
        const response = await fetch('/api/status');
        if (response.ok) {
            setConnectionStatus(true);
            if (isConnected) {
                loadPods(currentNamespace); // Auto-load pods when connected
            }
        } else {
            setConnectionStatus(false);
        }
    } catch (error) {
        setConnectionStatus(false);
    }
}

// Set connection status
function setConnectionStatus(connected) {
    isConnected = connected;
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const killBtn = document.getElementById('killBtn');
    
    if (connected) {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
        statusText.style = 'color: #a4f2b9'
        killBtn.disabled = false;
        if (!activityLog.some(log => log.message.includes('Connected to Minikube'))) {
            addLogEntry('Connected to Minikube', 'success');
        }
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Disconnected';
        statusText.style = 'color: #f84848ff'
        killBtn.disabled = true;
    }
}

// Start Minikube
async function startMinikube() {
    const btn = document.getElementById('minikubeBtn');
    btn.innerHTML = '<span class="spinner"></span>Starting...';
    btn.disabled = true;
    
    addLogEntry('Starting Minikube...', 'info');
    
    try {
        const response = await fetch('/api/minikube/start', { method: 'POST' });
        
        if (response.ok) {
            addLogEntry('Minikube started successfully', 'success');
            setConnectionStatus(true);
            loadPods(currentNamespace);
        } else {
            throw new Error('Failed to start Minikube');
        }
    } catch (error) {
        addLogEntry('Failed to start Minikube: ' + error.message, 'error');
        btn.innerHTML = 'Start Minikube';
        btn.disabled = false;
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
        defaultOption.text = 'Select a namespace...';
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

        // Load pods for the 'default' namespace initially
        currentNamespace = 'default';
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

    console.log('Attempting to load pods for namespace:', namespace);

    if (!isConnected) {
        renderPods();
        return;
    }

    try {
        const response = await fetch(`/api/pods?namespace=${namespace}`);
        
        if (response.ok) {
            const data = await response.json();
            pods = data.pods || [];
            renderPods();
        } else {
            throw new Error('Failed to fetch pods');
        }
    } catch (error) {
        addLogEntry('Failed to load pods: ' + error.message, 'error');
        pods = [];
        renderPods();
    }
}

// 9/5 DJ - New Render pods list
function renderPods() {
    const podsList = document.getElementById('podsList');
    
    if (pods.length === 0) {
        podsList.innerHTML = `<div class="pod-item">
            <span class="pod-name">No pods found</span>
            <span class="pod-status">Empty namespace</span>
        </div>`;
        return;
    }
    
    podsList.innerHTML = pods.map(pod => {
        let liquidClass = '';
        let statusText = pod.status;
        
        if (pod.status === 'Running') {
            liquidClass = 'running';
        } else if (pod.status === 'Pending') {
            liquidClass = 'pending';
            statusText = 'Pending...';
        } else if (pod.status === 'Terminating') {
            liquidClass = 'terminating';
            statusText = 'Terminating...';
        }

        return `
        <div class="pod-item ${liquidClass}">
            <div class="pod-liquid"></div>
            <div class="pod-info">
                <span class="pod-name">${pod.name}</span>
                <span class="pod-status">${statusText}</span>
            </div>
        </div>
        `;
    }).join('');
}

// Main Function = Kill Random Pod
async function killRandomPod() {
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
            loadPods('default');
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
            loadPods('default');

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

// Auto-refresh pods every 5 seconds when connected
setInterval(() => {
    if (isConnected) {
        loadPods(currentNamespace);
    }
}, 5000);
