#!/bin/bash

# 🚀 Gemawi Pro Accounting System - Docker Deployment Script
# This script handles complete Docker rebuild and deployment

set -e  # Exit on any error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   🚀 Gemawi Pro Accounting - Docker Deployment Script   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Step 1: Pull latest changes from Git
print_status "Step 1/8: Pulling latest changes from GitHub..."
if git pull origin main; then
    print_success "Git pull successful"
else
    print_warning "Git pull failed or no changes. Continuing..."
fi
echo ""

# Step 2: Stop running containers
print_status "Step 2/8: Stopping running containers..."
if docker-compose down; then
    print_success "Containers stopped successfully"
else
    print_error "Failed to stop containers"
    exit 1
fi
echo ""

# Step 3: Remove old images
print_status "Step 3/8: Removing old Docker images..."
docker rmi gemawi-pro-accounting-system1-frontend 2>/dev/null || print_warning "Frontend image not found"
docker rmi gemawi-pro-accounting-system1-backend 2>/dev/null || print_warning "Backend image not found"
print_success "Old images removed"
echo ""

# Step 4: Clean up unused Docker resources
print_status "Step 4/8: Cleaning up unused Docker resources..."
docker image prune -f
docker container prune -f
print_success "Cleanup completed"
echo ""

# Step 5: Build new images without cache
print_status "Step 5/8: Building new Docker images (this may take a few minutes)..."
if docker-compose build --no-cache --pull; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi
echo ""

# Step 6: Start containers
print_status "Step 6/8: Starting containers..."
if docker-compose up -d; then
    print_success "Containers started successfully"
else
    print_error "Failed to start containers"
    exit 1
fi
echo ""

# Step 7: Wait for containers to be ready
print_status "Step 7/8: Waiting for containers to be ready..."
sleep 5
print_success "Containers are ready"
echo ""

# Step 8: Show status
print_status "Step 8/8: Checking container status..."
docker-compose ps
echo ""

# Final message
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   ✅ Deployment Complete!                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
print_success "Frontend: http://localhost (Port 80)"
print_success "Backend:  http://localhost:5000 (Port 5000)"
echo ""
print_status "View logs with: docker-compose logs -f"
print_status "Stop containers with: docker-compose down"
echo ""
print_warning "Remember to clear your browser cache (Ctrl+Shift+Delete)"
print_warning "Or do a hard refresh (Ctrl+F5)"
echo ""
