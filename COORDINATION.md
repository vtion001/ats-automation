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
2026-03-18 16:00 - session-1 (OpenCode) - main
  Files: popup/tab-selector.html, popup/tab-selector.js, popup/popup.html
  Changes: Tab Audio Capture theme alignment - removed all emojis, added SVG icons, added recording timer + pulsing dot indicator, enterprise theme (#1e3a5f, #3182ce)
```

## Pending / In Progress
- Chrome extension polling for webhook results (call-monitor.js)
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
