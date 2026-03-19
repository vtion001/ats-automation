# CTM API Integration - Architecture Documentation

## Overview

This document describes the new API-based architecture for ATS Automation that replaces DOM-based call detection with direct CTM API integration.

## Why API Instead of DOM?

**DOM-based (Legacy):**
- Relies on MutationObserver to detect call changes in CTM UI
- Fragile - breaks when CTM updates their UI
- Requires complex content scripts (ctm-monitor.js, overlay.js)
- Only works when CTM tab is open and active

**API-based (New):**
- Direct CTM API calls from Azure server
- No dependency on CTM UI structure
- Credentials stored securely in Azure Key Vault
- Works independently of browser state

## Architecture

```
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│  Chrome         │      │   Azure AI Server    │      │   CTM API       │
│  Extension      │─────▶│   (FastAPI)          │─────▶│   (api.call    │
│  (API Mode)     │      │                      │      │   tracking...   │
└─────────────────┘      └──────────────────────┘      └─────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Azure Key Vault   │
                         │   (Credentials)     │
                         └──────────────────────┘
```

## Components

### 1. CTM API Client (`server/services/ctm/api_client.py`)

Direct CTM API integration with Azure Key Vault credential management:

```python
from services.ctm import create_ctm_client

# Credentials loaded from Azure Key Vault
client = create_ctm_client()

# Fetch recent calls
calls = client.get_calls(limit=50, hours=24)

# Get specific call details
call = client.get_call_details(call_id)

# Get recording
recording = client.get_call_recording(call_id)
```

### 2. CTM API Routes (`server/routes/ctm_api.py`)

REST endpoints for the Chrome extension:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ctm/calls` | GET | Get recent calls |
| `/api/ctm/calls/{id}` | GET | Get call details |
| `/api/ctm/calls/{id}/recording` | GET | Get recording audio |
| `/api/ctm/calls/{id}/transcript` | GET | Get transcript |
| `/api/ctm/calls/{id}/analyze` | POST | Analyze call with AI |
| `/api/ctm/active-calls` | GET | Get active calls |
| `/api/ctm/health` | GET | Check CTM connectivity |

### 3. API Service Worker (`chrome-extension/background/api-service-worker.js`)

Simplified service worker that polls the Azure server:

```javascript
// Start polling for calls
startPolling(); // Polls every 30 seconds

// Get calls from API
const calls = await fetchCallsFromAPI();

// Analyze a call
const analysis = await analyzeCall(callId);
```

### 4. Azure Key Vault Integration

Credentials stored securely in Azure, never on local machines:

```python
# Load from Azure Key Vault
client = CTMApiClient(use_azure_keyvault=True)
# access_key, secret_key, account_id loaded automatically
```

## Setup Instructions

### Step 1: Store Credentials in Azure Key Vault

```bash
# Install dependencies
pip install azure-identity azure-keyvault-secrets

# Run setup script
python setup_azure_keyvault.py

# Enter when prompted:
# - Azure Key Vault URL
# - CTM Access Key
# - CTM Secret Key
# - CTM Account ID
```

### Step 2: Configure Azure App Settings

Add to your Azure Container Apps environment:

```
AZURE_KEYVAULT_URL=https://your-vault.vault.azure.net/
AZURE_TENANT_ID=your-tenant-id
CTM_ACCOUNT_ID=your-account-id
```

### Step 3: Build API-Mode Extension

```bash
# Build API-mode extension (no DOM scripts)
./build-extension.sh api

# Or build DOM-mode (legacy)
./build-extension.sh dom
```

### Step 4: Install Extension

1. Go to `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select `dist/ats-automation-v3.0.0-api.zip` (extracted)

## API Credentials

Your CTM API credentials (from `https://app.calltrackingmetrics.com/accounts/{id}/edit#account-api`):

- **Access Key**: `a341882d847fd790082ce05f378824a3e321f669`
- **Secret Key**: (stored in Azure Key Vault)
- **Account ID**: (stored in Azure Key Vault)

## CTM API Documentation

- **Getting Started Guide**: https://github.com/calltracking/calltracking.github.io/blob/master/api_users_guide.md
- **Postman Collection**: https://postman.calltrackingmetrics.com/
- **API Host**: `api.calltrackingmetrics.com`

## Key Endpoints

### Get Recent Calls

```bash
curl -u ${ACCESS_KEY}:${SECRET_KEY} \
  'https://api.calltrackingmetrics.com/api/v1/accounts/{ACCOUNT_ID}/calls.json?limit=50'
```

### Get Call Details

```bash
curl -u ${ACCESS_KEY}:${SECRET_KEY} \
  'https://api.calltrackingmetrics.com/api/v1/accounts/{ACCOUNT_ID}/calls/{CALL_ID}.json'
```

### Get Recording

```bash
curl -u ${ACCESS_KEY}:${SECRET_KEY} \
  'https://api.calltrackingmetrics.com/api/v1/accounts/{ACCOUNT_ID}/calls/{CALL_ID}/recording' \
  -o recording.mp3
```

## Security Considerations

1. **Credentials never local**: All CTM credentials stored in Azure Key Vault
2. **Managed identities**: Azure services use managed identities to access Key Vault
3. **No secrets in code**: Environment variables reference Key Vault, no hardcoded secrets
4. **HTTPS only**: All API calls use HTTPS

## Migration from DOM to API

To migrate from DOM-based to API-based:

1. Store credentials in Azure Key Vault using `setup_azure_keyvault.py`
2. Deploy updated server code with CTM API routes
3. Build and install API-mode extension
4. Remove DOM-based content scripts from CTM

## Troubleshooting

### CTM API Errors

```python
# Check API connectivity
from services.ctm import create_ctm_client
client = create_ctm_client()
account = client.get_account_info()
print(account)
```

### Key Vault Access

```bash
# Check Key Vault access
python setup_azure_keyvault.py --check
```

### Extension Not Loading Calls

1. Check browser console for errors
2. Verify server `/api/ctm/health` endpoint works
3. Check Chrome extension permissions

## Future Enhancements

- [ ] Webhook support for real-time call notifications
- [ ] Persistent connection via WebSocket
- [ ] Call recording download and playback
- [ ] Multi-account support