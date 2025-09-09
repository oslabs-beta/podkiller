import { addLogEntry } from './app.js'

// Current Session Stats Tracker
let chart = null;
let sessionStats = {
    podsKilled: 0,
    totalRecoveryTime: 0,
    recoveryTimes: [],
    failedRecoveries: 0
};

// Function to update session statistics
export function updateSessionStats(recoveryTime) {
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
export function getAverageRecoveryTime() {
    if (sessionStats.recoveryTimes.length === 0) {
        return 0;
    }
    return sessionStats.totalRecoveryTime / sessionStats.recoveryTimes.length;
}

// Function to render statistics in the UI
export function renderStatistics() {
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
export function resetSessionStats() {
    sessionStats = {
        podsKilled: 0,
        totalRecoveryTime: 0,
        recoveryTimes: [],
        failedRecoveries: 0
    };
    renderStatistics();
    addLogEntry('Session statistics reset', 'error');
}

// Initialize Recovery Chart
export function initializeChart() {
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
export async function fetchReports() {
    try {
        addLogEntry('Compiling recovery analytics...', 'info');
        const response = await fetch('http://localhost:3000/api/reports');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.reports || data.reports.length === 0) {
            addLogEntry('No recovery data found', 'error');
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