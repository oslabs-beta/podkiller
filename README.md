# PodKiller

A chaos engineering dashboard for Kubernetes that provides a TIE Fighter-themed interface for killing pods and monitoring cluster resilience. Built with Express.js backend and vanilla JavaScript frontend.

## Features

### Core Functionality
- **Pod Termination**: Kill specific pods or random pods within selected namespaces
- **Minikube Management**: Start and stop Minikube clusters directly from the interface
- **Namespace Selection**: Browse and select from available Kubernetes namespaces
- **Real-time Monitoring**: Watch pod status changes and recovery times
- **Latency Injection**: Add network latency to selected pods for chaos testing

### Dashboard Components
- **Activity Log**: Real-time logging of all operations and status changes
- **Pod Grid**: Visual representation of pods with status indicators (Running, Pending, Terminating)
- **Recovery Analytics**: Chart showing pod recovery times over time
- **Session Statistics**: Track pods killed, average recovery time, and failed recoveries

### Demo App
- **Chaos Clock**: Counter app that shuts down when a pod is killed - refer to demo-app folder for more details

## Prerequisites

- Node.js (v14 or higher)
- Minikube installed and configured
- kubectl configured to work with your Minikube cluster

## Installation

1. Fork and Clone the repository:
```bash
git clone <https://github.com/oslabs-beta/podkiller>
cd podkiller
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser to `http://localhost:3000`

## Usage

### Getting Started
1. **Start Minikube**: Click the connection status button to start Minikube if not already running
2. **Select Namespace**: Choose a namespace from the dropdown menu
3. **View Pods**: Pods in the selected namespace will appear in the grid

### Killing Pods
- **Random Kill**: Click "Kill Pod" without selecting any pods to kill a random pod
- **Specific Kill**: Select one or more pods by clicking on them, then click "Kill Pod"
- **Select All**: Use "Select All Pods" to select/deselect all visible pods

### Adding Latency
1. Select one or more pods
2. Set the desired latency in milliseconds (default: 500ms)
3. Click "Add Lag" to inject network latency
4. As the app continues making requests through the delayed network, the average keeps climbing
5. Eventually it may timeout completely and go offline

### Monitoring
- **Activity Log**: View real-time logs of all operations
- **Recovery Chart**: Monitor pod recovery times over multiple chaos events
- **Statistics Panel**: Track session metrics and reset counters

## API Endpoints

### Cluster Management
- `GET /api/status` - Check Minikube connection status
- `POST /api/minikube/start` - Start Minikube cluster
- `POST /api/minikube/stop` - Stop Minikube cluster

### Kubernetes Operations
- `GET /api/namespaces` - List available namespaces
- `GET /api/pods?namespace=<name>` - List pods in specified namespace
- `GET /api/killpod?namespace=<name>&podNames=<array>` - Kill specified pods (Server-Sent Events)

### Chaos Engineering
- `POST /api/latency/set` - Inject latency into pod
- `POST /api/latency/clear` - Remove latency from pod

### Reporting
- `GET /api/reports` - Retrieve chaos engineering reports
- `POST /api/reports` - Save new chaos engineering report

## Key Components

### Frontend Modules
- **app.js**: Main application state, UI interactions, and API communication
- **chart.js**: Chart.js integration for recovery time visualization and session statistics
- **canvas.js**: Animated starfield background and laser beam effects

### Backend Modules
- **server.js**: Express server with Kubernetes API integration
- **killpod.js**: Core pod termination logic with recovery monitoring
- **latency.js**: Network latency injection functionality

## Configuration

The application uses Minikube's default configuration. Ensure your kubectl context is set to the Minikube cluster you want to manage.

## Safety Features

- Connection status monitoring prevents operations when cluster is unavailable
- Operation locks prevent concurrent Minikube start/stop operations
- Automatic cleanup of terminated pods and failed operations
- Comprehensive error handling and user feedback

## Monitoring and Analytics

The dashboard automatically tracks:
- Recovery times for each killed pod
- Session statistics (pods killed, average recovery time, failures)
- Historical data stored in JSON reports
- Real-time pod status updates via Server-Sent Events

## Troubleshooting

### Common Issues
1. **Minikube won't start**: Ensure Minikube is properly installed and has sufficient resources
2. **No pods visible**: Check that the selected namespace contains running pods
3. **Connection issues**: Verify kubectl can communicate with your cluster
4. **Permission errors**: Ensure proper RBAC permissions for pod deletion

### Logs
Check the browser console and server logs for detailed error information. The activity log in the dashboard shows real-time operation status.

## Contributing

This is a chaos engineering tool designed for testing and learning. Use responsibly in development and testing environments only.

## Warning

This tool is designed for chaos engineering and testing purposes. Do not use in production environments without proper safeguards and understanding of the potential impact.