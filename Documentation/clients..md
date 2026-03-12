# ATS Automation - Client Details

## 1. Flyland Recovery

### Industry
Addiction Counseling Center

### Overview
Addiction Counseling Specialists handle mixed calls/chats (3-5 mins/call, 50-100% shift talking) during night/morning/mid shifts. Key challenges include US rep waits, note typing, and duplicates.

### Current Process
1. Receive call/chat via CTM (inbound/outbound), 0.05-1, 2-5 mins, slow load
2. Talk/listen with empathy for mental health/substance abuse, 0.3-1, 1-5 mins
3. Type notes/records, 0.2-1, 1-5 mins
4. Write replies/chats, 0.05-1, 1-5 mins
5. Wait for US reps, 0.05-1, 3 mins-1 hour
6. Post-interaction: wrap-up notes, disposition, track in CTM/SF/chatter/tracker
7. Repeat callers (duplication from US reps)

### Pain Points
- Manual SF account lookups take 1-3 mins per call with system latency
- Notes duplicated across both CTM and SF systems post-call
- Transfer waits to US reps up to 2 hours (10-20 min queue)
- Repetitive note-typing for unqualified or duplicate calls
- Manual chat replies typed individually per interaction

### Systems
| System | Tool | Purpose |
|--------|------|---------|
| Call Tracking | CTM (calltrackingmetrics.co) | Call event trigger, DOM monitoring |
| CRM | Salesforce (flyland.my.salesforce.com) | Account pop-up, note injection |
| Chat | ZOHO Mail (zoho.com/mail) | Chat reply suggester |

### Automations (4)
1. **CTM-SF Auto-Account Access** (HIGH) - Saves 1-3 mins/call
2. **Auto-Note Generator** (HIGH) - Eliminates 1-2 mins note typing
3. **Chat Reply Suggester** (MEDIUM) - Reduces 1-3 mins chat writing
4. **Wrap-Up Auto-Sync** (MEDIUM) - Eliminates duplicate entry

### Time Savings
- **Current**: 1-3 hrs/shift lost to manual tasks
- **Projected**: ~60-90 min/shift savings

---

## 2. Legacy

### Industry
BPO Services

### Overview
Legacy handles mixed calls/outbound (40-50%, 1-5 mins/call) during night/morning/mid shifts. Focus on multi-tab inefficiency and chat handling.

### Current Process
1. Receive inbound (1-5 mins, verify/pull info 1-5 mins, slow load)
2. For outbound (FB forms/old leads, hourly), dial (1-2 mins), text/SMS if VM
3. Talk/listen (3-5 mins, empathy, probing if no US notes)
4. Type notes (1-2 mins). Write replies (1-2 mins). Fill forms (1 min)
5. Transfer to openers if needed (wait 1-3 mins, latencies)
6. Update SF/CTM (duplication: notes in multiple places)

### Pain Points
- Manual SF lookups take 1-2 mins per call
- Multi-tab wrap-up is time-consuming
- Chat responses need automation
- Lead data becomes stale quickly

### Systems
| System | Tool | Purpose |
|--------|------|---------|
| Call Tracking | CTM | Call event trigger |
| CRM | Salesforce | Account management |
| Chat | ZOHO SalesIQ | Live chat (different from Flyland's ZOHO Mail) |

### ⚠️ Critical Note
Legacy uses **ZOHO SalesIQ** (zoho.com/salesiq) - different DOM profile than Flyland's ZOHO Mail. Requires specific DOM selector mapping.

### Automations (3)
1. **Wrap-Up Auto-Sync** (HIGH) - Multi-tab sync across systems
2. **Customer History Auto-Pull** (HIGH) - Auto-load history
3. **Form-Filler & AI Queue Prioritizer** (MEDIUM) - DOM-based form automation

### Time Savings
- **Current**: 1-2 hrs/shift
- **Projected**: ~60-90 min/shift savings

---

## 3. TBT (We The Best)

### Industry
BPO Services

### Overview
TBT handles outbound-focused operations with Facebook form leads and legacy data. No CTM - Salesforce Lightning is primary system.

### ⚠️ CRITICAL: System Discovery
**TBT has NO CTM** - The plan incorrectly assumed CTM. TBT's URL (wethebest.lightning.force.com) is actually Salesforce Lightning.

Also: **TBT shares Salesforce instance with Flyland** (flyland.my.salesforce.com). Must use owner/record-type filters to avoid data mixing.

### Current Process
1. Pull leads from FB forms or old database
2. Dial outbound (1-2 mins per lead)
3. Leave VM or text follow-up
4. Update lead status in SF
5. Repeat - half shift on dead leads

### Pain Points
- Dead leads consume half the shift
- Manual lead pruning needed
- No CTM for call detection
- Shared SF requires data filtering

### Systems
| System | Tool | Purpose |
|--------|------|---------|
| CRM | SF Lightning (wethebest.lightning.force.com) | Primary (NOT CTM) |
| Lead Source | Facebook Forms | Inbound leads |
| Shared Data | Salesforce (flyland.my.salesforce.com) | Note: Shared with Flyland |

### Automations (4)
1. **Auto-Lead Pruning** (HIGH) - Remove unresponsive leads
2. **Auto-Dial/SMS** (HIGH) - Automated outreach
3. **Auto-Lead Pull** (HIGH) - Inbound routing from SF
4. **Text Reply Suggester** (MEDIUM) - Template-based responses

### Time Savings
- **Current**: Half shift on dead leads
- **Projected**: ~2-3 hrs/shift savings

---

## 4. Banyan

### Industry
Addiction Counseling

### Overview
Banyan focuses on call handling inefficiencies in addiction counseling. Key issues: specialist transfer waits (up to 5 mins/call), multiple info entry leading to ticketing delays.

### Current Process
1. Receive call (3-10 mins for facility/admissions)
2. Gather caller info, create admission ticket
3. Transfer to specialist (wait 5-10 mins)
4. Post-call: update tracker AND SF separately
5. Repeat

### Pain Points
- Manual SF lookup takes 1-2 mins per call
- Admission tickets created with limited caller info
- Transfer waits to specialist via group chat: 5-10 mins
- Tracker and SF updated separately (duplication)
- Repeat callers re-entered manually

### Systems
| System | Tool | Purpose |
|--------|------|---------|
| Call Tracking | CTM | Call event detection |
| CRM | Salesforce | Account management |
| Tracker | Google Form | Internal ticket tracking |

### ⚠️ Critical Note
**Banyan's tracker is a Google Form** - Not a web app. Google Forms are submit-only:
- Cannot update submitted rows
- URL pre-fill approach required: `?entry.FIELD_ID=VALUE`
- Alternative: Direct Google Sheet update via Playwright

### Automations (2)
1. **CTM-SF Auto-Account Pop-Up** (HIGH) - 1-2 mins savings/call
2. **Auto-Call Tracking & Form/Note Auto-Fill** (HIGH) - Eliminates duplicate entry

### Time Savings
- **Current**: 40% shift on manual entry
- **Projected**: ~2 hrs/shift savings

---

## 5. Takahami

### Industry
Medical Billing

### Overview
Takahami handles claims negotiation, appeals, and insurance follow-up. Uses RingCentral for calls (not CTM).

### Current Process
1. Contact insurance carriers/TPAs (0.5 allocation, daily for accounts, negotiate claims)
2. Lookup claims (0.1-0.35, 20 mins, double-check)
3. Draft negotiations/appeals (2-3/day, 10-15 mins)
4. Fill forms/data entry (0.05-0.1, 5 mins)
5. Wait for responses (0.05-0.1, 10-30 mins)
6. Change claim status
7. Submit appeals via fax
8. Update reports

### Pain Points
- 10+ PDF forms filled manually per day
- Same patient/insurance data re-entered
- 1-4 hour IVR/queue waits to reach insurance reps
- Multiple systems updated post-call
- New portals require manual navigation

### ⚠️ CRITICAL: System Discovery
**Takahami uses RingCentral** (ringcentral.com) - NOT CTM. Call detection must be rewritten to monitor RingCentral web app DOM.

Also: Takahami uses **KIPU EHR** (lhc10828.kipuworks.com) alongside CollaborateMD - add as secondary data source.

### Systems
| System | Tool | Purpose |
|--------|------|---------|
| Phone | RingCentral | Calling (NOT CTM) |
| Billing | CollaborateMD (app.collaboratemd.com) | Primary billing |
| EHR | KIPU (lhc10828.kipuworks.com) | Patient records |

### Automations (2)
1. **Auto-Fax for Appeals** (HIGH) - Saves 5-10 mins/appeal
2. **Claim-Type-Based Appeal Router** (HIGH) - Routing decision automation

### Time Savings
- **Current**: 20 min-2 hrs/shift
- **Projected**: ~60-90 min/shift savings

---

## 6. Element Medical Billing

### Industry
Medical Billing

### Overview
Element focuses on claims processing, appeals, and insurance verification. Already uses TurboScribe for transcription.

### Current Process
1. Process claims from providers
2. Verify insurance eligibility (Availity, VerifyTx)
3. Draft appeals for denied claims
4. Fill PDF forms manually
5. Submit fax appeals
6. Track claim status

### Pain Points
- Manual PDF form filling (10+ forms/day)
- Same patient data re-entered across forms
- Insurance portal navigation repetitive
- Claim status updates require manual portal visits

### Systems
| System | Tool | Purpose |
|--------|------|---------|
| Transcription | TurboScribe (turboscribe.ai) | Existing - use outputs as NLP input |
| Insurance | Availity (availity.com) | Primary portal |
| Insurance | VerifyTx (app.verifytx.com) | Secondary portal |
| Billing | Elevate (elevate.serverdata.net) | Patient data source (NOT in original plan) |
| Documents | SharePoint + Office 365 | Template storage |

### ⚠️ Critical Note
**TurboScribe already exists** - Use transcript export files as input to note summarizer. No new STT needed.

### Automations (2)
1. **PDF Auto-Filler** (HIGH) - Saves 2-5 mins × 10+ forms = 20-50+ mins daily
2. **Insurance Portal Auto-Lookup** (HIGH) - Eliminates manual navigation

### Time Savings
- **Current**: 50% shift in queue + 10+ forms
- **Projected**: ~2-3 hrs/shift savings

---

## Summary Table

| Client | Systems | HIGH Priority | MEDIUM Priority | Critical Issues |
|--------|---------|---------------|-----------------|-----------------|
| Flyland | CTM, SF, ZOHO | 2 | 2 | None |
| Legacy | CTM, SF, SalesIQ | 2 | 1 | ZOHO SalesIQ DOM |
| TBT | SF Lightning | 3 | 1 | No CTM, shared SF |
| Banyan | CTM, SF, GForms | 2 | 0 | Google Form limits |
| Takahami | RingCentral, KIPU | 2 | 0 | No CTM, KIPU missing |
| Element | TurboScribe, Availity | 2 | 0 | TurboScribe exists |

---

*Last updated: March 2026*
