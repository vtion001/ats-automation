# AGS Automation Tool - Complete Documentation

## Overview

AGS (Automation & Growth System) Automation Tool is a Chrome extension that automates BPO client workflows by integrating:
- **CTM (CallTrackingMetrics)** - Call monitoring and transcription
- **Salesforce** - Automatic customer lookup
- **AI Analysis** - Smart call insights

---

## System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   CTM Phone    │────▶│ Chrome Extension │────▶│    Azure AI     │
│   (Calls)      │     │ (AGS Automation)│     │    Server      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │    Salesforce     │
                        │  (Customer Data) │
                        └──────────────────┘
```

---

## Components

### 1. Chrome Extension
- **Location**: `chrome-extension/`
- **Version**: 2.1.0
- **Platform**: Chrome (Manifest V3)

### 2. AI Server (Cloud)
- **Location**: `server/ai_server.py`
- **Framework**: FastAPI + Python
- **Host**: Azure Container Instances
- **URL**: `http://4.157.143.70:8000`

### 3. CI/CD Pipeline
- **Platform**: GitHub Actions
- **Trigger**: Push to main branch
- **Deploys**: Azure Container Instance

---

## Installation

### Windows Workstation Setup

#### Option A: From Repository
```bash
# Clone repository
git clone https://github.com/vtion001/ats-automation.git

# Navigate to Windows installer
cd ats-automation/deploy/windows

# Run installer
install.bat
```

#### Option B: From ZIP
1. Download `AGS-Automation-v1.0.0.zip`
2. Extract to folder
3. Run `install.bat`

---

## Configuration

### Pre-Configured Settings
| Setting | Default Value |
|--------|--------------|
| AI Server | http://4.157.143.70:8000 |
| Active Client | flyland |
| Auto Search SF | Enabled |
| AI Analysis | Enabled |

### Custom Configuration

1. Click AGS extension icon in Chrome
2. Click "Config"
3. Update settings:
   - **Salesforce URL**: `https://yourcompany.my.salesforce.com`
   - **AI Server URL**: `http://4.157.143.70:8000`
4. Click Save

---

## Usage

### Basic Workflow

1. **Open CTM**: Go to `app.calltrackingmetrics.co`
2. **Make/Receive Call**: Extension detects call automatically
3. **Salesforce Opens**: Phone number searched automatically
4. **AI Analysis**: Call insights generated

### Manual Actions

- **Test Connection**: Click extension → Test
- **Run Analysis**: Click extension → Run Analysis
- **View Config**: Click extension → Config

---

## Updating

### On Workstation

```bash
# Quick update (if Git installed)
update.bat

# Or manually:
git pull origin main
```

### On Azure (Automatic)

Changes to `server/ai_server.py` auto-deploy via GitHub Actions:
1. Edit locally
2. Push to GitHub
3. Azure updates automatically (~2-3 min)

---

## Troubleshooting

### Extension Not Loading
- Run `install.bat` again
- Or manually: Chrome → `chrome://extensions/` → Developer Mode → Load Unpacked

### AI Server Not Connecting
- Check extension config → AI Server URL
- Verify Azure: http://4.157.143.70:8000/health

### Salesforce Not Opening
- Configure Salesforce URL in extension config
- Ensure Salesforce is logged in

---

## Development

### Local Testing

```bash
# Start AI server locally
cd ats-automation
python server/ai_server.py

# Test endpoint
curl http://localhost:8000/health
```

### Deployment Flow

```
Local Edit → Git Push → GitHub Actions → Azure Container
```

---

## Files Reference

| File | Description |
|------|-------------|
| `deploy/windows/install.bat` | Main Windows installer |
| `deploy/windows/update.bat` | Quick updater |
| `chrome-extension/` | Chrome extension source |
| `server/ai_server.py` | AI server source |
| `.github/workflows/deploy.yml` | CI/CD pipeline |

---

## Support

- **GitHub**: https://github.com/vtion001/ats-automation
- **Issues**: Open an issue on GitHub

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-XX-XX | Initial release |
| 2.0.0 | 2025-XX-XX | Added AI analysis |
| 2.1.0 | 2026-03-15 | Azure deployment, CI/CD |

---

*Last Updated: March 15, 2026*
