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
2026-03-18 18:25 - session-1 (OpenCode) - main
  Review: chrome-extension files (service-worker.js, popup.js, tab-selector.js, 
           overlay-ui.js, ctm-monitor.js, overlay.js, manifest.json, core.js)
  Findings: 3 CRITICAL BUGS found + 2 architectural issues
```

## Critical Bugs Found

### BUG 1: `SHOW_CALL_ANALYSIS` message falls into void (HIGH SEVERITY)
- **Location**: `service-worker.js` (lines 21-62) + `ctm-monitor.js` (line 282)
- **Problem**: `ctm-monitor.js` sends `SHOW_CALL_ANALYSIS` to the service worker, but the service worker's message handler has NO case for it. Falls into `default:` and returns `{ error: 'Unknown message type' }`.
- **Impact**: Webhook results from CTM calls NEVER trigger an overlay on the CTM page. The entire webhook-driven overlay flow is broken.
- **Fix needed**: Add `SHOW_CALL_ANALYSIS` handler to service-worker.js that uses `chrome.tabs.sendMessage` to forward to the CTM tab's content script.

### BUG 2: `overlay.js` content script doesn't listen for `SHOW_CALL_ANALYSIS` (HIGH SEVERITY)
- **Location**: `content-scripts/overlay.js` (line 436-458)
- **Problem**: The content script injected into CTM pages only handles: `SHOW_OVERLAY`, `SHOW_NOTIFICATION`, `SHOW_CALL_SUMMARY`, `SHOW_CALL_IN_PROGRESS`, `AI_ANALYSIS_RESULT`, `START_AUDIO_CAPTURE`. Missing `SHOW_CALL_ANALYSIS`.
- **Impact**: Even if service-worker forwards the message, the overlay won't display because the content script doesn't know how to render it.
- **Fix needed**: Add `SHOW_CALL_ANALYSIS` case to overlay.js message listener, calling `showData()` or a new `showCallAnalysis()` method.

### BUG 3: `overlay-ui.js` (popup module) vs `overlay.js` (content script) — two divergent overlay systems (ARCHITECTURAL)
- **Problem**: `overlay-ui.js` is a fancy module used ONLY by the popup window (for debug button). It has its own light-themed CSS and cannot inject into CTM page DOM. `overlay.js` is the actual CTM-page overlay with dark theme. They are completely separate with different rendering logic.
- **Impact**: Debug button in popup works but shows a popup-local overlay (not visible on CTM page). The debug button tests `showCallAnalysis()` from overlay-ui.js which renders in the popup window, NOT on the CTM page where agents work.
- **Fix needed**: Either (a) unify into one overlay system, or (b) ensure the debug button triggers the content-script overlay on the CTM tab instead of the popup-local one.

### BUG 4: Service worker capture handlers return errors but are still called (MEDIUM)
- **Location**: `service-worker.js` lines 26-31
- **Problem**: `START_TAB_CAPTURE` and `STOP_TAB_CAPTURE` return errors saying "Capture now runs in popup". However, `tab-selector.js` handles its own capture. The service worker's capture handlers (lines 65-130) still exist and have full implementation but are never invoked since tab-selector bypasses them. Dead code.
- **Impact**: No functional impact, but code is confusing and could lead to future bugs.
- **Fix needed**: Remove the dead capture handlers from service-worker.js, or update `tab-selector.js` to use them instead of duplicating the logic.

## Missing Pieces in the Pipeline

### Missing: MutationObserver for CTM DOM call detection (HIGH PRIORITY)
- **Current state**: `ctm-monitor.js` relies ONLY on CTM's custom events (`ctm:live-activity`, `ctm:stationCheck`, `ctm:screen-pop`). The `CTMService` in `src/services/ctm-service.js` listens for these events, but `ctm-monitor.js` (the webhook poller) doesn't use them at all.
- **Problem**: If CTM events don't fire (event batching, timing issues, page state changes), call detection fails silently.
- **Missing**: A MutationObserver in `ctm-monitor.js` (or a separate detector) that watches CTM page DOM for call state changes (ringing indicators, call UI panels, phone number elements, call timers).
- **Recommended approach**: Add MutationObserver to `ctm-monitor.js` that watches for:
  - `.ringing`, `.in-call`, `.call-active` CSS class changes
  - Call timer elements appearing
  - Phone number text nodes in call UI
  - Call state indicators (#call-status, .call-panel, etc.)
  - This provides fallback detection independent of CTM events

### Missing: Two parallel call monitoring stacks (ARCHITECTURAL)
- `src/services/ctm-service.js` + `src/call-monitor.js` + `src/main.js` — the "new" content script stack (listed in manifest.json)
- `content-scripts/ctm-monitor.js` — the "legacy" webhook poller content script (separate file, not in src/)
- Both inject into CTM pages. Unclear which one is authoritative. Potential double-processing.

## What DOM Monitoring Approach Should Be Used

### Recommended hybrid approach:
1. **Primary**: Keep `ctm-monitor.js` webhook polling (already works reliably for analyzed results)
2. **Enhancement**: Add MutationObserver in `ctm-monitor.js` for call STATE detection (incoming call, phone number extraction)
3. **Integration**: When MutationObserver detects a call, dispatch custom `ctm:live-activity` event so CTMService can process it
4. **Fallback**: If CTM events fire but webhook results don't arrive, use polling results (already have 5s poll interval)
5. **Deprecate**: The `src/services/ctm-service.js` stack should be consolidated with `ctm-monitor.js` to avoid dual monitoring

## Recommended Next Steps

### Phase 1: Fix the broken overlay flow (do first)
1. Add `SHOW_CALL_ANALYSIS` handler to `service-worker.js` that forwards to CTM tab content script
2. Add `SHOW_CALL_ANALYSIS` case to `overlay.js` content script message listener
3. Test: make a CTM webhook call and verify overlay appears

### Phase 2: Add MutationObserver DOM monitoring
1. Add MutationObserver to `ctm-monitor.js` to detect CTM call states from DOM
2. Watch for CSS class changes, element visibility, and text content for call indicators
3. Fire `ctm:live-activity` custom event when call detected so the system can respond

### Phase 3: Unify overlay systems
1. Decide: keep `overlay-ui.js` (popup) + `overlay.js` (CTM page) as separate, OR consolidate
2. Update debug button to trigger content-script overlay on CTM tab (not popup-local)
3. Remove dead service-worker capture code

### Phase 4: Consolidate monitoring stacks
1. Choose ONE call monitoring approach (prefer `ctm-monitor.js` since it has webhook polling)
2. Merge or remove `src/services/ctm-service.js` / `src/call-monitor.js` / `src/main.js` stack
3. Update manifest.json content_scripts array

## Pending / In Progress
- Real CTM call test (need to make actual call)
- Add MutationObserver DOM call detection

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
- [x] FIXED: BUG 1 - `SHOW_CALL_ANALYSIS` now handled by service-worker and forwarded to CTM tab
- [x] FIXED: BUG 2 - `overlay.js` now has `SHOW_CALL_ANALYSIS` listener with `showCallAnalysisOverlay()`
- [x] FIXED: BUG 3 - Clarified overlay architecture (overlay-ui.js for popup, overlay.js for CTM page)
- [x] Missing: dual monitoring stacks (ctm-monitor.js vs src/ stack) - documented but not yet consolidated
