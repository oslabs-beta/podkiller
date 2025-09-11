import { initializeChart, updateSessionStats, fetchReports, renderStatistics } from './chart.js'

// Initial App State
let isConnected = false;
let pods = [];
let activityLog = [];
let currentNamespace = null;
let isMinikubeOperationInProgress = false;

// Targets array for killPod()
let selectedPods = []; 

// Latency variables
let isLatencyActive = false;
let currentLatencyPods = [];

// Launch App
document.addEventListener('DOMContentLoaded', () => {
    initStarfield();
    checkConnection();

    // Connect main functions to Kill + Latency Buttons
    const killBtn = document.getElementById('killBtn');
    if (killBtn) {
        killBtn.addEventListener('click', () => killPod(currentNamespace));
    }

    const lagBtn = document.getElementById('lagBtn');
    if (lagBtn) {
        lagBtn.addEventListener('click', handleLatencyAction);
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
    const selectAllBtn = document.getElementById('selectAllBtn');
    
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
            addLogEntry('Connected to Minikube', 'done');
            addLogEntry('Please select a Namespace', 'error');
        }

    } else {
        statusDot.classList.remove('connected');
        statusDot.classList.remove('working');
        statusText.textContent = 'Disconnected';
        statusText.style = 'font-family: "Kode Mono", monospace; font-optical-sizing: auto; font-weight: 800; color: #f84848ff'
        killBtn.disabled = true;
        selectAllBtn.disabled = true;

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
        currentNamespace = 'null';
        addLogEntry('Namespace list cleared', 'error');
    }
}

// Function to clear pods list
function clearPods(callback) {
    const podsList = document.getElementById('podsList');
    const podItems = podsList.querySelectorAll('.pod-item');
    
    // Reset latency state when clearing pods
    resetLatencyState();

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
            pods = []; // Clear the data array first
            renderPods();
            if (callback) {
                callback();
            }
        }, totalAnimationTime * 1000);
    } else {
        // No pods to animate, just show the empty state and proceed to the callback
        pods = []; // Clear the data array
        renderPods();
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
    addLogEntry('UI state initialized', 'done');
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
                    resetLatencyState();
                } else {
                    // If a valid namespace is selected, remove the attention animation and load new pods
                    labelElement.classList.remove('attention-text');
                    namespaceSelect.classList.remove('attention-glow');
                    currentNamespace = selectedNamespace;
                    loadPods(selectedNamespace); // This will render the new pods
                    addLogEntry(`Switched to namespace: ${selectedNamespace}`, 'info');
                    selectedPods = []; // Clear selected pods when the namespace changes
                    resetLatencyState();
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

    // If no Namespace
    if (namespace === 'null') {
        pods = [];
        renderPods();
        return;
    }

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
    const lagBtn = document.getElementById('lagBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');

    if (pods.length === 0) {
        podsList.innerHTML = `<div class="pod-item show">
            <span class="pod-name" style="margin: 0.5rem; color: white">No Pods Found</span>
            <span class="pod-status" style="margin: 0.5rem; color: white">Empty Namespace</span>
        </div>`;
        killBtn.disabled = true;
        selectAllBtn.disabled = true;
        lagBtn.disabled = true;
        return;
    } else {
        killBtn.disabled = false;
        lagBtn.disabled = false;
        selectAllBtn.disabled = false;
    }
    
    const podsHtml = pods.map(pod => {
        console.log('Pod status for', pod.name, ':', pod.status);
        let liquidClass = '';
        let statusText = pod.status;
        let statusClass = '';
        const hasLatency = currentLatencyPods.includes(pod.name);
        
        if (hasLatency && pod.status === 'Running') {
            liquidClass = 'lagging';
            statusText = 'Lagging';
            statusClass = 'lagging';
        } else if (pod.status === 'Running') {
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

            const allSelected = podItems.length > 0 && Array.from(podItems).every(item => item.classList.contains('selected'));
            const selectAllBtn = document.getElementById('selectAllBtn');
            const targetCount = document.getElementById('podCount');

            // Add or remove the pod name from the selectedPods array
            if (isSelected) {
                selectedPods.push(podName);
                targetCount.textContent = '[ ' + selectedPods.length + ' ]';
                if (allSelected) {
                    selectAllBtn.textContent = 'Clear Selection';
                } else {
                    selectAllBtn.textContent = 'Select All Pods';
                }
            } else {
                selectAllBtn.textContent = 'Select All Pods';
                const podIndex = selectedPods.indexOf(podName);
                if (podIndex > -1) {
                    selectedPods.splice(podIndex, 1);
                }
                if (selectedPods.length === 0) {
                    targetCount.textContent = '[ Random ]';
                } else {
                    targetCount.textContent = '[ ' + selectedPods.length + ' ]';
                }
            }
            checkSelectedPodsLatencyState();
         })
    });
}

// Event listener for SelectAll Button
document.getElementById('selectAllBtn').addEventListener('click', () => {
    const podItems = document.querySelectorAll('.pod-item');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const targetCount = document.getElementById('podCount');

    // Check if all pods are currently selected
    const allSelected = podItems.length > 0 && Array.from(podItems).every(item => item.classList.contains('selected'));
    
    // Toggle selection based on the current state
    if (allSelected) {
        // Clear all selections
        podItems.forEach(item => {
            item.classList.remove('selected');
        });
        selectedPods.length = 0; // Clear the array
        selectAllBtn.textContent = 'Select All Pods';
        targetCount.textContent = '[ Random ]';
    } else {
        // Select all pods
        selectedPods.length = 0; // Clear the array first to prevent duplicates
        podItems.forEach(item => {
            item.classList.add('selected');
            const podName = item.querySelector('.pod-name').textContent;
            selectedPods.push(podName);
        });
        selectAllBtn.textContent = 'Clear Selection';
        targetCount.textContent = '[ ' + selectedPods.length + ' ]';
    }
});

// Main Function = Kill Random Pod
async function killPod(namespace) {
    fireLasers();
    const btn = document.getElementById('killBtn');
    btn.disabled = true;

    let currentKillSession = {
        results: [],
        deletionTime: new Date().toISOString()
    };
    
    if (!namespace) namespace = currentNamespace;

    addLogEntry(`Sending kill request for a pod in: ${namespace}`, 'kill');

    // Close any old stream first
    if (window.killStream) {
        window.killStream.close();
    }

    // Open a new event stream from backend
    const streamUrl = `/api/killpod?namespace=${namespace}&podNames=${encodeURIComponent(JSON.stringify(selectedPods))}`;
    const eventSource = new EventSource(streamUrl);
    window.killStream = eventSource;

    let operationCompleted = false;

    // Handle normal messages
    eventSource.onmessage = (event) => {
    let data;
    try {
        data = JSON.parse(event.data);
    } catch (parseError) {
        addLogEntry(`⚠️ Failed to parse JSON: ${event.data}`, 'error');
        return;
    }

    try {
        // Check for killed pods and update latency tracking
        if (data.type === 'kill' && data.message && data.message.includes('Pod killed:')) {
            const killedPodMatch = data.message.match(/Pod killed: (.+)/);
            if (killedPodMatch) {
                const killedPodName = killedPodMatch[1].trim();
                removeKilledPodFromLatencyTracking(killedPodName);
                updateLatencyButtonBasedOnGlobalState();
            }
        }

        // Refresh pods list when replacement pods are found
        if (data.type === 'replacement') {
            loadPods(currentNamespace);
        }
        
        // Refresh pods list during recovery monitoring
        if (data.type === 'recovery') {
            loadPods(currentNamespace);
        }

        // Track recovery data for chart updates
        if (data.type === 'done' && data.message && data.message.includes('recovered in')) {
            const recoveryMatch = data.message.match(/recovered in ([\d.]+)s/);
            
            if (recoveryMatch) {
                const podNameMatch = data.message.match(/✅ (.+?) recovered/);
                currentKillSession.results.push({
                    killedPodName: podNameMatch ? podNameMatch[1] : 'unknown',
                    replacementPodName: podNameMatch ? podNameMatch[1] : 'unknown',
                    recoveryTime: parseFloat(recoveryMatch[1])
                });
            }

            // Update session stats with collected data
            if (currentKillSession.results.length > 0) {
                updateSessionStats(currentKillSession);
                fetchReports();
            }

            // Reset for next operation
            currentKillSession = {
                results: [],
                deletionTime: new Date().toISOString()
            };
        }
        
        if (data.type === 'done') {
            operationCompleted = true;
            selectedPods = [];
            setTimeout(() => {
                loadPods(currentNamespace);
                btn.disabled = false;
                fetchReports();
                document.getElementById('selectAllBtn').textContent = 'Select All Pods';
                document.getElementById('podCount').textContent = '[ Random ]';
                updateLatencyButtonBasedOnSelection();
            }, 2000);
            
            if (!data.message) {
                console.log('KillPod operation completed successfully');
            }
        }
        
        if (data.message) {
            const logType = data.type || 'info';
            addLogEntry(`${data.message}`, logType);
        }
    } catch (processingError) {
        addLogEntry(`⚠️ Error processing event data: ${processingError.message}`, 'error');
        console.error('Event processing error:', processingError, 'Data:', data);
    }
};

    // Handle errors
    eventSource.onerror = (err) => {
        if (!operationCompleted) {
            addLogEntry("❌ KillPod stream error. Closing connection.", 'error');
        }
        eventSource.close();
    };
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

// Function to handle latency button switch
async function handleLatencyAction() {
    const lagBtn = document.getElementById('lagBtn');
    const lagInput = document.getElementById('latencyInput');
    
    // Check if a pod is selected from the `selectedPods` array.
    if (selectedPods.length === 0) {
        addLogEntry('Please select at least one pod to add/clear latency.', 'error');
        return;
    }

    if (!isLatencyActive) {
        // ADD LATENCY MODE
        const latencyMs = parseInt(lagInput.value) || 500; // Get value from input, default to 500ms
        
        if (latencyMs <= 0) {
            addLogEntry('Please enter a valid latency value greater than 0ms.', 'error');
            return;
        }

        lagBtn.disabled = true; // Disable during operation
        let successfulOperations = 0;
        
        for (const podName of selectedPods) {
            addLogEntry(`Attempting to set ${latencyMs}ms latency on pod: ${podName}`, 'info');
            try {
                await setLatencyOnPod(podName, currentNamespace, latencyMs);
                if (!currentLatencyPods.includes(podName)) {
                    currentLatencyPods.push(podName);
                }
                successfulOperations++;
            } catch (error) {
                addLogEntry(`Failed to set latency on ${podName}: ${error.message}`, 'error');
            }
        }
        
        // Switch to "Cut Lag" mode only if at least one operation succeeded
        if (successfulOperations > 0) {
            isLatencyActive = true;
            lagBtn.innerHTML = '<div>🐇</div>Cut Lag';
        }
        lagBtn.disabled = false;
        selectedPods = [];
        document.getElementById('podCount').textContent = '[ Random ]';
        document.getElementById('selectAllBtn').textContent = 'Select All Pods';
        
    } else {
        // CLEAR LATENCY MODE
        lagBtn.disabled = true; // Disable during operation
        let successfulClears = 0;
        
        for (const podName of selectedPods) {
            addLogEntry(`Attempting to clear latency from pod: ${podName}`, 'info');
            try {
                await clearLatencyOnPod(podName, currentNamespace);
                // Remove from tracking array
                const index = currentLatencyPods.indexOf(podName);
                if (index > -1) {
                    currentLatencyPods.splice(index, 1);
                }
                successfulClears++;
            } catch (error) {
                addLogEntry(`Failed to clear latency from ${podName}: ${error.message}`, 'error');
            }
        }
        
        // Always switch back to "Add Lag" mode after clearing (regardless of tracking array)
        // This ensures the button resets even if there are tracking inconsistencies
        isLatencyActive = false;
        lagBtn.innerHTML = '<div>🐢</div> Add Lag';
        lagBtn.disabled = false;
        selectedPods = [];
        document.getElementById('podCount').textContent = '[ Random ]';
        document.getElementById('selectAllBtn').textContent = 'Select All Pods';
        
        // If we cleared from pods that weren't in our tracking, clean up the array
        if (successfulClears > 0) {
            addLogEntry(`Successfully cleared latency from ${successfulClears} pod(s)`, 'done');
        }
    }
}

// Function to set latency
async function setLatencyOnPod(podName, namespace, latencyMs) {
  try {
    const response = await fetch('/api/latency/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ podName, namespace, latencyMs }),
    });

    const result = await response.json();
    if (response.ok) {
      console.log(result.message);
      addLogEntry(`Injected ${latencyMs}ms latency into pod: ${podName}`, 'info');
      
      // Add to tracking array if not already there
      if (!currentLatencyPods.includes(podName)) {
        currentLatencyPods.push(podName);
      }
      
      // Refresh the pods display to show "Lagging" status
      renderPods();
    } else {
      console.error(result.error);
      addLogEntry(`Failed to set latency for ${podName}: `, 'error');
      addLogEntry(`${result.error}`, 'error')
    }
  } catch (error) {
    console.error('Failed to set latency:', error);
  }
}

// Function to clear latency
async function clearLatencyOnPod(podName, namespace) {
  try {
    const response = await fetch('/api/latency/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ podName, namespace }),
    });

    const result = await response.json();
    if (response.ok) {
      console.log(result.message);
      addLogEntry(`Cleared latency from pod: ${podName}`, 'done');

      // Remove from tracking array
      const index = currentLatencyPods.indexOf(podName);
      if (index > -1) {
        currentLatencyPods.splice(index, 1);
      }
      
      // Refresh the pods display to remove "Lagging" status
      renderPods();
    } else {
      console.error(result.error);
      addLogEntry(`Failed to clear latency from ${podName}: ${result.error}`, 'error');
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to clear latency:', error);
    throw error;
  }
}

// function to reset latency state when pods change
function resetLatencyState() {
    isLatencyActive = false;
    currentLatencyPods = [];
    const lagBtn = document.getElementById('lagBtn');
    if (lagBtn) {
        lagBtn.innerHTML = '<div>🐢</div>Add Lag';
    }
}

// helper function to remove killed pods from latency tracking
function removeKilledPodFromLatencyTracking(killedPodName) {
    const index = currentLatencyPods.indexOf(killedPodName);
    if (index > -1) {
        currentLatencyPods.splice(index, 1);
        addLogEntry(`Removed ${killedPodName} from latency tracking (pod killed)`, 'info');
        
        // Immediately update button if no more lagging pods exist
        if (currentLatencyPods.length === 0 && isLatencyActive) {
            const lagBtn = document.getElementById('lagBtn');
            if (lagBtn) {
                isLatencyActive = false;
                lagBtn.innerHTML = '<div>🢔</div>Add Lag';
                addLogEntry('Reset to Add Lag - no more lagging pods', 'info');
            }
        }
    }

    // Remove from selectedPods if it was selected
    const selectedIndex = selectedPods.indexOf(killedPodName);
    if (selectedIndex > -1) {
        selectedPods.splice(selectedIndex, 1);
        addLogEntry(`Removed ${killedPodName} from selected pods (pod killed)`, 'info');
        
        // Update the UI to reflect the removed selection
        selectedPods = [];
        document.getElementById('podCount').textContent = '[ Random ]';
        document.getElementById('selectAllBtn').textContent = 'Select All Pods';
    }
    
    // Refresh pods display and update button state
    setTimeout(() => {
        renderPods();
    }, 100);
    
    return index > -1;
}

// Helper function to check if any currently selected pods have latency
function checkSelectedPodsLatencyState() {
    const lagBtn = document.getElementById('lagBtn');
    
    if (!lagBtn) return;
    
    // Check if any of the currently selected pods have latency
    const selectedPodsWithLatency = selectedPods.filter(pod => 
        currentLatencyPods.includes(pod)
    );
    
    // If no selected pods have latency, switch to "Add Lag" mode
    if (selectedPodsWithLatency.length === 0 && isLatencyActive) {
        isLatencyActive = false;
        lagBtn.innerHTML = '<div>🐢</div>Add Lag';
        addLogEntry('Latency button reset - no selected pods have latency', 'info');
    }
    // If some selected pods have latency, switch to "Cut Lag" mode  
    else if (selectedPodsWithLatency.length > 0 && !isLatencyActive) {
        isLatencyActive = true;
        lagBtn.innerHTML = '<div>🐇</div>Cut Lag';
        addLogEntry('Latency button set to Cut Lag - selected pods have latency', 'info');
    }
}

// helper function to update latency button based on current selection
function updateLatencyButtonBasedOnSelection() {
    const lagBtn = document.getElementById('lagBtn');
    if (!lagBtn) return;
    
    // Check if any selected pods have latency
    const selectedPodsWithLatency = selectedPods.filter(pod => 
        currentLatencyPods.includes(pod)
    );
    
    if (selectedPodsWithLatency.length > 0) {
        // Some selected pods have latency - show "Cut Lag"
        if (!isLatencyActive) {
            isLatencyActive = true;
            lagBtn.innerHTML = '<div>🐇</div>Cut Lag';
        }
    } else {
        // No selected pods have latency - show "Add Lag"
        if (isLatencyActive) {
            isLatencyActive = false;
            lagBtn.innerHTML = '<div>🐢</div>Add Lag';
        }
    }
}

// Helper function for timing
function updateLatencyButtonBasedOnGlobalState() {
    const lagBtn = document.getElementById('lagBtn');
    if (!lagBtn) return;
    
    // If any pods globally have latency, and none are selected, reset to "Add Lag"
    if (currentLatencyPods.length === 0) {
        if (isLatencyActive) {
            isLatencyActive = false;
            lagBtn.innerHTML = '<div>🢔</div>Add Lag';
            console.log('Reset to Add Lag - no pods have latency globally');
        }
    }
}