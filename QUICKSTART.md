# ATS Automation - Quick Start Guide

Get up and running in 5 minutes.

## Prerequisites

- Python 3.10+
- Chrome/Edge browser
- Docker (optional, for server)

## 1. Clone & Install

```bash
git clone https://github.com/vtion001/ats-automation.git
cd ats-automation
pip install -r requirements.txt
```

## 2. Configure

Edit `.env` file:
```bash
ATS_SERVER_URL=http://localhost:8000
ATS_API_KEY=your_api_key
```

## 3. Load Chrome Extension

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `chrome-extension/`

## 4. Run Automation

```bash
# List available clients
python main.py list

# Start automation for a client
python main.py start --client flyland

# Test configuration
python main.py test --client flyland

# View configuration
python main.py config --client flyland
```

## 5. Run Server (Optional)

```bash
# Option A: Docker
docker-compose up -d

# Option B: Python
python server/server.py
```

## Clients

| Client | Industry | Automations |
|--------|----------|-------------|
| Flyland | Addiction Counseling | 4 |
| Legacy | BPO Services | 3 |
| TBT | BPO Services | 4 |
| Banyan | Addiction Counseling | 2 |
| Takahami | Medical Billing | 2 |
| Element | Medical Billing | 2 |

## Troubleshooting

**Extension not loading?**  
Make sure you're loading from `chrome-extension/` folder, not `core/chrome_extension/`

**Automation not running?**  
Check that you're logged into all required systems (CTM, Salesforce, etc.) in your browser

**Server connection failed?**  
Verify `.env` settings and ensure server is running

## Project Structure

```
ats-automation/
├── chrome-extension/       # Browser extension (Manifest V3)
├── server/               # FastAPI AI server
├── core/                 # Shared Python modules
├── deploy/               # Deployment scripts
├── call-log-server.py    # Local markdown call logger
└── ...
```

## Documentation

- [COORDINATION.md](COORDINATION.md) - Full system overview
- [README-INSTALL.md](README-INSTALL.md) - Installation guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Azure deployment

---
*Internal use only - Confidential*
