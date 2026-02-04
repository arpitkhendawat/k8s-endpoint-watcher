# GitHub Actions Setup Guide

## 🚀 Automatic Docker Build & Push with GitHub Actions

This guide shows how to automatically build and push your Docker image to Docker Hub using GitHub Actions (no local Docker needed!).

---

## 📋 Prerequisites

1. GitHub account
2. Docker Hub account (free tier is fine)
3. Git installed locally

---

## 🔧 Setup Steps

### Step 1: Create Docker Hub Access Token

1. Go to [Docker Hub](https://hub.docker.com/)
2. Login to your account
3. Click your username (top right) → **Account Settings**
4. Go to **Security** → **New Access Token**
5. Token description: `GitHub Actions`
6. Permissions: **Read, Write, Delete**
7. Click **Generate**
8. **Copy the token** (you won't see it again!)

### Step 2: Add Secrets to GitHub Repository

1. Create a new GitHub repository or use existing one
2. Go to repository **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add two secrets:

   **Secret 1:**
   - Name: `DOCKERHUB_USERNAME`
   - Value: `arpitkhendawat` (your Docker Hub username)

   **Secret 2:**
   - Name: `DOCKERHUB_TOKEN`
   - Value: (paste the token from Step 1)

### Step 3: Push Code to GitHub

```bash
cd k8s-endpoint-watcher

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: K8s EndpointSlice Watcher"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/arpitkhendawat/k8s-endpoint-watcher.git

# Push to main branch
git branch -M main
git push -u origin main
```

### Step 4: Watch the Build

1. Go to your GitHub repository
2. Click **Actions** tab
3. You should see the workflow running
4. Click on the workflow to see build progress
5. Wait ~2-5 minutes for build to complete

### Step 5: Verify Image on Docker Hub

1. Go to [Docker Hub](https://hub.docker.com/)
2. Navigate to your repositories
3. You should see `arpitkhendawat/k8s-endpoint-watcher`
4. Click on it to see tags (should have `latest` tag)

---

## 🎯 How It Works

The GitHub Action (`.github/workflows/docker-build.yml`) automatically:

1. ✅ Triggers on push to `main` branch or when you create a tag
2. ✅ Checks out your code
3. ✅ Sets up Docker Buildx (multi-platform builds)
4. ✅ Logs into Docker Hub using your secrets
5. ✅ Builds the Docker image
6. ✅ Pushes to Docker Hub with appropriate tags
7. ✅ Builds for both `linux/amd64` and `linux/arm64` platforms

---

## 🏷️ Tagging Versions

To create versioned releases:

```bash
# Tag a version
git tag v1.0.0
git push origin v1.0.0

# This creates images with tags:
# - arpitkhendawat/k8s-endpoint-watcher:v1.0.0
# - arpitkhendawat/k8s-endpoint-watcher:1.0
# - arpitkhendawat/k8s-endpoint-watcher:latest
```

---

## 🔄 Manual Trigger

You can also trigger the build manually:

1. Go to **Actions** tab in GitHub
2. Click **Build and Push Docker Image** workflow
3. Click **Run workflow** button
4. Select branch
5. Click **Run workflow**

---

## 🐛 Troubleshooting

### Build fails with "authentication required"
- Check that `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets are set correctly
- Verify the token hasn't expired

### Build fails with "permission denied"
- Make sure the Docker Hub token has **Read, Write, Delete** permissions

### Image not appearing on Docker Hub
- Check the Actions tab for errors
- Verify your Docker Hub username is correct in the workflow file

### Want to use a different Docker Hub username?
Edit `.github/workflows/docker-build.yml`:
```yaml
images: YOUR_USERNAME/k8s-endpoint-watcher
```

---

## 📊 Build Status Badge (Optional)

Add this to your README.md to show build status:

```markdown
![Docker Build](https://github.com/arpitkhendawat/k8s-endpoint-watcher/actions/workflows/docker-build.yml/badge.svg)
```

---

## 🎉 Done!

Your Docker image will now automatically build and push to Docker Hub whenever you push code to GitHub!

**Image URL:** `arpitkhendawat/k8s-endpoint-watcher:latest`

Use it in your Kubernetes deployment:
```yaml
image: arpitkhendawat/k8s-endpoint-watcher:latest
```

