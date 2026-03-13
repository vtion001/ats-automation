# ATS Automation System

> **MIGRATED**: Most automations now use CTM Triggers + Salesforce Flow instead of Python/Playwright.
> See [Documentation/automations.md](Documentation/automations.md) for the revised CTM-native plan.

## Overview

Automation for 6 BPO client companies using CTM native features + Salesforce Flow

## Quick Start

### Option 1: Docker (Recommended for easy setup)
```bash
# Start AI server
docker-compose up -d

# View logs
docker-compose logs -f ai-server
```

### Option 2: Python directly
```bash
# Clone or download this project
cd ats-automation

# Run deploy script
./deploy/deploy.sh  # Linux/macOS
# OR
.\deploy\deploy.ps1  # Windows
```

### 2. Configure

Edit `.env`:
```
ATS_SERVER_URL=http://your-server-ip:8000
ATS_API_KEY=your_api_key
```

### 3. Load Chrome Extension

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select `core/chrome_extension/`

### 4. Start Automation

```bash
# For Flyland (pilot client)
python main.py start --client flyland

# List available clients
python main.py list
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

## Project Structure

```
ats-automation/
├── main.py                 # Entry point
├── requirements.txt        # Dependencies
├── core/                   # Shared core modules
│   ├── config_loader.py
│   ├── browser_manager.py
│   ├── logger.py
│   └── chrome_extension/
├── clients/               # Client-specific modules
│   ├── flyland/
│   ├── legacy/
│   ├── tbt/
│   ├── banyan/
│   ├── takami/
│   └── element/
├── deploy/                # Deployment scripts
└── server/                # Central server (optional)
```

## Documentation

See `docs/` folder for detailed documentation:
- [Architecture](docs/architecture.md)
- [Client Details](docs/clients.md)
- [Automations](docs/automations.md)
- [Tech Stack](docs/tech-stack.md)
- [Implementation Plan](docs/implementation-plan.md)
- [Risks](docs/risks.md)
- [Deployment](docs/deployment.md)

## Requirements

### For CTM-Native Automation (Primary):
- CTM account with Enterprise plan (for triggers/platform events)
- Salesforce account with Flow permissions
- CTM Lightning Adapter configured
- Softphone Layout configured in Salesforce

### For Custom Webhooks (Optional):
- Zapier or Make account (for Google Sheets)
- Fax API account (for #7)
- Document generation API (for #11, #16)

### Legacy Python (Only for 3 automations):
- Python 3.10+ (only for #7, #11, #16 if needed)
- Chrome/Edge browser

## Security

- All automation runs on local agent machines
- No credentials stored - works on existing sessions
- Optional central server with API key auth
- HIPAA-compliant design (no external data transmission)

## License

Internal use only - Confidential
