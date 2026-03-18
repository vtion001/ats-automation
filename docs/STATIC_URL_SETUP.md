# Static URL Setup Guide

## Option 1: Cloudflare Named Tunnel (FREE - Recommended)

### Step 1: Create Cloudflare Account
1. Go to https://dash.cloudflare.com/
2. Sign up (free)
3. Add a domain (or use a free subdomain)

### Step 2: Create Named Tunnel
```bash
# Install cloudflared if not installed
brew install cloudflare/cloudflare/cloudflared

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create ats-logs

# Create config file
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOF
tunnel: <TUNNEL-ID>
credentials-file: ~/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: ats-logs.yourdomain.com
    service: http://localhost:5000
  - service: http_status:404
EOF

# Route the tunnel
cloudflared tunnel route dns ats-logs ats-logs.yourdomain.com

# Run the tunnel
cloudflared tunnel run ats-logs
```

Your static URL will be: `https://ats-logs.yourdomain.com`

---

## Option 2: Use the Quick Tunnel (No Setup)

The current setup uses `trycloudflare.com` which gives a **temporary random URL**. Each restart gives a new URL.

To use Windows side:
```javascript
// Update this with the current URL shown in terminal
chrome.storage.local.set({
    remoteLogUrl: 'https://CURRENT-URL.trycloudflare.com'
});
```

---

## Option 3: Same Network (No Internet Required)

If Mac and Windows are on the same network:

```bash
# Find Mac's local IP
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Use: `http://192.168.x.x:5000`

Windows setup:
```javascript
chrome.storage.local.set({
    remoteLogUrl: 'http://192.168.x.x:5000'
});
```

---

## Quick Comparison

| Method | Static URL | Setup Time | Cost |
|--------|-----------|------------|------|
| Cloudflare Named Tunnel | ✅ Yes | 10 min | Free |
| trycloudflare (current) | ❌ No | 0 | Free |
| Local Network | ❌ No | 0 | Free |

---

## Recommended: Cloudflare Setup

1. Get free Cloudflare account at https://dash.cloudflare.com/
2. Add a free domain OR use Cloudflare's free DNS
3. Follow "Option 1" above

This gives you a permanent URL like `https://ats-logs.example.com` that never changes.
