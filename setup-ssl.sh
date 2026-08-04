#!/bin/bash

echo "🔐 Setting up SSL for Gymmawy..."

# Stop frontend container
echo "⏸️  Stopping frontend container..."
docker-compose stop frontend

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    apt update
    apt install -y certbot
fi

# Get SSL certificate
echo "📜 Getting SSL certificate..."
certbot certonly --standalone -d gymmawy.net -d www.gymmawy.net --non-interactive --agree-tos --email Dexter11x2@gmail.com

# Create ssl directory
echo "📁 Creating SSL directory..."
mkdir -p /var/www/gymawy_acc/ssl

# Copy certificates
echo "📋 Copying certificates..."
cp /etc/letsencrypt/live/gymmawy.net/fullchain.pem /var/www/gymawy_acc/ssl/
cp /etc/letsencrypt/live/gymmawy.net/privkey.pem /var/www/gymawy_acc/ssl/

# Set permissions
echo "🔒 Setting permissions..."
chmod 644 /var/www/gymawy_acc/ssl/fullchain.pem
chmod 600 /var/www/gymawy_acc/ssl/privkey.pem

# Backup current nginx.conf
echo "💾 Backing up nginx.conf..."
cp /var/www/gymawy_acc/nginx.conf /var/www/gymawy_acc/nginx.conf.backup

# Copy SSL nginx.conf
echo "📝 Updating nginx.conf..."
cp /var/www/gymawy_acc/nginx-ssl.conf /var/www/gymawy_acc/nginx.conf

# Rebuild and start frontend
echo "🚀 Rebuilding frontend..."
cd /var/www/gymawy_acc
docker-compose up -d --build frontend

# Setup auto-renewal
echo "🔄 Setting up auto-renewal..."
cat > /etc/cron.d/certbot-renew << 'EOF'
0 0 * * * root certbot renew --quiet && cp /etc/letsencrypt/live/gymmawy.net/fullchain.pem /var/www/gymawy_acc/ssl/ && cp /etc/letsencrypt/live/gymmawy.net/privkey.pem /var/www/gymawy_acc/ssl/ && cd /var/www/gymawy_acc && docker-compose restart frontend
EOF

chmod 644 /etc/cron.d/certbot-renew

echo ""
echo "✅ SSL setup complete!"
echo "🌐 Your site is now available at: https://gymmawy.net"
echo ""
echo "📊 Check status:"
echo "   docker-compose ps"
echo "   docker-compose logs -f frontend"
echo ""
