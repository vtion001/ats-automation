#!/bin/bash
# ATS Remote Log Viewer Setup
# Run this on your Mac to start the log viewer with a permanent URL
# 
# Usage: ./setup-remote-logger.sh

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           ATS Remote Log Viewer Setup                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "⚠️  cloudflared not found. Installing..."
    brew install cloudflare/cloudflare/cloudflared
fi

# Check if logged in to Cloudflare
echo "Checking Cloudflare login status..."
if cloudflared tunnel list &> /dev/null; then
    echo "✅ Already logged in to Cloudflare"
else
    echo "🔐 Please login to Cloudflare..."
    cloudflared tunnel login
fi

# Check for existing tunnel
echo ""
echo "Checking for existing ATS tunnel..."
TUNNEL_NAME="ats-automation-logs"

if cloudflared tunnel list 2>/dev/null | grep -q "$TUNNEL_NAME"; then
    echo "✅ Found existing tunnel: $TUNNEL_NAME"
else
    echo "Creating new tunnel: $TUNNEL_NAME"
    cloudflared tunnel create "$TUNNEL_NAME" 2>/dev/null || true
fi

# Ask for domain
echo ""
echo "Do you have a domain on Cloudflare? (y/n)"
read -r has_domain

if [[ "$has_domain" == "y" || "$has_domain" == "Y" ]]; then
    echo "Enter your subdomain (e.g., ats-logs):"
    read -r subdomain
    echo "Enter your domain (e.g., example.com):"
    read -r domain
    
    echo ""
    echo "Creating DNS route: $subdomain.$domain"
    cloudflared tunnel route dns "$TUNNEL_NAME" "$subdomain" 2>/dev/null || true
    
    PUBLIC_URL="https://$subdomain.$domain"
else
    echo ""
    echo "⚠️  Using temporary URL (changes on restart)"
    echo "   For a permanent URL, add a domain to Cloudflare"
    PUBLIC_URL="temporary"
fi

# Create config
echo ""
echo "Creating cloudflared config..."
mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml << EOF
tunnel: $TUNNEL_NAME
credentials-file: ~/.cloudflared/$(cloudflared tunnel list 2>/dev/null | grep "$TUNNEL_NAME" | awk '{print $1}').json

ingress:
  - hostname: ${subdomain:-localhost}.${domain:-dev}
    service: http://localhost:5000
  - service: http_status:404
EOF

# Save URL to config
mkdir -p ~/.ats-automation
cat > ~/.ats-automation/remote-log-url.txt << EOF
$PUBLIC_URL
EOF

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   Setup Complete!                           ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Public URL: $PUBLIC_URL"
echo "║  Local URL:  http://localhost:5000"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "To start the log viewer:"
echo "  python3 scripts/remote_log_viewer.py"
echo ""
echo "On Windows, run in Chrome DevTools:"
echo "  chrome.storage.local.set({ remoteLogUrl: '$PUBLIC_URL' });"
echo ""
