# Deployment Guide

## 🚀 Quick Start

### Step 1: Build and Push Docker Image

```bash
cd k8s-endpoint-watcher

# Login to Docker Hub (if not already logged in)
docker login

# Build and push the image
./build-and-push.sh

# Or manually:
docker build -t arpitkhendawat/k8s-endpoint-watcher:latest .
docker push arpitkhendawat/k8s-endpoint-watcher:latest
```

### Step 2: Configure for Your Service

Edit `k8s/configmap.yaml`:

```yaml
data:
  SERVICE_NAME: "your-service-name"      # ← Change this
  NAMESPACE: "your-namespace"            # ← Change this
  APP_ROOT: "your-app-root"              # ← Change this
  CHECK_INTERVAL: "5"
  HTTP_TIMEOUT: "5000"
  LOG_LEVEL: "info"
```

**Important:** Update the namespace in all YAML files:

```bash
# Replace 'default' with your namespace
sed -i '' 's/namespace: default/namespace: production/g' k8s/*.yaml
```

### Step 3: Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/serviceaccount.yaml
kubectl apply -f k8s/rbac.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml

# Or apply all at once
kubectl apply -f k8s/
```

### Step 4: View Logs

```bash
# Follow logs in real-time
kubectl logs -f deployment/endpoint-watcher -n production

# View last 100 lines
kubectl logs deployment/endpoint-watcher -n production --tail=100

# View logs with timestamps
kubectl logs deployment/endpoint-watcher -n production --timestamps
```

## 🔍 Verification

### Check if pod is running
```bash
kubectl get pods -l app=endpoint-watcher -n production
```

### Check pod details
```bash
kubectl describe pod -l app=endpoint-watcher -n production
```

### Check RBAC permissions
```bash
kubectl get clusterrole endpoint-watcher
kubectl get clusterrolebinding endpoint-watcher
```

### Verify EndpointSlices exist
```bash
# List all EndpointSlices in namespace
kubectl get endpointslices -n production

# Filter by service name
kubectl get endpointslices -n production -l kubernetes.io/service-name=your-service-name

# Show labels
kubectl get endpointslices -n production --show-labels
```

## 🛠️ Customization

### Use Your Own Docker Registry

```bash
# Build with custom image name
docker build -t your-registry.com/k8s-endpoint-watcher:v1.0.0 .
docker push your-registry.com/k8s-endpoint-watcher:v1.0.0

# Update deployment.yaml
# Change: image: arpitkhendawat/k8s-endpoint-watcher:latest
# To:     image: your-registry.com/k8s-endpoint-watcher:v1.0.0
```

### Push to AWS ECR

```bash
# Login to ECR
aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws/your-alias

# Build and tag
docker build -t k8s-endpoint-watcher .
docker tag k8s-endpoint-watcher:latest public.ecr.aws/your-alias/k8s-endpoint-watcher:latest

# Push
docker push public.ecr.aws/your-alias/k8s-endpoint-watcher:latest

# Update deployment.yaml with ECR image
```

### Adjust Resource Limits

Edit `k8s/deployment.yaml`:

```yaml
resources:
  requests:
    memory: "64Mi"    # Minimum memory
    cpu: "50m"        # Minimum CPU
  limits:
    memory: "128Mi"   # Maximum memory
    cpu: "200m"       # Maximum CPU
```

### Change Check Interval

Edit `k8s/configmap.yaml`:

```yaml
data:
  CHECK_INTERVAL: "10"    # Check every 10 seconds instead of 5
  HTTP_TIMEOUT: "10000"   # 10 second timeout
```

Then restart the pod:
```bash
kubectl rollout restart deployment/endpoint-watcher -n production
```

## 🧹 Cleanup

```bash
# Delete all resources
kubectl delete -f k8s/

# Or delete individually
kubectl delete deployment endpoint-watcher -n production
kubectl delete configmap endpoint-watcher-config -n production
kubectl delete serviceaccount endpoint-watcher -n production
kubectl delete clusterrolebinding endpoint-watcher
kubectl delete clusterrole endpoint-watcher
```

## 📊 Monitoring Multiple Services

To monitor multiple services, deploy multiple instances with different ConfigMaps:

```bash
# Copy and modify for second service
cp k8s/configmap.yaml k8s/configmap-service2.yaml
cp k8s/deployment.yaml k8s/deployment-service2.yaml

# Edit configmap-service2.yaml with different service details
# Edit deployment-service2.yaml:
#   - Change name to: endpoint-watcher-service2
#   - Change configMapRef to: endpoint-watcher-config-service2

# Deploy
kubectl apply -f k8s/configmap-service2.yaml
kubectl apply -f k8s/deployment-service2.yaml
```

## 🐛 Debugging

### Pod crashes or restarts
```bash
# Check pod events
kubectl describe pod -l app=endpoint-watcher -n production

# Check previous logs (if pod restarted)
kubectl logs deployment/endpoint-watcher -n production --previous
```

### Permission denied errors
```bash
# Verify ServiceAccount is attached
kubectl get pod -l app=endpoint-watcher -n production -o yaml | grep serviceAccountName

# Check if token is mounted
kubectl exec -it deployment/endpoint-watcher -n production -- ls -la /var/run/secrets/kubernetes.io/serviceaccount/
```

### Cannot connect to Kubernetes API
```bash
# Check if Kubernetes API is accessible from pod
kubectl exec -it deployment/endpoint-watcher -n production -- env | grep KUBERNETES

# Test API connectivity
kubectl exec -it deployment/endpoint-watcher -n production -- curl -k https://kubernetes.default.svc/api/v1/
```

## 📝 Notes

- The watcher uses **ClusterRole** to watch EndpointSlices across namespaces
- If you only need namespace-scoped permissions, change ClusterRole to Role and ClusterRoleBinding to RoleBinding
- The image runs as non-root user (UID 1000) for security
- Health checks are performed via service DNS name (not direct pod IPs)

