# K8s Endpoint Watcher - Deployment Steps

## 📋 Prerequisites

1. **Kubernetes Cluster**: Running cluster (Minikube, EKS, GKE, AKS, etc.)
2. **kubectl**: Installed and configured to access your cluster
3. **Target Service**: The service you want to monitor must already be deployed

## 🚀 Deployment Steps

### Step 1: Verify Cluster Access

```bash
# Check if kubectl is connected to your cluster
kubectl cluster-info

# Verify you can access the cluster
kubectl get nodes
```

### Step 2: Find Your Target Service

```bash
# List all services across all namespaces
kubectl get services --all-namespaces

# Or list services in a specific namespace
kubectl get services -n <your-namespace>
```

**Example output:**
```
NAMESPACE     NAME           TYPE        CLUSTER-IP      PORT(S)
production    my-app         ClusterIP   10.96.100.50    8080/TCP
production    my-api         ClusterIP   10.96.100.51    3000/TCP
```

### Step 3: Configure the Watcher

Edit `k8s/configmap.yaml` with your service details:

```yaml
data:
  # REQUIRED: Name of the service to watch
  SERVICE_NAME: "my-app"
  
  # REQUIRED: Namespace where the service is located
  NAMESPACE: "production"
  
  # REQUIRED: Application root path for health checks
  # The watcher will call: http://<service>.<namespace>.svc.cluster.local/<APP_ROOT>/api/p/health
  APP_ROOT: "myapp"
  
  # OPTIONAL: How often to check health (in seconds)
  CHECK_INTERVAL: "5"
  
  # OPTIONAL: HTTP request timeout (in milliseconds)
  HTTP_TIMEOUT: "5000"
  
  # OPTIONAL: Log level (debug, info, warn, error)
  LOG_LEVEL: "info"
```

**Important:** The health check URL will be:
```
http://<SERVICE_NAME>.<NAMESPACE>.svc.cluster.local/<APP_ROOT>/api/p/health
```

For example, with the above config:
```
http://my-app.production.svc.cluster.local/myapp/api/p/health
```

### Step 4: Deploy to Kubernetes

Execute the following commands **in order**:

```bash
# 1. Create the ServiceAccount
kubectl apply -f k8s/serviceaccount.yaml

# 2. Create RBAC permissions (ClusterRole and ClusterRoleBinding)
kubectl apply -f k8s/rbac.yaml

# 3. Create the ConfigMap with your configuration
kubectl apply -f k8s/configmap.yaml

# 4. Deploy the watcher application
kubectl apply -f k8s/deployment.yaml
```

**Or deploy all at once:**
```bash
kubectl apply -f k8s/
```

### Step 5: Verify Deployment

```bash
# Check if the pod is running
kubectl get pods -l app=endpoint-watcher

# Expected output:
# NAME                                READY   STATUS    RESTARTS   AGE
# endpoint-watcher-xxxxxxxxxx-xxxxx   1/1     Running   0          30s
```

### Step 6: View Logs

```bash
# View real-time logs
kubectl logs -l app=endpoint-watcher -f

# View last 50 lines
kubectl logs -l app=endpoint-watcher --tail=50
```

**Expected log output:**
```
[2026-02-04T11:24:35.107Z] INFO : 🚀 Starting K8s Endpoint Watcher
[2026-02-04T11:24:35.107Z] INFO : 📋 Configuration:
[2026-02-04T11:24:35.107Z] INFO :   Service: my-app
[2026-02-04T11:24:35.107Z] INFO :   Namespace: production
[2026-02-04T11:24:35.108Z] INFO :   App Root: myapp
[2026-02-04T11:24:36.500Z] INFO : ✅ Initial endpoints discovered: 2 ready
[2026-02-04T11:24:36.516Z] INFO :   • 10.244.0.10:8080 → pod: my-app-xxx (node: node-1)
[2026-02-04T11:24:36.516Z] INFO :   • 10.244.0.11:8080 → pod: my-app-yyy (node: node-2)
```

## 🔧 Troubleshooting

### Pod is not starting

```bash
# Check pod status
kubectl describe pod -l app=endpoint-watcher

# Common issues:
# - ImagePullBackOff: Image not available (check if GitHub Actions build completed)
# - CrashLoopBackOff: Check logs for errors
```

### Permission Errors

```bash
# Verify RBAC is created
kubectl get clusterrole endpoint-watcher
kubectl get clusterrolebinding endpoint-watcher

# If missing, reapply:
kubectl apply -f k8s/rbac.yaml
```

### Configuration Errors

```bash
# Check if ConfigMap exists
kubectl get configmap endpoint-watcher-config

# View ConfigMap contents
kubectl describe configmap endpoint-watcher-config

# Update configuration
kubectl edit configmap endpoint-watcher-config

# Restart the pod to pick up changes
kubectl rollout restart deployment endpoint-watcher
```

## 🔄 Updating the Watcher

### Update Configuration

```bash
# Edit the ConfigMap
kubectl edit configmap endpoint-watcher-config

# Restart the deployment to apply changes
kubectl rollout restart deployment endpoint-watcher
```

### Update to New Image Version

```bash
# If a new image is pushed to GitHub Container Registry
kubectl rollout restart deployment endpoint-watcher

# Or update the image manually
kubectl set image deployment/endpoint-watcher watcher=ghcr.io/arpitkhendawat/k8s-endpoint-watcher:v1.1.0
```

## 🗑️ Uninstalling

```bash
# Remove all resources
kubectl delete -f k8s/

# Or remove individually
kubectl delete deployment endpoint-watcher
kubectl delete configmap endpoint-watcher-config
kubectl delete serviceaccount endpoint-watcher
kubectl delete clusterrolebinding endpoint-watcher
kubectl delete clusterrole endpoint-watcher
```

## 📊 Monitoring

### Watch for Endpoint Changes

The watcher will automatically log when endpoints are added or removed:

```
[2026-02-04T11:30:15.123Z] INFO : 🔄 EndpointSlice MODIFIED
[2026-02-04T11:30:15.124Z] INFO :   ➕ ADDED: 10.244.0.12:8080 → pod: my-app-zzz (node: node-3) [✅ READY]
[2026-02-04T11:30:15.125Z] INFO :   📊 Ready endpoints: 3
```

### Health Check Results

```
[2026-02-04T11:30:20.456Z] INFO : 🔗 HTTP Health Check
[2026-02-04T11:30:20.457Z] INFO :   ✅ SUCCESS - 45ms - Status: 200
```

## 🎯 Quick Reference

| Command | Description |
|---------|-------------|
| `kubectl apply -f k8s/` | Deploy all resources |
| `kubectl get pods -l app=endpoint-watcher` | Check pod status |
| `kubectl logs -l app=endpoint-watcher -f` | View live logs |
| `kubectl rollout restart deployment endpoint-watcher` | Restart the watcher |
| `kubectl delete -f k8s/` | Remove all resources |

