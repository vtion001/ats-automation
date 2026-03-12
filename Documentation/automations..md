# ATS Automation - Automation Specifications

## All 17 Automations by Priority

---

## HIGH PRIORITY AUTOMATIONS (11)

### 1. CTM-SF Auto-Account Access
**Client**: Flyland Recovery  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Medium

**Objective**: Automatically open Salesforce account when call comes via CTM

**Inputs**: Caller phone number visible on CTM screen

**Outputs**: SF account auto-opened in adjacent browser tab/panel with key fields displayed

**Technical Approach**:
- Chrome extension with content script monitors CTM DOM for call events
- Playwright/Selenium script triggered on call-start reads the phone number
- Opens SF in existing browser session using pre-built search URL pattern
- Overlay panel injects into browser - reads SF DOM, no SF API required
- Duplicate detection: scans SF search results for multiple matches

**Edge Cases**:
- No SF match: extension shows 'New Lead' button
- Slow SF page: timeout with partial data notification

**Business Impact**: Saves 1-3 mins per call; zero credential exposure

---

### 2. Auto-Note Generator for Unqualified/Duplicates
**Client**: Flyland Recovery  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Medium

**Objective**: Auto-generate notes for unqualified or duplicate calls

**Inputs**: Call transcript text (from screen/clipboard), disposition code

**Outputs**: Draft note pre-filled in SF/CTM note field

**Technical Approach**:
- Desktop listener monitors CTM's disposition dropdown
- On 'Unqualified' or 'Duplicate' selection, reads available context
- Runs local NLP model (offline DistilBERT) to classify and generate summary
- Injects text directly into SF/CTM notes field via simulated input or DOM injection

**Edge Cases**:
- Complex or emotional content: skip auto-note, flag for manual
- Low confidence: show draft with 'Review before posting' warning

**Business Impact**: Eliminates 1-2 mins of note typing per unqualified/duplicate call

---

### 3. Wrap-Up Auto-Sync Across Systems
**Client**: Legacy  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: High

**Objective**: Post-call, auto-sync disposition data to all relevant systems

**Inputs**: Wrap-up form data from CTM

**Outputs**: Synced records in SF, tracker, chatter; no-dupe confirmation

**Technical Approach**:
- Playwright multi-tab controller identifies open tabs by URL pattern
- Reads wrap-up fields from CTM DOM after disposition submit
- Switches to SF/Google Tracker (or internal web tracker) and auto-fills
- Uses simulated clicks and keystrokes - no Sheets API needed

**Edge Cases**:
- Partial sync failure: retry queue with exponential backoff
- High queue: batch process when agent idle

**Business Impact**: Eliminates 100% duplications

---

### 4. Customer History Auto-Pull & Reminders
**Client**: Legacy  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Medium

**Objective**: Auto-load caller history; remind agent of missed details

**Inputs**: Caller ID / phone number

**Outputs**: History UI popup; reminders for key updates ("unqualified" updates)

**Technical Approach**:
- SF query on call start via background tab
- Rule-based reminders displayed as overlay (e.g., "Update: last call marked unqualified")
- Progress bar for slow loads

**Edge Cases**:
- Slow load: show progress bar
- Sensitive updates: mask until agent clicks to reveal

**Business Impact**: Cover new updates automatically

---

### 5. Auto-Lead Pruning & Dial/SMS Automation
**Client**: TBT  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Medium

**Objective**: Auto-remove unresponsive leads; auto-dial/SMS for form leads

**Inputs**: Lead list; prune threshold

**Outputs**: Updated list; call/SMS logs

**Technical Approach**:
- Local file watcher (Python watchdog) monitors Downloads folder for SF/CTM CSV exports
- DB query for last response date
- Prune via rules file (configurable threshold in days)
- Auto-dial script reads pruned list and initiates calls

**Edge Cases**:
- Partial responses: flag for review
- Bulk prune: confirmation dialog

**Business Impact**: Reduce OBs by 50%

---

### 6. Auto-Lead Pull & Inbound Routing
**Client**: TBT  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Medium

**Objective**: Auto-detect and route incoming leads from SF queue

**Inputs**: SF call queue and agent status DOM

**Outputs**: Auto-routed calls; lead context displayed

**Technical Approach**:
- Content script reads CTM call queue and agent status DOM in real-time
- Routes calls based on availability and lead priority
- Displays lead context as overlay (using data already visible in open SF record)

**Edge Cases**:
- High volume: queue-based routing
- Agent unavailable: route to next available

**Business Impact**: Faster lead response time

---

### 7. Auto-Fax for Appeals & Claim Status Updater
**Client**: Takahami  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Medium

**Objective**: Auto-submit fax appeals; auto-update claim status

**Inputs**: Claim record, appeal document

**Outputs**: Fax sent; claim status updated in portal

**Technical Approach**:
- PyAutoGUI hotkey listener triggers fax workflow on specialist's command
- Screen OCR (Tesseract) identifies open PDF filename
- Playwright navigates existing fax portal session (no fax API)
- Carrier fax directory: local JSON mapping carrier names to fax numbers
- Claim status: DOM interaction on billing portal - reads current value, selects new status

**Edge Cases**:
- Fax portal session expired: alert specialist to re-login
- Invalid carrier: validation check from local rules file

**Business Impact**: Saves 5-10 mins per appeal; eliminates manual fax queue

---

### 8. Claim-Type-Based Appeal Router
**Client**: Takahami  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Low

**Objective**: Auto-determine appeal destination based on claim type

**Inputs**: Claim record visible on screen in billing portal

**Outputs**: Routing decision shown as overlay (fax number or email)

**Technical Approach**:
- Chrome extension reads claim type, plan name, and payer from portal DOM
- Local rule engine (JSON config) determines whether appeal goes to local plan or payer
- Displays correct destination as overlay
- One-click triggers fax/email tool accordingly

**Edge Cases**:
- Unknown type: default to manual with alert
- Multi-plan: allow manual select

**Business Impact**: Eliminates manual destination lookup per claim

---

### 9. CTM-SF Auto-Account Pop-Up
**Client**: Banyan  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Medium

**Objective**: Auto-populate SF data when call arrives via CTM

**Inputs**: Caller phone number visible in CTM call notification

**Outputs**: SF account data displayed as floating overlay; new lead button

**Technical Approach**:
- Chrome extension with content script monitors CTM DOM for call state changes (polling every 500ms)
- Extracts caller number from call notification element
- Opens SF in background tab (agent already logged into SF)
- Reads SF DOM fields and renders summary card pinned to screen corner

**Edge Cases**:
- SF timeout after 5s: overlay shows partial data with warning
- Duplicate accounts: prompt merge

**Business Impact**: Saves 1-2 mins per call; eliminates most common manual lookup

---

### 10. Auto-Call Tracking & Form/Note Auto-Fill
**Client**: Banyan  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: High

**Objective**: After call, auto-update both Google Form tracker AND SF

**Inputs**: Call metadata (duration, disposition) from CTM wrap-up screen

**Outputs**: Tracker row added automatically; SF record updated

**Technical Approach**:
- After agent selects disposition in CTM wrap-up, Playwright reads visible wrap-up fields from CTM DOM
- Switches to Google Form (or Google Sheet via Playwright if agents have edit access)
- Auto-fills using simulated clicks and keystrokes - no Sheets API needed
- Also updates SF record (already open from earlier popup) - fills key fields

**Edge Cases**:
- Incomplete transcription: show editable draft with confidence score
- Conflicting data: alert agent before overwriting

**Business Impact**: Eliminates duplicate entry; saves 1-2 mins of wrap-up per call

---

### 11. PDF Auto-Filler
**Client**: Element Medical Billing  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Medium

**Objective**: Auto-fill PDF forms with patient data from open portal

**Inputs**: Blank PDF form opened by specialist, patient record in SF/billing portal

**Outputs**: PDF with standard fields auto-populated; specialist reviews

**Technical Approach**:
- Python file watcher (watchdog) detects when specialist opens new PDF
- pdfplumber reads form field labels offline
- DOM scraper reads patient data from open SF/billing portal tab
- Local field-mapping config maps PDF field labels to SF DOM selectors
- pdfrw/PyPDF2 writes values into PDF fields and saves pre-filled copy
- Preview UI: system notification with 'Open Filled PDF' button

**Edge Cases**:
- Missing patient data: highlight unfilled fields in yellow
- Large PDF: process in chunks
- Unrecognized form: skip and alert

**Business Impact**: Saves 2-5 mins × 10+ forms/day = 20-50+ mins daily per specialist

---

## MEDIUM PRIORITY AUTOMATIONS (6)

### 12. Chat Reply Suggester & Form Auto-Filler
**Client**: Flyland Recovery  
**Priority**: MEDIUM  
**Phase**: 2  
**Effort**: Low-Medium

**Objective**: Suggest replies for chats; auto-fill admission forms

**Inputs**: Chat context; form type

**Outputs**: Suggested replies; filled form

**Technical Approach**:
- Chrome content script reads chat DOM in real-time for keyword matching
- Local JSON template library - no external service needed
- Form filler reads field labels via DOM, matches to SF data already on screen
- One-click 'Insert' button pastes suggestion into chat input field
- Offline mode: templates cached locally

**Edge Cases**:
- Long chats: summarize last 5 messages only for context
- Offline form: skip auto-fill, show manual prompt

**Business Impact**: Reduces 1-3 mins chat writing + 1 min form fill per interaction

---

### 13. Form-Filler, Note Summarizer & AI Queue Prioritizer
**Client**: Legacy  
**Priority**: MEDIUM  
**Phase**: 2  
**Effort**: High

**Objective**: DOM-based form automation with AI prioritization

**Inputs**: Form context; queue data

**Outputs**: Filled forms; prioritized queue

**Technical Approach**:
- DOM-based form filler with local field-mapping config file
- Local NLP model prioritizes queue based on wait time, lead value
- One-click fill from template library

**Edge Cases**:
- Complex forms: manual override available
- Low confidence: draft mode

**Business Impact**: Reduces manual entry time significantly

---

### 14. Text Reply Suggester, Note Templates & Insurance Status Checker
**Client**: TBT  
**Priority**: MEDIUM  
**Phase**: 2  
**Effort**: Medium

**Objective**: Template-based responses for outbound; insurance status from portal

**Inputs**: SMS/Text content; insurance claim data

**Outputs**: Suggested replies; status updates

**Technical Approach**:
- DOM reader for SMS window content
- Local template JSON for suggestions
- Insurance status: reads from portal DOM

**Edge Cases**:
- No match: show manual input
- Slow portal: use cached data

**Business Impact**: Faster response times for leads

---

### 15. Note Summarizer & Reply Suggester
**Client**: Banyan  
**Priority**: MEDIUM  
**Phase**: 2  
**Effort**: Medium

**Objective**: Summarize long notes; suggest replies during admissions/transfers

**Inputs**: Note text; context keywords

**Outputs**: Summarized text; suggested reply list

**Technical Approach**:
- Clipboard monitor captures highlighted/copied text automatically
- Local transformer model (DistilBERT) generates summary under 100 words
- Shows in persistent overlay panel - one-click insert
- Reply suggester reads active chat/message window DOM, surfaces 2-3 options

**Edge Cases**:
- Empty notes: default summary
- Sensitive data: confirm before processing

**Business Impact**: Reduces review and response time; speeds up admissions

---

### 16. Negotiation Form-Filler & Reply Suggester
**Client**: Takahami  
**Priority**: MEDIUM  
**Phase**: 2  
**Effort**: Medium

**Objective**: Auto-fill negotiation forms; suggest responses to carrier replies

**Inputs**: Carrier response text; claim data

**Outputs**: Filled negotiation form; suggested actions

**Technical Approach**:
- DOM reader captures carrier response text from email client or portal message thread
- Local negotiation playbook (JSON): response patterns mapped to suggested actions
- Overlay panel shows ranked suggestions with 'Copy' and 'Insert' buttons
- Form filler reads claim fields from open billing portal tab; injects into negotiation form

**Edge Cases**:
- Short/vague carrier response: default to general template
- Complex negotiations: escalation button in overlay

**Business Impact**: Reduces 10-15 mins drafting per negotiation/appeal

---

### 17. Pre-Filled Insurance Form Template Generator
**Client**: Element Medical Billing  
**Priority**: MEDIUM  
**Phase**: 2  
**Effort**: Low

**Objective**: Generate pre-filled templates for common insurance types

**Inputs**: Insurance type selection

**Outputs**: Template PDF with common fields pre-filled

**Technical Approach**:
- Lightweight local desktop app (Tkinter or Electron)
- Dropdown of insurance types - on selection, loads template from local folder
- Pre-fills standard fields (addresses, codes) from local JSON config
- Specialists can upload new template PDFs through simple UI

**Edge Cases**:
- Custom/non-standard insurer: 'Upload Template' option
- Missing values: highlight in yellow

**Business Impact**: Eliminates template setup time; ensures field consistency

---

## Quick Reference by Client

| Client | HIGH (Phase 1) | MEDIUM (Phase 2) |
|--------|---------------|------------------|
| Flyland | CTM-SF Auto-Access, Auto-Note | Chat Reply Suggester |
| Legacy | Wrap-Up Sync, History Auto-Pull | Form-Filler + AI |
| TBT | Lead Pruning, Lead Pull | Reply Suggester |
| Banyan | CTM-SF Pop-Up, Auto-Tracking | Note Summarizer |
| Takahami | Auto-Fax, Appeal Router | Negotiation Filler |
| Element | PDF Auto-Filler | Template Generator |

---

*Last updated: March 2026*
