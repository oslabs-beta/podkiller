# Chaos Demo App

A demo application designed to showcase the visual impact of chaos engineering with PodKiller. 
Features live counters, real-time metrics, and dramatic failure states.

## Quick Start

### Prerequisites
- Minikube running
- Docker configured with Minikube's daemon
- kubectl configured

### Build and Deploy

1. **Navigate to the demo app directory:**
```bash
cd demo-app
```

2. **Configure Docker to use Minikube's daemon:**
```bash
eval $(minikube docker-env)
```

3. **Build the Docker image:**
```bash
docker build -t chaos-demo-app:latest .
```

4. **Deploy to Kubernetes:**
```bash
kubectl apply -f deployment.yaml
```

5. **Get the service URL:**
```bash
minikube service chaos-demo-service --url
```

6. **Open the URL in your browser to see the live demo**

### What You'll See

- **Live Counter**: Increments every second, stops when pod dies
- **Real-time Metrics**: Uptime, requests, CPU usage, current time
- **Network Latency Display**: Shows round-trip response times (changes color when latency increases)
- **Pod Failure Counter**: Tracks chaos engineering events
- **Cyberpunk Styling**: Matrix rain, glitch effects, scan lines
- **Dramatic Failure State**: Red background and alerts when pod terminates

### Testing with PodKiller

**Pod Killing:**
1. Open the demo app in your browser
2. Note the live counters and metrics updating
3. Use PodKiller to kill the chaos-demo-app pod
4. Watch the app dramatically fail with visual effects
5. The counters will freeze and the background turns red

**Latency Injection:**
1. Select the chaos-demo-app pod in PodKiller
2. Set latency to 1000ms or higher for dramatic effect
3. Watch the "Network Latency" metric climb and change color
4. The app may eventually go offline if latency is too high
5. Use PodKiller to clear latency and watch recovery

### Rebuilding After Changes

If you modify the demo app code:

```bash
# Ensure you're in Minikube's Docker environment
eval $(minikube docker-env)

# Delete old deployment
kubectl delete deployment chaos-demo-app

# Remove old images to avoid caching
docker rmi chaos-demo-app:v1  # or whatever version you used

# Build with new version tag
docker build -t chaos-demo-app:v2 . --no-cache

# Update deployment.yaml to use new version (change v1 to v2)
# Then redeploy
kubectl apply -f deployment.yaml
```

### Scaling

To adjust the number of replicas:
```bash
kubectl scale deployment chaos-demo-app --replicas=2
```

### Cleanup

To remove the demo app:
```bash
kubectl delete -f deployment.yaml
```

### Troubleshooting

**Pod not starting / ErrImageNeverPull:**
- Ensure you ran `eval $(minikube docker-env)` before building
- Rebuild with a new version tag `docker build -t chaos-demo-app:v5 .`
- Use versioned tags (v1, v2, v3) instead of `latest`
- Update the deployment: Change the image field in your deployment.yaml file to use the new version tag
- Redeploy: `kubectl apply -f deployment.yaml`
- Kubernetes will recognize the new tag and pull the image from its local cache, successfully starting the pod.
- Check: `kubectl get pods`
- View logs: `kubectl logs deployment/chaos-demo-app`

**Service not accessible:**
- Verify service: `kubectl get svc`
- Check port mapping in deployment.yaml
- Ensure pod is Ready: `kubectl get pods`

**Old styling showing / Changes not reflected:**
- Force rebuild with `--no-cache` flag
- Use a new version tag (v2, v3, etc.)
- Clear browser cache or use incognito mode
- Verify correct image is deployed: `kubectl describe pod <pod-name>`

**Latency injection fails:**
- Pod needs NET_ADMIN capability (already in deployment.yaml)
- Verify tc command exists: `kubectl exec <pod-name> -- which tc`
- Should return `/usr/sbin/tc`

**"latest" tag caching issues:**
- Always use versioned tags (v1, v2, v3) to avoid Docker/Kubernetes caching
- Update deployment.yaml with new version after each rebuild
- Use `imagePullPolicy: Never` to ensure local images are used

### Common Pitfalls

1. **Wrong Docker Environment**: Always run `eval $(minikube docker-env)` before building
2. **Image Caching**: Use versioned tags and update deployment.yaml accordingly  
3. **Service Port Mismatch**: Ensure service targetPort matches container port (8080)
4. **Permission Issues**: The pod runs as root to allow tc command for latency injection

### Files

- `demo-app.js` - Main application server with cyberpunk styling
- `package.json` - Node.js dependencies  
- `Dockerfile` - Ubuntu-based container with iproute2 for latency injection
- `deployment.yaml` - Kubernetes deployment and service with NET_ADMIN capabilities