# ATS Automation - Technical Architecture

## Overview

The ATS Automation system uses a **hybrid architecture** combining:
- Local bot runners on each agent workstation
- Chrome Extension for DOM monitoring and overlay injection
- Playwright/Selenium for browser automation
- PyAutoGUI for desktop-level automation
- Local NLP models for AI processing

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT WORKSTATION                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   Chrome     │  │  Playwright  │  │   PyAutoGUI         │ │
│  │  Extension   │  │   Scripts    │  │   Desktop Bots      │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘ │
│         │                  │                     │             │
│         └──────────────────┼─────────────────────┘             │
│                            │                                    │
│                    ┌───────▼───────┐                           │
│                    │  Local NLP    │                           │
│                    │  (DistilBERT) │                           │
│                    └───────────────┘                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ACTIVE BROWSER SESSIONS                      │  │
│  │  CTM │ Salesforce │ ZOHO │ Billing Portals │ RingCentral │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Chrome Extension

**Purpose**: DOM reading, overlay injection, event detection

**Capabilities**:
- Content scripts monitor web pages in real-time
- Injects floating overlay panels for automation results
- Detects call events, form changes, message threads
- Reads and interacts with page DOM without API access

**Components**:
```
chrome-extension/
├── manifest.json           # Extension configuration
├── content-scripts/        # Injected into web pages
│   ├── ctm-monitor.js     # CTM call event detection
│   ├── sf-reader.js        # Salesforce DOM scraping
│   ├── zoho-chat.js        # ZOHO chat monitoring
│   └── overlay.js          # Results overlay panel
├── popup/                  # Extension popup UI
├── background/             # Service worker
└── config/                 # Client-specific DOM profiles
```

### 2. Playwright/Selenium Scripts

**Purpose**: Multi-tab browser automation, form filling, navigation

**Key Scripts**:
- `ctm_sf_auto_access.py` - CTM to SF auto-popup
- `wrapup_sync.py` - Multi-tab wrap-up synchronization
- `pdf_filler.py` - PDF form auto-fill
- `fax_automation.py` - Fax portal automation

### 3. PyAutoGUI Desktop Bots

**Purpose**: Desktop-level clicks, keystrokes, hotkey triggers

**Use Cases**:
- PDF field filling when browser automation insufficient
- Hotkey-triggered workflows
- Coordinate-based clicking for legacy apps
- Screenshot capture for OCR

### 4. Local NLP Processing

**Purpose**: Note summarization, classification, response generation

**Models**:
- **DistilBERT** - Note summarization (offline)
- **spaCy** - Named entity recognition
- **LibreTranslate** - Non-English translation (offline)

**No cloud services required** - all processing local to agent machine.

---

## Data Flow

### Example: CTM-SF Auto-Account Access

```
1. Agent receives call via CTM
       │
       ▼
2. Chrome Extension detects call event (DOM polling)
       │
       ▼
3. Extension extracts caller phone number from CTM DOM
       │
       ▼
4. Playwright opens SF search URL with phone number
       │
       ▼
5. SF page DOM read → extract account data
       │
       ▼
6. Overlay panel displays key fields (name, history, status)
       │
       ▼
7. Agent sees popup without leaving CTM
```

### Example: Auto-Note Generator

```
1. Agent selects "Unqualified" disposition in CTM
       │
       ▼
2. PyAutoGUI detects disposition change (clipboard/API monitor)
       │
       ▼
3. Script captures call details from CTM DOM
       │
       ▼
4. Local NLP model generates note based on disposition
       │
       ▼
5. Note injected into SF/CTM notes field via DOM
       │
       ▼
6. Agent reviews and finalizes
```

---

## Client-Specific Configurations

### Flyland Recovery
```
Systems: CTM, Salesforce, ZOHO Mail
DOM Profiles: 
  - ctM (calltrackingmetrics.co)
  - SF (flyland.my.salesforce.com)
  - ZOHO (zoho.com/mail)
```

### Legacy
```
Systems: CTM, Salesforce, ZOHO SalesIQ
DOM Profiles:
  - CTM (calltrackingmetrics.co)
  - SF (flyland.my.salesforce.com)
  - ZOHO SalesIQ (zoho.com/salesiq) ← Different from Flyland
```

### TBT
```
Systems: Salesforce Lightning ONLY (no CTM)
DOM Profiles:
  - SF (wethebest.lightning.force.com)
Note: All CTM-based automations retargeted to SF Lightning
```

### Banyan
```
Systems: Google Forms (tracker), Salesforce
DOM Approach:
  - Google Forms: URL pre-fill (entry.FIELD_ID=VALUE)
  - Alternative: Direct Google Sheet update via Playwright
```

### Takahami
```
Systems: RingCentral, KIPU EHR, CollaborateMD
DOM Profiles:
  - RingCentral (ringcentral.com) ← Not CTM
  - KIPU (lhc10828.kipuworks.com)
  - CollaborateMD (app.collaboratemd.com)
```

### Element Medical Billing
```
Systems: TurboScribe, Availity, VerifyTx, SharePoint
Notes:
  - TurboScribe: Use existing transcript files as NLP input
  - Availity: Insurance portal RPA
  - VerifyTx: Secondary insurance portal
```

---

## Security Model

### No Credentials Required
- All automation runs on existing agent browser sessions
- Agents remain logged into their systems
- No API tokens stored
- No backend access needed

### Data Privacy
- All NLP processing local (no cloud)
- Patient data never leaves agent machine
- Config files stored locally per machine
- No external data transmission

---

## Deployment Architecture

### Per Agent Machine Requirements

| Requirement | Specification |
|-------------|---------------|
| OS | Windows 10/11 or macOS |
| Python | 3.10+ |
| Browser | Chrome or Edge |
| RAM | 8GB minimum |
| Storage | 5GB for NLP models |
| Network | Access to client portals |

### Optional Central Server

For team-wide config management and monitoring:
```
┌─────────────────┐     ┌─────────────────┐
│  Central Server │     │  Agent Machines │
│  (Optional)     │────▶│  (Primary)      │
└─────────────────┘     └─────────────────┘
        │                        │
        │  - Config updates      │  - Run automations
        │  - Log aggregation     │  - Local NLP
        │  - Monitoring          │  - Direct portal access
        │  - Model updates       │
        └────────────────────────┘
```

**Recommendation**: Start with local-only deployment. Add central server if team grows beyond 10 agents.

---

## File Structure

```
ats-automation/
├── chrome-extension/
│   ├── manifest.json
│   ├── content-scripts/
│   ├── popup/
│   └── config/
│       ├── flyland.json
│       ├── legacy.json
│       ├── tbt.json
│       ├── banyan.json
│       ├── takahami.json
│       └── element.json
├── playwright-scripts/
│   ├── ctm_sf_auto_access.py
│   ├── wrapup_sync.py
│   └── ...
├── pyautogui-scripts/
│   ├── pdf_filler.py
│   ├── fax_automation.py
│   └── ...
├── nlp-models/
│   ├── summarizer/
│   └── classifier/
├── config/
│   ├── field-mappings/
│   ├── templates/
│   └── rules/
└── logs/
```

---

*Last updated: March 2026*
