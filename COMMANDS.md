# Quick Command Reference

## 🚀 Deployment Commands (Execute in Order)

### 1. Configure Your Service
```bash
# Edit k8s/configmap.yaml and set:
# - SERVICE_NAME: your service name
# - NAMESPACE: your service namespace  
# - APP_ROOT: your app root path
```

### 2. Deploy to Kubernetes
```bash
# Deploy all resources at once
kubectl apply -f k8s/

# OR deploy step-by-step:
kubectl apply -f k8s/serviceaccount.yaml
kubectl apply -f k8s/rbac.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
```

### 3. Verify Deployment
```bash
# Check pod status
kubectl get pods -l app=endpoint-watcher

# View logs
kubectl logs -l app=endpoint-watcher -f
```

## 📊 Monitoring Commands

```bash
# View real-time logs
kubectl logs -l app=endpoint-watcher -f

# View last 100 lines
kubectl logs -l app=endpoint-watcher --tail=100

# Check pod details
kubectl describe pod -l app=endpoint-watcher

# Check deployment status
kubectl get deployment endpoint-watcher
```

## 🔧 Management Commands

```bash
# Restart the watcher (after config changes)
kubectl rollout restart deployment endpoint-watcher

# Scale replicas (usually keep at 1)
kubectl scale deployment endpoint-watcher --replicas=1

# Update configuration
kubectl edit configmap endpoint-watcher-config

# Delete and redeploy
kubectl delete -f k8s/
kubectl apply -f k8s/
```

## 🗑️ Cleanup Commands

```bash
# Remove all resources
kubectl delete -f k8s/

# OR remove individually:
kubectl delete deployment endpoint-watcher
kubectl delete configmap endpoint-watcher-config
kubectl delete serviceaccount endpoint-watcher
kubectl delete clusterrolebinding endpoint-watcher
kubectl delete clusterrole endpoint-watcher
```

## 🔍 Troubleshooting Commands

```bash
# Check if service exists
kubectl get service <SERVICE_NAME> -n <NAMESPACE>

# Check endpoints for your service
kubectl get endpoints <SERVICE_NAME> -n <NAMESPACE>

# Check endpointslices
kubectl get endpointslices -n <NAMESPACE>

# View all events
kubectl get events --sort-by='.lastTimestamp' -n default

# Check RBAC permissions
kubectl get clusterrole endpoint-watcher
kubectl get clusterrolebinding endpoint-watcher

# Check if image is accessible
kubectl describe pod -l app=endpoint-watcher | grep -A 5 "Events:"
```

## 📦 Local Development (Minikube)

```bash
# Build and load image into Minikube
podman build -t ghcr.io/arpitkhendawat/k8s-endpoint-watcher:latest .
podman save ghcr.io/arpitkhendawat/k8s-endpoint-watcher:latest | minikube image load -

# Update deployment to use local image
# Change imagePullPolicy to "Never" in k8s/deployment.yaml
kubectl apply -f k8s/deployment.yaml
kubectl rollout restart deployment endpoint-watcher
```

