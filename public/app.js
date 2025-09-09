import { updateSessionStats, initializeChart, fetchReports, renderStatistics } from './chart.js'

// Initial App State
let isConnected = false;
let pods = [];
let activityLog = [];
let currentNamespace = null;
let isMinikubeOperationInProgress = false;

// Targets array for killPod()
let selectedPods = []; 

// Launch App
document.addEventListener('DOMContentLoaded', () => {
    initStarfield();
    checkConnection();

    // Connection main function to Kill Button
    const killBtn = document.getElementById('killBtn');
    if (killBtn) {
        killBtn.addEventListener('click', killPod);
    }

    // Load Namespaces and prompt user to pick a Namespace
    loadNamespaces();
    const namespaceSelect = document.getElementById('namespace-select');
    namespaceSelect.classList.add('attention-glow');
    
    // Load Statistics
    initializeChart();
    fetchReports();
    renderStatistics();
    addLogEntry('Dashboard initialized', 'info');
});

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
            console.log('✅ Confirmed Connection with Minikube');
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
            addLogEntry('Please select a Namespace', 'error');
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
function clearPods(callback) {
    const podsList = document.getElementById('podsList');
    const podItems = podsList.querySelectorAll('.pod-item');
    
    // Check if there are any pods to animate
    if (podItems.length > 0) {
        // Animate out all the pods
        podItems.forEach((item, index) => {
            const delay = (podItems.length - 1 - index) * 0.05;
            item.style.animationDelay = `${delay}s`;
            item.classList.remove('show');
            item.classList.add('hide');
        });

        // Set a timeout to clear the list after the animation is complete
        const totalAnimationTime = (podItems.length * 0.05) + 0.5;
        setTimeout(() => {
            podsList.innerHTML = ''; // Only clear the HTML
            if (callback) {
                callback();
            }
        }, totalAnimationTime * 1000); // Convert to milliseconds
    } else {
        // No pods to animate, just proceed to the callback
        if (callback) {
            callback();
        }
    }
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
        const labelElement = document.querySelector('label[for="namespace-select"]');
        namespaceSelect.innerHTML = ''; // Clear existing options
        
        // Add a default option
        const defaultOption = document.createElement('option');
        defaultOption.value = 'null';
        namespaceSelect.appendChild(defaultOption);

        // Add the 'attention-text' class to the label initially, since 'null' is selected by default
        labelElement.classList.add('attention-text');

        data.namespaces.forEach(ns => {
            const option = document.createElement('option');
            option.value = ns.name;
            option.text = ns.name;
            namespaceSelect.appendChild(option);
        });

        // Load pods for the current namespace
        loadPods(currentNamespace);

        // Add event listener to reload pods when namespace changes
        namespaceSelect.addEventListener('change', (event) => {
            const selectedNamespace = event.target.value;

            // First, clear the pods with the animation
            clearPods(() => {
                if (selectedNamespace === 'null') {
                    // If 'null' is selected, show the attention animation and empty message
                    labelElement.classList.add('attention-text');
                    namespaceSelect.classList.add('attention-glow');
                    addLogEntry('Please select a Namespace', 'error');
                    pods = []; // Clear the data array
                    renderPods(); // Render the empty list message
                    selectedPods = []; // Clear selected pods when the namespace changes
                } else {
                    // If a valid namespace is selected, remove the attention animation and load new pods
                    labelElement.classList.remove('attention-text');
                    namespaceSelect.classList.remove('attention-glow');
                    currentNamespace = selectedNamespace;
                    loadPods(selectedNamespace); // This will render the new pods
                    addLogEntry(`Switched to namespace: ${selectedNamespace}`, 'info');
                    selectedPods = []; // Clear selected pods when the namespace changes
                }
            });
        });

    } catch (error) {
        console.error('Error loading namespaces:', error);
        addLogEntry('Failed to load namespaces: ' + error.message, 'error');
    }
}

// Load pods list
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
// 9/8 DJ - Pods to show one by one
function renderPods() {
    const podsList = document.getElementById('podsList');
    const killBtn = document.getElementById('killBtn');

    if (pods.length === 0) {
        podsList.innerHTML = `<div class="pod-item show">
            <span class="pod-name" style="margin: 0.5rem; color: white">No Pods Found</span>
            <span class="pod-status" style="margin: 0.5rem; color: white">Empty Namespace</span>
        </div>`;
        killBtn.disabled = true;
        return;
    } else {
        killBtn.disabled = false;
    }
    
    const podsHtml = pods.map(pod => {
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

    // Step 2: Set the innerHTML and get a reference to the new elements
    podsList.innerHTML = podsHtml;

    // Step 3: Add a class and a staggered delay to each item
    const podItems = podsList.querySelectorAll('.pod-item');
    podItems.forEach((item, index) => {
        item.style.animationDelay = `${index * 0.05}s`;
        item.classList.add('show');
        
        // Add a click listener to each pod item
        item.addEventListener('click', () => {
            const podName = item.querySelector('.pod-name').textContent;
            const isSelected = item.classList.toggle('selected'); // Toggle the 'selected' class

            // Add or remove the pod name from the selectedPods array
            if (isSelected) {
                selectedPods.push(podName);
            } else {
                const podIndex = selectedPods.indexOf(podName);
                if (podIndex > -1) {
                    selectedPods.splice(podIndex, 1);
                }
            }
         })
    });
}

// Main Function = Kill Random Pod
async function killPod() {
    fireLasers();

    if (!isConnected) {
        addLogEntry('Not connected to cluster', 'error');
        return;
    }

    // Disable button while function is running
    const btn = document.getElementById('killBtn');
    btn.innerHTML = '<div class="spinner"></div>Killing';
    btn.disabled = true;

    // Check if there are any pods selected by the user
    let podsToKill = [];
    if (selectedPods.length > 0) {
        // Option 1: User selected pods
        podsToKill = selectedPods;
        addLogEntry(`Initiating kill for ${podsToKill.length} selected pods...`, 'info');
    } else {
        // Option 2: Fallback to killing a random pod
        const runningPods = pods.filter(p => p.status === 'Running');
        if (runningPods.length === 0) {
            addLogEntry('No running pods to kill', 'error');
            btn.innerHTML = '<div>💀</div>Kill Pod';
            btn.disabled = false;
            return;
        }
        const targetPod = runningPods[Math.floor(Math.random() * runningPods.length)];
        podsToKill = [targetPod.name]; // Create a single-item array
        addLogEntry(`Initiating kill for random pod: ${targetPod.name}`, 'info');
    }

    // Await the fetch response to ensure the kill operation is complete.
    try {
        const response = await fetch('/api/kill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                podNames: podsToKill, // Pass the array to the backend
                namespace: currentNamespace
            })
        });

        if (response.ok) {
            const result = await response.json();
            result.results.forEach(res => {
                addLogEntry(`Pod killed: ${res.killedPodName}`, 'kill');
                if (res.replacementPodName) {
                    addLogEntry(`Replacement pod created: ${res.replacementPodName}`, 'replacement');
                }
                if (res.recoveryTime !== null) {
                    addLogEntry(`Pod recovered in ${res.recoveryTime.toFixed(2)} seconds`, 'success');
                    updateSessionStats(res.recoveryTime);
                } else {
                    addLogEntry('Pod killed, but no new replacement pod found.', 'info');
                }
            });
            fetchReports();
        } else {
            throw new Error('Failed to kill pod(s)');
        }
    } catch (error) {
        addLogEntry('Failed to complete kill operation: ' + error.message, 'error');
        updateSessionStats(null);
    } finally {
        // Re-enable the button and reload pods only after the operation is complete
        setTimeout(() => {
            selectedPods = [];
            loadPods(currentNamespace);
            btn.innerHTML = '<div>💀</div>Kill Pod';
            btn.disabled = false;
        }, 2000);
    }
}

// Add log entry
export function addLogEntry(message, type = 'info') {
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