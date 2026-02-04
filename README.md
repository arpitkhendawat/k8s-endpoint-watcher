# Kubernetes EndpointSlice Watcher

A lightweight debugging tool that watches Kubernetes EndpointSlice API for pod changes and performs HTTP health checks to monitor service connectivity.

## 🎯 Purpose

This tool helps debug connectivity issues by:
- Watching real-time pod changes (additions, removals, movements)
- Performing periodic HTTP health checks via service endpoint
- Logging timeout events with detailed context
- Correlating pod changes with connectivity issues

## 🚀 Features

- ✅ Real-time EndpointSlice monitoring using Kubernetes Watch API
- ✅ HTTP health checks every 5 seconds
- ✅ Immediate health check triggered on endpoint changes
- ✅ Detailed logging with timestamps, pod names, nodes, and IPs
- ✅ Timeout detection and tracking
- ✅ Auto-reconnect on connection failures
- ✅ Minimal resource footprint (Deno-based)

## 📋 Prerequisites

- Kubernetes cluster (v1.21+)
- `kubectl` configured with cluster access
- Service to monitor must exist in the cluster

## 🔧 Configuration

Edit `k8s/configmap.yaml` with your service details:

```yaml
data:
  SERVICE_NAME: "my-app-service"    # Your service name
  NAMESPACE: "production"           # Namespace where service exists
  APP_ROOT: "myapp"                 # Application root path
  CHECK_INTERVAL: "5"               # Health check interval (seconds)
  HTTP_TIMEOUT: "5000"              # HTTP timeout (milliseconds)
  LOG_LEVEL: "info"                 # Log level (debug/info/warn/error)
```

**Health Check URL Format:**
```
http://{SERVICE_NAME}.{NAMESPACE}.svc.cluster.local/{APP_ROOT}/api/p/health
```

Example: `http://my-app-service.production.svc.cluster.local/myapp/api/p/health`

## 📦 Installation

### Step 1: Update Configuration

Edit the namespace in all YAML files (default is `default`):
```bash
# Update namespace in all files
sed -i 's/namespace: default/namespace: YOUR_NAMESPACE/g' k8s/*.yaml
```

Edit `k8s/configmap.yaml` with your service details.

### Step 2: Apply Kubernetes Manifests

```bash
# Create ServiceAccount
kubectl apply -f k8s/serviceaccount.yaml

# Create RBAC (ClusterRole + ClusterRoleBinding)
kubectl apply -f k8s/rbac.yaml

# Create ConfigMap
kubectl apply -f k8s/configmap.yaml

# Deploy the watcher
kubectl apply -f k8s/deployment.yaml
```

### Step 3: View Logs

```bash
# Follow logs
kubectl logs -f deployment/endpoint-watcher -n YOUR_NAMESPACE

# View recent logs
kubectl logs deployment/endpoint-watcher -n YOUR_NAMESPACE --tail=100
```

## 📊 Sample Output

```
[2026-02-04T10:15:23.456Z] INFO : 🚀 Starting K8s Endpoint Watcher
[2026-02-04T10:15:23.457Z] INFO : 📋 Configuration:
[2026-02-04T10:15:23.457Z] INFO :   Service: my-app-service
[2026-02-04T10:15:23.457Z] INFO :   Namespace: production
[2026-02-04T10:15:23.457Z] INFO :   App Root: myapp
[2026-02-04T10:15:23.457Z] INFO :   Check Interval: 5s
[2026-02-04T10:15:23.457Z] INFO :   HTTP Timeout: 5000ms
[2026-02-04T10:15:23.457Z] INFO : 
[2026-02-04T10:15:23.789Z] INFO : 🏥 Health Check URL: http://my-app-service.production.svc.cluster.local/myapp/api/p/health
[2026-02-04T10:15:23.790Z] INFO : 
[2026-02-04T10:15:23.890Z] INFO : 🔍 Watching EndpointSlices for service: my-app-service in namespace: production
[2026-02-04T10:15:24.100Z] INFO : ✅ Initial endpoints discovered: 3 ready
[2026-02-04T10:15:24.100Z] INFO :   • 10.244.1.5:8080 → pod: my-app-7d8f9-abc12 (node: worker-1)
[2026-02-04T10:15:24.100Z] INFO :   • 10.244.2.8:8080 → pod: my-app-7d8f9-def34 (node: worker-2)
[2026-02-04T10:15:24.100Z] INFO :   • 10.244.3.2:8080 → pod: my-app-7d8f9-ghi56 (node: worker-3)
[2026-02-04T10:15:24.100Z] INFO : 
[2026-02-04T10:15:24.200Z] INFO : 🔗 Initial HTTP Health Check
[2026-02-04T10:15:24.245Z] INFO :   ✅ SUCCESS - 45ms - Status: 200
[2026-02-04T10:15:24.245Z] INFO : 
[2026-02-04T10:15:29.300Z] INFO : 🔗 HTTP Health Check
[2026-02-04T10:15:29.352Z] INFO :   ✅ SUCCESS - 52ms - Status: 200
[2026-02-04T10:16:45.400Z] INFO : 🔄 EndpointSlice MODIFIED
[2026-02-04T10:16:45.400Z] INFO :   ➕ ADDED: 10.244.4.9:8080 → pod: my-app-7d8f9-jkl78 (node: worker-4) [✅ READY]
[2026-02-04T10:16:45.400Z] INFO :   ➖ REMOVED: 10.244.1.5:8080 → pod: my-app-7d8f9-abc12 (node: worker-1)
[2026-02-04T10:16:45.400Z] INFO :   📊 Ready endpoints: 3
[2026-02-04T10:16:45.400Z] INFO : 
[2026-02-04T10:16:45.450Z] INFO : 🔗 HTTP Health Check (triggered by endpoint change)
[2026-02-04T10:16:45.488Z] INFO :   ✅ SUCCESS - 38ms - Status: 200
[2026-02-04T10:16:45.488Z] INFO : 
[2026-02-04T10:17:15.500Z] WARN : 🔗 HTTP Health Check
[2026-02-04T10:17:20.500Z] WARN :   ❌ FAILED - TIMEOUT after 5000ms
[2026-02-04T10:17:20.500Z] WARN :   📊 Active endpoints: 3 ready, 0 not-ready
```

## 🐳 Docker Image

### Pre-built Image (Docker Hub)
```bash
docker pull arpitkhendawat/k8s-endpoint-watcher:latest
```

### Build Your Own

**Option 1: GitHub Actions (Recommended - No Docker needed!)**
- See [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md) for automated builds
- Push code to GitHub and image builds automatically
- Free and fully automated

**Option 2: Local Docker**
```bash
cd k8s-endpoint-watcher
docker build -t your-registry/k8s-endpoint-watcher:latest .
docker push your-registry/k8s-endpoint-watcher:latest
```

**Option 3: Other Build Methods**
- See [BUILD_OPTIONS.md](BUILD_OPTIONS.md) for more options:
  - Google Cloud Build
  - GitLab CI/CD
  - Cloud VMs
  - Podman
  - And more!

Update `k8s/deployment.yaml` with your image name.

## 🔍 Troubleshooting

### Pod not starting
```bash
kubectl describe pod -l app=endpoint-watcher -n YOUR_NAMESPACE
kubectl logs -l app=endpoint-watcher -n YOUR_NAMESPACE
```

### RBAC permission errors
Ensure ClusterRole and ClusterRoleBinding are applied:
```bash
kubectl get clusterrole endpoint-watcher
kubectl get clusterrolebinding endpoint-watcher
```

### No endpoints discovered
- Verify service exists: `kubectl get svc SERVICE_NAME -n NAMESPACE`
- Check EndpointSlices: `kubectl get endpointslices -n NAMESPACE -l kubernetes.io/service-name=SERVICE_NAME`
- Verify label exists: `kubectl get endpointslices -n NAMESPACE --show-labels`

### Health check always fails
- Verify health endpoint exists: `kubectl exec -it POD_NAME -n NAMESPACE -- curl http://localhost:PORT/APP_ROOT/api/p/health`
- Check service DNS: `kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup SERVICE_NAME.NAMESPACE.svc.cluster.local`

## 🛠️ Development

### Local Testing (Outside Cluster)
```bash
# Set environment variables
export SERVICE_NAME="my-app-service"
export NAMESPACE="production"
export APP_ROOT="myapp"

# Run with Deno
deno run --allow-net --allow-env --allow-read src/main.ts
```

Note: Running outside cluster requires kubeconfig and won't have service account token.

## 📝 License

MIT License - Feel free to use and modify for your debugging needs.

## 🤝 Contributing

This is a debugging tool. Feel free to fork and customize for your specific use case.

