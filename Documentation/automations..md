# ATS Automation - CTM-Native Automation Plan

> **REVISED**: All automations now use CTM native features + Salesforce Flow instead of Python/Playwright

---

## Core Integration Architecture

```
Call comes in → CTM Trigger → Platform Event → Salesforce Flow → Auto-pop/Record Update
```

### CTM Native Capabilities Used:
- **Triggers**: Automation on call events (received, ended, etc.)
- **Platform Events**: Emit events to Salesforce for Flow activation
- **Salesforce Integration**: Native sync, field mapping, campaign association
- **Webhooks**: Send data to external systems if needed
- **Softphone Layout**: Salesforce auto-pop configuration

---

## HIGH PRIORITY AUTOMATIONS (11) - CTM-Based

### 1. CTM-SF Auto-Account Access (REVISED)
**Client**: Flyland Recovery  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Low

**Objective**: Automatically open Salesforce record when call comes via CTM

**CTM Native Solution**:
1. **Enable Platform Events**: Settings → Integration Options → Enable Platform Events (Flows)
2. **Configure Softphone Layout**: Salesforce Setup → Call Center → Softphone Layout
   - Set "Search" to search by Phone
   - Enable auto-pop on incoming calls
3. **CTM Trigger**: 
   - Event: "Activity is received"
   - Action: "Salesforce sync" (ensures record exists before pop)

**Required Settings**:
| CTM Setting | Value |
|-------------|-------|
| Platform Events (Flows) | ON |
| Manual Screen Pop | OFF |
| Present search dialog when multiple | ON |

**Salesforce Setup**:
- Call Center configured with CTM adapter
- Softphone Layout assigned to Call Center
- Users assigned to Call Center

**Edge Cases**:
- No SF match: Softphone shows "Create New Lead" option (native behavior)
- Verify CTM adapter URL: `https://ctm.calltrackingmetrics.com/cti/lightningAdapter.html`

**Business Impact**: Zero development; native Salesforce CTI functionality

---

### 2. Auto-Note Generator for Unqualified/Duplicates (REVISED)
**Client**: Flyland Recovery  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Low

**Objective**: Auto-generate notes for unqualified or duplicate calls

**CTM Native Solution**:
1. **CTM Trigger on Call End**:
   - Event: "End event with all data ready"
   - Condition: Disposition = "Unqualified" OR "Duplicate"
   - Action: "Update Field" → Set custom field with disposition
   - Action: "Tag Call" → Add "unqualified" or "duplicate" tag

2. **Salesforce Flow** (triggered by CTM Platform Event):
   - Get call data from Platform Event payload
   - Create Task on Lead/Contact with disposition notes
   - Use CTM's "AskAI" action for transcription summary

**Alternative - CTM AskAI Integration**:
- Enable AskAI in CTM settings
- Trigger: "Transcription is ready"
- Action: "AskAI" → Generate call summary
- Action: "Salesforce sync" → Push summary to SF Description field

**Edge Cases**:
- Transcription not available: Use "Call Score" tags as quick notes
- Multiple dispositions: Use CTM's 3-tag limit strategically

**Business Impact**: Native integration; no custom code

---

### 3. Wrap-Up Auto-Sync Across Systems (REVISED)
**Client**: Legacy  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Low

**Objective**: Post-call, auto-sync disposition data to all relevant systems

**CTM Native Solution**:
1. **CTM Trigger**:
   - Event: "End event with all data ready"
   - Action: "Salesforce sync with mapping set"
   - Action: "Update Reporting Tag"

2. **Salesforce Flow**:
   - Triggered by Platform Event
   - Creates Task record
   - Updates Lead/Contact with call details

3. **For Google Sheets**: Use **CTM Webhook** → Google Sheets Zapier/Make integration

**Configuration**:
```
CTM Trigger:
  - Event: End event with all data
  - Action: Salesforce sync (upsert)
  - Action: Salesforce campaign (if applicable)
```

**Edge Cases**:
- Sync failure: CTM retries automatically; check Integration Logs
- Duplicate prevention: Use Salesforce Matching Rules + CTM's upsert

**Business Impact**: Eliminates manual data entry; native sync

---

### 4. Customer History Auto-Pull & Reminders (REVISED)
**Client**: Legacy  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Low

**Objective**: Auto-load caller history; remind agent of missed details

**CTM Native Solution**:
1. **Salesforce Flow**:
   - Triggered on incoming call (Platform Event from CTM)
   - Get Contact/Lead by phone number
   - Return history to CTM via Flow response
   
2. **CTM Integration Setting**:
   - Enable "Enhanced CallerID lookup" in CTM
   - Shows caller name, location, previous call history in Softphone

3. **Salesforce Softphone Layout**:
   - Configure "Search Results" section to show:
     - Previous calls (Call History related list)
     - Open Tasks
     - Last disposition

**Configuration Path**:
- Salesforce: Setup → Call Center → Softphone Layout → Search Results
- Add: Call Log, Open Activities, Notes

**Edge Cases**:
- No history: CTM Enhanced CallerID provides demographics
- Slow SF: Use CTM's caller cache

**Business Impact**: Native Salesforce CTI feature

---

### 5. Auto-Lead Pruning & Dial/SMS Automation (REVISED)
**Client**: TBT  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Medium

**Objective**: Auto-remove unresponsive leads; auto-dial/SMS for form leads

**CTM Native Solution**:
1. **Auto-Dial from SF**: Use CTM's **Smart Dialer**
   - Export SF leads to CSV
   - Upload to CTM Smart Dialer
   - Configure: Mode = "Preview", Confirmation = "Talk time threshold"

2. **Lead Pruning**: Use **CTM Monitors** (not Python)
   - Set up Monitor to check SF for stale leads
   - Action: "Add to Do Not Call List" or tag

3. **Auto-SMS for Form Leads**: Use **CTM FormReactor**
   - Configure FormReactor trigger
   - Action: "Send text" with auto-response

**Configuration**:
```
CTM Smart Dialer:
  - Mode: Preview dialer
  - Contact list: SF export
  - Confirmation: Key press or talk time > 30s
  - Wrap-up: Auto-disposition
```

**Edge Cases**:
- DNC compliance: Use CTM's "State DNC check" feature
- Large lists: Use CTM's bulk upload

**Business Impact**: Native CTM features replace Python automation

---

### 6. Auto-Lead Pull & Inbound Routing (REVISED)
**Client**: TBT  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Low

**Objective**: Auto-detect and route incoming leads from SF queue

**CTM Native Solution**:
1. **CTM Smart Router**:
   - Route based on tracking source, caller location, time
   - Use "Salesforce Router" option for SF-based routing

2. **CTM Queues**:
   - Configure queue with routing: Round Robin, Sticky, or Weighted
   - Agent status syncs with SF Open CTI

3. **Salesforce Flow**:
   - Trigger: Platform Event on call received
   - Action: Check lead status, update priority
   - Action: Route to appropriate queue via CTM API

**Edge Cases**:
- High volume: Use CTM's queue priority features
- Agent unavailable: Configure overflow routing in CTM

**Business Impact**: Native routing; no custom automation needed

---

### 7. Auto-Fax for Appeals & Claim Status Updater (REVISED)
**Client**: Takahami  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Medium

**Objective**: Auto-submit fax appeals; auto-update claim status

**CTM Native Solution**:
1. **Fax Automation**: Use CTM's **webhook** + third-party fax API (Fax.Plus, RingCentral Fax)
   - CTM Trigger: "Activity is received"
   - Action: "Run webhook" → Fax API endpoint
   - Payload: Claim data + recipient fax number

2. **Claim Status Updates**:
   - Use **Salesforce Flow** triggered by CTM Platform Event
   - Flow updates Custom Claim object status
   - Use Salesforce In-App Notifications to alert specialist

**Configuration**:
```
CTM Trigger:
  - Event: Activity is received
  - Condition: Caller Number contains [claim line]
  - Action: Run webhook → fax-service.com/api/send
  - Action: Tag Call: "fax-sent"
```

**Edge Cases**:
- Fax failure: Use CTM's webhook retry or Salesforce Flow retry
- Session expiry: Use scheduled Flow to check status

**Note**: Still requires some custom development (webhook payload), but much simpler than Python

---

### 8. Claim-Type-Based Appeal Router (REVISED)
**Client**: Takahami  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Low

**Objective**: Auto-determine appeal destination based on claim type

**CTM Native Solution**:
1. **CTM Smart Router**:
   - Use "Voice Menu" (IVR) to collect claim type
   - Route based on DTMF keypress or speech
   - Or use CTM's "AskAI" to classify caller intent

2. **Integration with SF**:
   - CTM Trigger → Salesforce sync → Lookup claim in SF
   - Use SF's "Assignment Rules" to route to specialist

**Configuration**:
```
CTM Smart Router:
  - Route 1: IF Caller inputs "1" → Route to Insurance Appeals Queue
  - Route 2: IF Caller inputs "2" → Route to Billing Queue
  - Default: Route to General Queue
```

**Edge Cases**:
- Unknown claim type: Route to live agent with claim info
- Multi-plan: Use Salesforce Case routing rules

**Business Impact**: Native IVR + SF routing

---

### 9. CTM-SF Auto-Account Pop-Up (REVISED)
**Client**: Banyan  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Low

**Objective**: Auto-populate SF data when call arrives via CTM

**Same as #1** - Use native Salesforce Softphone Layout

**Configuration Checklist**:
- [ ] CTM: Manual Screen Pop = OFF
- [ ] CTM: Platform Events (Flows) = ON
- [ ] SF: Call Center configured
- [ ] SF: Softphone Layout → Search Layouts include Lead, Contact
- [ ] SF: Users assigned to Call Center
- [ ] SF: Open CTI permission set assigned

**Testing**:
1. Make test call to CTM tracking number
2. Agent receives call in CTM Softphone
3. Salesforce should auto-pop with caller record

**Business Impact**: Native CTI feature

---

### 10. Auto-Call Tracking & Form/Note Auto-Fill (REVISED)
**Client**: Banyan  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: Low

**Objective**: After call, auto-update both Google Form tracker AND SF

**CTM Native Solution**:
1. **CTM Trigger**:
   - Event: "End event with all data"
   - Action: "Salesforce sync" → Updates SF record
   - Action: "Update Reporting Tag" → Tags for tracking

2. **Google Sheets**: Use **CTM Webhook** → Google Sheets (via Zapier/Make)
   - CTM sends call data to webhook
   - Zapier adds row to Google Sheet

3. **Salesforce Flow**:
   - Triggered by Platform Event
   - Creates Task with call details
   - Updates custom fields from CTM data

**Configuration**:
```
CTM Trigger:
  - Event: End event with all data
  - Actions:
    1. Salesforce sync
    2. Salesforce campaign (if applicable)
    3. Run webhook → Google Sheets
```

**Edge Cases**:
- Partial data: Use CTM's "End event with all data" (not immediate)
- Conflicting updates: Use Salesforce "Last Modified" logic

**Business Impact**: Eliminates duplicate entry; native + webhook

---

### 11. PDF Auto-Filler (REVISED)
**Client**: Element Medical Billing  
**Priority**: HIGH  
**Phase**: 1  
**Effort**: High

**Objective**: Auto-fill PDF forms with patient data from open portal

**CTM Native Solution**:
1. **Salesforce Flow + Document Generation**:
   - Flow triggered by CTM Platform Event
   - Use Salesforce "Generate Document" or "Template Service"
   - Merge SF Contact data into PDF template

2. **Alternative**: Use **CTM Webhook** → Document generation API (DocuSign, PandaDoc)
   - CTM Trigger: "End event with all data"
   - Action: "Run webhook" → Document API
   - API generates PDF from template + SF data

**Configuration**:
```
CTM Trigger:
  - Event: End event with all data
  - Condition: Tag includes "admission-form"
  - Action: Run webhook → doc-api.com/generate
    - Payload: { patient_id, call_data, form_type }
```

**Edge Cases**:
- Missing data: Use Salesforce Flow decision element
- Complex forms: Use Salesforce Document Generation feature

**Note**: Still requires some development but uses standard APIs instead of Python DOM scraping

**Business Impact**: Replaces Python DOM automation with API-based solution

---

## MEDIUM PRIORITY AUTOMATIONS (6) - CTM-Based

### 12. Chat Reply Suggester & Form Auto-Filler (REVISED)
**Client**: Flyland Recovery  
**Priority**: MEDIUM  
**Phase**: 2  
**Effort**: Low

**Solution**: Use CTM's **AskAI** + **Templates**
- AskAI can generate responses based on call context
- Use CTM's text templates for common responses

---

### 13. Form-Filler, Note Summarizer & AI Queue Prioritizer (REVISED)
**Client**: Legacy  
**Priority**: MEDIUM  
**Phase**: 2  
**Effort**: Low

**Solution**: Use **CTM AskAI** + **Salesforce Flow**
- AskAI summarizes calls
- Salesforce Flow prioritizes queue based on call data

---

### 14. Text Reply Suggester, Note Templates & Insurance Status Checker (REVISED)
**Client**: TBT  
**Priority**: MEDIUM  
**Phase**: 2  
**Effort**: Low

**Solution**: Use **CTM Text Messaging Templates**
- CTM has built-in templates for SMS
- Salesforce shows insurance status in Softphone panel

---

### 15. Note Summarizer & Reply Suggester (REVISED)
**Client**: Banyan  
**Priority**: MEDIUM  
**Phase**: 2  
**Effort**: Low

**Solution**: Use **CTM AskAI**
- Trigger: "Transcription is ready"
- Action: "AskAI" → Generate summary
- Action: "Salesforce sync" → Push to SF Description

---

### 16. Negotiation Form-Filler & Reply Suggester (REVISED)
**Client**: Takahami  
**Priority**: MEDIUM  
**Phase**: 2  
**Effort**: Medium

**Solution**: Use **Salesforce Flow + Document Generation**
- Triggered by CTM Platform Event
- Uses SF templates for negotiation forms

---

### 17. Pre-Filled Insurance Form Template Generator (REVISED)
**Client**: Element Medical Billing  
**Priority**: MEDIUM  
**Phase**: 2  
**Effort**: Low

**Solution**: Use **Salesforce Document Generation**
- Salesforce templates pre-filled with Contact data
- Trigger from CTM Platform Event

---

## Quick Reference by Client - CTM Native

| Client | HIGH Priority Automations (Native) |
|--------|-----------------------------------|
| Flyland | #1 Auto-pop (SF Softphone), #2 AskAI notes, #10 SF sync |
| Legacy | #3 SF sync, #4 Softphone history, #13 AskAI |
| TBT | #5 Smart Dialer, #6 Router/Queue, #14 Templates |
| Banyan | #9 Auto-pop, #10 SF sync + Webhook |
| Takahami | #7 Webhook+Fax, #8 Smart Router |
| Element | #11 SF Document Generation |

---

## Required CTM Settings Summary

### For All Clients:
| Setting | Location | Required |
|---------|----------|----------|
| Platform Events (Flows) | Settings → Integration Options | ON |
| Manual Screen Pop | Settings → Integration Options | OFF |
| Lightning Adapter | Settings → Integrations → Salesforce | Connected |
| User Mapping | Settings → Integrations → User Mapping | All agents mapped |

### For Auto-Pop:
| Setting | Value |
|---------|-------|
| Manual Screen Pop | OFF |
| Present search dialog when multiple | ON |
| Screen pop mapping | Configured |

---

## Implementation Priority

### Phase 1 (Week 1-2):
1. Fix Auto-Pop (#1, #9) - Check CTM + SF configuration
2. Enable Platform Events
3. Test CTM → Salesforce sync
4. Configure Softphone Layout

### Phase 2 (Week 3-4):
1. Create CTM Triggers for common workflows
2. Set up Salesforce Flows for Platform Events
3. Configure Webhooks for Google Sheets

### Phase 3 (Week 5+):
1. Advanced automation (AskAI, Document Generation)
2. Custom webhook integrations
3. Optimize routing and queues

---

## What Still Requires Custom Development

| Automation | Custom Dev Required |
|------------|---------------------|
| #7 Auto-Fax | Webhook payload + Fax API |
| #11 PDF Auto-Filler | Document generation API |
| #16 Negotiation Forms | SF Document Generation setup |

**Total**: 3 automations need some development vs 17 with Python

---

*Last updated: March 2026*
*Revised approach: CTM-native + Salesforce Flow instead of Python/Playwright*
