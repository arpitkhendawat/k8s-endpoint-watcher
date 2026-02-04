# Quick Start Guide

## ⚡ 3-Minute Setup

### 1️⃣ Build & Push Image (One-time)

```bash
cd k8s-endpoint-watcher
docker login
./build-and-push.sh
```

### 2️⃣ Configure Your Service

Edit `k8s/configmap.yaml`:
```yaml
SERVICE_NAME: "my-app-service"    # Your service name
NAMESPACE: "production"           # Your namespace
APP_ROOT: "myapp"                 # Your app root path
```

Update namespace in all files:
```bash
sed -i '' 's/namespace: default/namespace: production/g' k8s/*.yaml
```

### 3️⃣ Deploy

```bash
kubectl apply -f k8s/
```

### 4️⃣ Watch Logs

```bash
kubectl logs -f deployment/endpoint-watcher -n production
```

---

## 🎯 What You'll See

```
[2026-02-04T10:15:23.456Z] INFO : 🚀 Starting K8s Endpoint Watcher
[2026-02-04T10:15:24.100Z] INFO : ✅ Initial endpoints discovered: 3 ready
[2026-02-04T10:15:24.100Z] INFO :   • 10.244.1.5:8080 → pod: my-app-abc12 (node: worker-1)
[2026-02-04T10:15:24.245Z] INFO : 🔗 Initial HTTP Health Check
[2026-02-04T10:15:24.245Z] INFO :   ✅ SUCCESS - 45ms - Status: 200

[2026-02-04T10:16:45.400Z] INFO : 🔄 EndpointSlice MODIFIED
[2026-02-04T10:16:45.400Z] INFO :   ➕ ADDED: 10.244.4.9:8080 → pod: my-app-jkl78 (node: worker-4)
[2026-02-04T10:16:45.400Z] INFO :   ➖ REMOVED: 10.244.1.5:8080 → pod: my-app-abc12 (node: worker-1)

[2026-02-04T10:17:20.500Z] WARN :   ❌ FAILED - TIMEOUT after 5000ms
```

---

## 🔧 Common Commands

```bash
# View logs
kubectl logs -f deployment/endpoint-watcher -n production

# Restart watcher
kubectl rollout restart deployment/endpoint-watcher -n production

# Check status
kubectl get pods -l app=endpoint-watcher -n production

# Update config
kubectl edit configmap endpoint-watcher-config -n production
kubectl rollout restart deployment/endpoint-watcher -n production

# Delete
kubectl delete -f k8s/
```

---

## 🐛 Troubleshooting

**No endpoints found?**
```bash
kubectl get endpointslices -n production -l kubernetes.io/service-name=YOUR_SERVICE
```

**Health check fails?**
```bash
# Test from inside cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://YOUR_SERVICE.YOUR_NAMESPACE.svc.cluster.local/YOUR_APP_ROOT/api/p/health
```

**Permission errors?**
```bash
kubectl get clusterrole endpoint-watcher
kubectl get clusterrolebinding endpoint-watcher
```

---

## 📚 More Info

- Full documentation: [README.md](README.md)
- Deployment guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- Source code: [src/main.ts](src/main.ts)

---

## 🎉 That's It!

Your endpoint watcher is now monitoring pod changes and connectivity in real-time.

