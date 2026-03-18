# ATS Automation - Multi-Terminal Coordination

## Active Sessions

| Terminal | Agent | Branch | Status | Last Update | Work |
|----------|-------|--------|--------|-------------|------|
| session-1 | OpenCode (main) | main | ACTIVE | 2026-03-18 15:30 | Azure server CTM webhook + Chrome extension |
| session-2 | ? | ? | ? | ? | ? |
| session-3 | ? | ? | ? | ? | ? |

## Session IDs (set when starting work)
- Find your session ID: `whoami` + `tty` + `date +%s`

## Rules
1. Before making ANY file changes, check this file
2. Each session claims a branch: `git checkout -b session/<your-session>`
3. When done, merge to main via PR or directly
4. Pull main before starting: `git pull origin main`
5. Update this file before and after major changes

## Recent Changes (append-only)
```
2026-03-18 18:15 - session-1 (OpenCode) - main
  Files: server/services/__init__.py, server/routes/analyze.py, DOCUMENTATION.md, deploy-azure.sh
  Changes:
    - CRITICAL FIX: services/__init__.py - imported ai_service INSTANCE (AIService) not module
      - Root cause: `from . import ai_service` imported MODULE, not the `ai_service = AIService()` instance
      - Symptom: "AttributeError: module 'services.ai_service' has no attribute 'analyze'"
      - Fix: `from .ai_service import ai_service, AIService` (imports the INSTANCE)
    - Fixed analyze.py: used wrong `API_KEY` (ATS_API_KEY) vs `OPENROUTER_API_KEY`
    - All 10 server endpoints now PASSING (health, analyze, transcribe, webhook, results, etc.)
    - Updated DOCUMENTATION.md with Tab Record, CTM webhook, new server URL
    - Fixed deploy-azure.sh: uses `update` not `create`, includes ACR login
  Server: v19 deployed (revision 0000022)
```
```
2026-03-18 17:55 - session-1 (OpenCode) - main
  Files: server/routes/transcribe.py, server/routes/remote_logs.py, server/core/app.py, chrome-extension/background/service-worker.js, chrome-extension/popup/tab-selector.js, chrome-extension/popup/tab-selector.html
  Changes:
    - Fixed server /api/transcribe endpoint (base64 audio -> faster-whisper -> analyze)
    - Fixed transcribe.py: proper import, route order, error handling
    - Fixed remote_logs.py: added missing 'Any' import
    - Tab Record: capture -> storage -> transcribe -> analyze -> display results
    - Fallback: manual transcript input if transcription fails
    - Results display: score badge, tags, summary, transcript, SF notes
  Server: v16 deployed, /api/transcribe working
```

## Pending / In Progress
- Real CTM call test (need to make actual call)

## Completed
- [x] CTM webhook endpoint with CTM field mapping
- [x] QA/transcription quality scoring
- [x] Phone number normalization
- [x] Event detection from body status field
- [x] Azure deployment with v8 tag
- [x] Chrome extension enterprise theme (#1e3a5f, #3182ce)
- [x] Debug button with max z-index
- [x] CSP fix for inline script
- [x] SVG phone icon
- [x] All 10 server endpoints passing (analyze, determine-action, analyze-full, etc.)
- [x] ai_service import fix (services/__init__.py)
- [x] DOCUMENTATION.md updated (Tab Record, CTM webhook, server URL)
- [x] deploy-azure.sh fixed (update vs create, ACR login)
