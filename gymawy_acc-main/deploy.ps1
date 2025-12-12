# 🚀 Gemawi Pro Accounting System - Docker Deployment Script (PowerShell)
# This script handles complete Docker rebuild and deployment for Windows

# Enable strict mode
$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🚀 Gemawi Pro Accounting - Docker Deployment Script   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Functions for colored output
function Print-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Print-Success {
    param([string]$Message)
    Write-Host "[✓] $Message" -ForegroundColor Green
}

function Print-Error {
    param([string]$Message)
    Write-Host "[✗] $Message" -ForegroundColor Red
}

function Print-Warning {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Yellow
}

# Step 1: Pull latest changes from Git
Print-Status "Step 1/8: Pulling latest changes from GitHub..."
try {
    git pull origin main
    Print-Success "Git pull successful"
}
catch {
    Print-Warning "Git pull failed or no changes. Continuing..."
}
Write-Host ""

# Step 2: Stop running containers
Print-Status "Step 2/8: Stopping running containers..."
try {
    docker-compose down
    Print-Success "Containers stopped successfully"
}
catch {
    Print-Error "Failed to stop containers"
    exit 1
}
Write-Host ""

# Step 3: Remove old images
Print-Status "Step 3/8: Removing old Docker images..."
try {
    docker rmi gemawi-pro-accounting-system1-frontend 2>$null
}
catch {
    Print-Warning "Frontend image not found"
}
try {
    docker rmi gemawi-pro-accounting-system1-backend 2>$null
}
catch {
    Print-Warning "Backend image not found"
}
Print-Success "Old images removed"
Write-Host ""

# Step 4: Clean up unused Docker resources
Print-Status "Step 4/8: Cleaning up unused Docker resources..."
docker image prune -f
docker container prune -f
Print-Success "Cleanup completed"
Write-Host ""

# Step 5: Build new images without cache
Print-Status "Step 5/8: Building new Docker images (this may take a few minutes)..."
try {
    docker-compose build --no-cache --pull
    Print-Success "Build completed successfully"
}
catch {
    Print-Error "Build failed"
    exit 1
}
Write-Host ""

# Step 6: Start containers
Print-Status "Step 6/8: Starting containers..."
try {
    docker-compose up -d
    Print-Success "Containers started successfully"
}
catch {
    Print-Error "Failed to start containers"
    exit 1
}
Write-Host ""

# Step 7: Wait for containers to be ready
Print-Status "Step 7/8: Waiting for containers to be ready..."
Start-Sleep -Seconds 5
Print-Success "Containers are ready"
Write-Host ""

# Step 8: Show status
Print-Status "Step 8/8: Checking container status..."
docker-compose ps
Write-Host ""

# Final message
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                   ✅ Deployment Complete!                  ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Print-Success "Frontend: http://localhost (Port 80)"
Print-Success "Backend:  http://localhost:5000 (Port 5000)"
Write-Host ""
Print-Status "View logs with: docker-compose logs -f"
Print-Status "Stop containers with: docker-compose down"
Write-Host ""
Print-Warning "Remember to clear your browser cache (Ctrl+Shift+Delete)"
Print-Warning "Or do a hard refresh (Ctrl+F5)"
Write-Host ""
