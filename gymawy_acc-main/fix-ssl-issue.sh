#!/bin/bash

# Fix SSL Issue Script
# This script will regenerate SSL certificates and ensure they are correctly linked to Nginx.

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔒 Starting SSL Fix Process...${NC}"

# 1. Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root (use sudo)${NC}"
  exit 1
fi

# 2. Detect Docker Compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo -e "${RED}❌ Docker Compose not found! Please install Docker Compose.${NC}"
    exit 1
fi
echo -e "🐳 Using command: ${DOCKER_COMPOSE}"

# 3. Get current directory
PROJECT_DIR=$(pwd)
echo -e "📂 Working directory: ${PROJECT_DIR}"

# 4. Stop frontend to free up port 80
echo -e "${YELLOW}⏸️  Stopping frontend container...${NC}"
$DOCKER_COMPOSE stop frontend
# Also try to stop any process on port 80 just in case
fuser -k 80/tcp 2>/dev/null || true

# 5. Install certbot if missing
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}📦 Installing certbot...${NC}"
    apt-get update && apt-get install -y certbot
fi

# 6. Renew/Get Certificate
DOMAIN="gymmawy.net"
EMAIL="Dexter11x2@gmail.com"

echo -e "${YELLOW}📜 Requesting certificate for ${DOMAIN}...${NC}"
certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL --force-renewal

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to obtain certificate. Check your DNS settings and firewall.${NC}"
    # Restart frontend anyway so site isn't down
    $DOCKER_COMPOSE start frontend
    exit 1
fi

# 7. Prepare SSL directory
SSL_DIR="${PROJECT_DIR}/ssl"
mkdir -p "$SSL_DIR"

# 8. Copy certificates
echo -e "${YELLOW}📋 Copying certificates to ${SSL_DIR}...${NC}"
cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "${SSL_DIR}/"
cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" "${SSL_DIR}/"

# 9. Set permissions
chmod 644 "${SSL_DIR}/fullchain.pem"
chmod 600 "${SSL_DIR}/privkey.pem"

# 10. Update Nginx Config
echo -e "${YELLOW}📝 Updating Nginx configuration...${NC}"
if [ -f "nginx-ssl.conf" ]; then
    cp nginx-ssl.conf nginx.conf
else
    echo -e "${RED}❌ nginx-ssl.conf not found!${NC}"
    exit 1
fi

# 11. Rebuild and Start Frontend
echo -e "${YELLOW}🚀 Rebuilding and starting frontend...${NC}"
$DOCKER_COMPOSE up -d --build frontend

echo -e "${GREEN}✅ SSL Fix Complete!${NC}"
echo -e "Please wait a few seconds and check https://${DOMAIN}"
