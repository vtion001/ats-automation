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
- **Location**: `server/` (modular FastAPI structure)
- **Framework**: FastAPI + Python
- **Host**: Azure Container Apps
- **URL**: `https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io`
- **Key Endpoints**:
  - `GET /health` - Server health check
  - `POST /api/analyze` - Text/AI analysis
  - `POST /api/transcribe` - Base64 audio transcription + analysis
  - `POST /api/transcribe/file` - Multipart file upload transcription
  - `POST /api/ctm-webhook` - CTM webhook receiver
  - `GET /api/webhook-results` - Webhook results polling

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
| AI Server | https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io |
| Active Client | flyland |
| Auto Search SF | Enabled |
| AI Analysis | Enabled |

### Custom Configuration

1. Click AGS extension icon in Chrome
2. Click "Config"
3. Update settings:
   - **Salesforce URL**: `https://yourcompany.my.salesforce.com`
   - **AI Server URL**: `https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io`
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
- Check extension config -> AI Server URL
- Verify Azure: https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io/health

### Salesforce Not Opening
- Configure Salesforce URL in extension config
- Ensure Salesforce is logged in

---

## Development

### Local Testing

```bash
# Start AI server locally
cd ats-automation
python server/main.py

# Test endpoint
curl http://localhost:8000/health
```

### Deployment Flow

```
Local Edit -> Git Push -> ACR Build -> Azure Container Apps
```

### Azure Deployment (Manual)

```bash
# Run from repo root
./deploy-azure.sh

# Or incremental update (faster)
az acr login --name agscontainerreg
az acr build --registry agscontainerreg --image ags-ai-server:latest --file Dockerfile .
az containerapp update --name ags-ai-server --resource-group ags-rg \
  --image agscontainerreg.azurecr.io/ags-ai-server:latest
```

---

## Tab Record Feature

The extension includes a **Tab Audio Capture** feature for recording calls directly from the CTM browser tab.

### How It Works

1. Click the extension icon -> **Tab Record** button
2. Select the CTM tab from the list (auto-detected or click Refresh)
3. Click **Start Recording** - the extension captures tab audio via Chrome tabCapture API
4. Make/receive your call in CTM
5. Click **Stop Recording** - audio is sent to Azure for transcription + AI analysis
6. Results display: score badge (Hot/Warm/Cold), tags, summary, transcript, Salesforce notes

### Manual Transcript Fallback

If transcription fails, a manual transcript input appears. Paste the call transcript and click **Analyze Transcript** to run AI analysis.

### Requirements

- Chrome browser (tabCapture API is Chrome-only)
- Tab must be audible/active
- Microphone permissions for the CTM tab

---

## CTM Webhook Configuration

Calls can be analyzed automatically via CTM webhooks, without manual recording.

### Setup in CTM

1. Log into CTM -> Settings -> Integrations -> Webhooks
2. Add Webhook:
   - **URL**: `https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io/api/ctm-webhook`
   - **Request Body Type**: Log Data
   - **Events**: Select call events to trigger (e.g., "completed" calls)
3. Save

### Webhook Payload

CTM sends call data as JSON. The server maps these fields:

| CTM Field | Server Field |
|-----------|-------------|
| `id` | call_id |
| `caller_number` / `contact_number` | phone |
| `name` / `cnam` | caller_name |
| `status: "completed"` | event type |
| `tracking_label` | client |
| `city`, `state`, `source`, `called_at` | metadata |

### Viewing Webhook Results

The Chrome extension polls `/api/webhook-results` for analysis results. Incoming calls trigger a webhook, the server runs AI analysis, and the extension displays results via the overlay.

### QA Scoring

The transcription pipeline computes QA metrics:
- `overall_qa_score` (0-100) and `quality_grade` (A-F)
- `word_count`, `speech_rate_wpm`, `silence_ratio`
- `completeness_score`, `clarity_issues`

---

## Files Reference

| File | Description |
|------|-------------|
| `deploy/windows/install.bat` | Main Windows installer |
| `deploy/windows/update.bat` | Quick updater |
| `deploy-azure.sh` | Azure Container Apps deployment script |
| `chrome-extension/` | Chrome extension source |
| `server/main.py` | FastAPI app entry point |
| `server/routes/` | API route handlers |
| `server/services/` | Business logic (AI, transcription, storage) |

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
| 2.2.0 | 2026-03-18 | Tab Record, CTM webhook, QA scoring, Azure Container Apps |

---

*Last Updated: March 18, 2026*
