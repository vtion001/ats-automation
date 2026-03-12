# ATS Automation - PDF Documents

*Extracted from PDF files*

---

# AST Automation Brief.pdf

## Page 1

Flyland Recovery 
Overview: Addiction specialists deal with US rep waits, note typing, duplicates.  
Current Process Overview 
Addiction Counseling Specialists handle mixed calls/chats (3 -5 mins/call, 50 -100% shift 
talking) during night/morning/mid shifts.  
Workflow 
1. Receive call/chat via CTM (inbound/outbound), look up patient files/docs in SF (1 -3 
mins, slow load).  
2. Talk/listen with empathy for mental health/substance abuse (3 -5 mins, gather 
concerns).  
3. Type notes/updates (1-2 mins, every call details).  
4. Write replies/chats (1-3 mins, if mixed). Fill forms (1 min). Transfer to US rep/specialist 
(longest wait: 1-2 hours, 10-20 mins/queue, depends on response).  
5. Post-call, update SF records (duplication: notes in CTM/SF , scores/chatter).  
a. For unqualified/duplicates, do notes (repetitive).  
b. If chat, reply manually. Overall, 1 -2 hours on waits/manual (system load, 
transfers); multitasking calls/chats, duplicate checks. 
CTM-SF Integration for Auto-Account Access 
• Key Objective: On CTM call, auto-access SF account to avoid manual lookups. 
• Specs: Extend for chat integration. Auto-detect duplicates via phone match. 
• Inputs: Call/chat ID. 
• Outputs: SF account view embedded. 
• Edge Cases: No account (auto-create); geo-tagged calls (rare, ignore per data). 
• Testing: simulations; reduce lookup time to <1 min. 
Auto-Note Generator for Unqualified/Duplicates 
• Key Objective: For unqualified calls/duplicates, auto-generate/summarize notes. 
• Specs: NLP to classify call (e.g., unqualified via keywords like "Medicaid"); generate 
template notes. 
• Inputs: Call transcript; disposition. 
• Outputs: Summarized note posted to SF/CTM. 
• Edge Cases: Complex cases (escalate to manual); emotional content (preserve 
empathy flags). 
• Testing: 80% auto-approval rate. 

## Page 2

Chat Reply Suggester and Admissions Form Auto-Filler 
• Key Objective: Suggest replies for chats; auto-fill admissions forms. 
• Specs: Template-based suggester; form filler pulling from SF . 
• Inputs: Chat context; form type. 
• Outputs: Suggested replies; filled form. 
• Edge Cases: Long chats (summarize first); offline mode (local cache). 
• Testing: Measure reply time reduction. 
 
Legacy 
Overview: Multi-channel (calls/chats) with post-call duplications.  
Current Process Overview 
Addiction Counseling Specialists, CSRs, Agents handle mixed calls/chats (3 -5 
mins/interaction, 0.3-1 talking) during night/morning/mid shifts. 
Workflow 
1. Receive call/chat (queued simultaneously, tiring if alone), look up history/policy 
(0.05-1, 2-5 mins, slow load).  
2. Talk/listen/gather info (0.3-1, 1-5 mins, accurate notes).  
3. Type notes/records (0.2 -1, 1 -5 mins, tagging/disposition after every call). Write 
emails/chats (0.05-1, 1-5 mins, standard replies).  
4. Fill forms/data entry (0.1-1, repetitive).  
5. Wait for approvals/US reps (0.05-1, 3 mins-1 hour).  
6. Post-interaction, wrap -up notes, disposition, track in CTM/SF/chatter/tracker 
(duplication: same info multiple places, rewrites).  
a. For admissions, provide resources if unqualified.  
7. Repeat callers (duplication from US reps). Overall, 0.2 -1 hour on manual/waiting 
(updates, typing); tiring due to multitasking, queue, error risks. 
Wrap-Up to SF/Chatter Auto-Link for Disposition/Tracking 
• Key Objective: Post-call, auto-sync disposition to SF/chatter/tracker. 
• Specs: API batch post; use disposition codes to generate notes. 
• Inputs: Wrap-up form data. 
• Outputs: Synced records; no-dupe confirmation. 
• Edge Cases: Partial sync failure (retry queue); high volume (async processing). 

## Page 3

• Testing: Eliminate 100% duplications. 
Customer History Auto-Pull and Update Reminders 
• Key Objective: Auto-load history; remind missed details/updates. 
• Specs: SF query on call start; rule -based reminders (e.g., "Check resources for 
unqualified"). 
• Inputs: Caller ID. 
• Outputs: History UI; pop-up reminders. 
• Edge Cases: Slow load (progress bar); sensitive updates (audit log). 
• Testing: Cover new updates. 
Form-Filler, Note Summarizer, and AI Workload Prioritizer 
• Key Objective: Auto-fill forms; summarize notes; prioritize queued calls/chats. 
• Specs: Form filler via templates; summarizer NLP; prioritizer using ML (e.g., urgency 
scores from keywords). 
• Inputs: Form data; note text; queue items. 
• Outputs: Filled forms; summaries; sorted queue. 
• Edge Cases: Overloaded queue (cap at 10); abstract content (fallback to full text). 
• Testing: Prioritize complex cases. 
TBT 
Overview: Outbound-heavy with old leads. Themes: Hourly OBs, no -responses, 
multitasking. 
Current Process Overview 
ASTs and Addiction Specialists handle mixed calls/outbound (40-50%, 1-5 mins/call) during 
night/morning/mid shifts. 
Workflow 
1. Receive inbound (1-5 mins, verify/pull info 1-5 mins, slow load).  
2. For outbound (FB forms/old leads, hourly, even months old no -response), dial (1 -2 
mins), text/SMS if VM (depends on reply time).  
3. Talk/listen (3-5 mins, empathy, probing if no US notes).  
4. Type notes (1-2 mins). Write replies (1-2 mins). Fill forms (1 min).  
5. Transfer to openers if needed (wait 1-3 mins, latencies).  
6. Update SF/CTM (duplication: notes in multiple places, trackers for transfers/VOB). 
Multi-task during latencies.  

## Page 4

a. Repetitive: OB calls (hourly, daily to old leads).  
b. Waits: US counterparts (half shift, 1 hour). Overall, half shift on manual 
(outbounds, verifies). 
Auto-Lead Pruning and Dial/SMS for Forms 
• Key Objective:  Auto-remove unresponsive leads (>2 weeks); auto -dial/SMS FB 
forms. 
• Specs: DB query for last response; prune via rules. Auto-dialer with SMS fallback. 
• Inputs: Lead list; prune threshold. 
• Outputs: Updated list; call/SMS logs. 
• Edge Cases: Partial responses (flag); bulk prune (batch limit 100). 
• Testing: Reduce OBs by 50%. 
Auto-Lead/Number Pull and Routing 
• Key Objective: Auto-pull leads/numbers; equal inbound routing (no priorities). 
• Specs: Integrate with CTM/SF; round-robin routing algo. 
• Inputs: Incoming call. 
• Outputs: Routed call; pulled data. 
• Edge Cases: Uneven agent load (balance algo); no leads (alert). 
• Testing: Ensure equal distribution. 
Text Reply Suggester, Note Templates, Insurance Auto-Checker 
• Key Objective: Suggest texts; template notes; auto-check insurance/coverage. 
• Specs: Template suggester; rule-based checker (e.g., DB lookup for coverage). 
• Inputs: Text context; insurance details. 
• Outputs: Suggestions; check result (qualified/unqualified). 
• Edge Cases: Ambiguous insurance (manual prompt); non-standard queries. 
• Testing: Accuracy >85%. 
Takahami 
Overview: Billing negotiations/appeals. Themes: Carrier contacts, status changes, lookups. 
Current Process Overview 
Medical Billing Specialists and Negotiation Specialists handle mixed calls/back office (0.5 
talking, 10-20 mins lookups) during night shifts. 
 

## Page 5

Workflow 
1. Contact insurance carriers/TPAs (0.5 allocation, daily for accounts, negotiate 
claims).  
2. Lookup claims (0.1-0.35, 20 mins, double-check billed/allowed amounts).  
3. Draft negotiations/appeals (2-3/day, 10-15 mins typing).  
4. Fill forms/data entry (0.05-0.1, 5 mins).  
5. Wait for responses (0.05-0.1, 10-30 mins).  
6. Change claim status (e.g., PAID to UNDERPAID).  
7. Submit appeals via fax (if applicable).  
8. Update reports (0.05-30 mins).  
a. Repetitive: Contacting carriers (daily same accounts).  
b. Duplications: Notations per DOS.  
c. Waits: Carrier contacts (1 -2 hours). Overall, 20 mins -2 hours on manual 
(negotiations, lookups); inefficient due to double-checks and status changes. 
Auto-Fax for Appeals and Claim Status Updater 
• Key Objective:  Auto-submit appeals via e -fax; change statuses (e.g., PAID to 
UNDERPAID). 
• Specs: Use fax API (e.g., Twilio Fax); status updater via DB/portal API. 
• Inputs: Appeal docs; claim ID; new status. 
• Outputs: Fax confirmation; updated claim. 
• Edge Cases: Fax failure (retry); invalid status (validation). 
• Testing: Full cycle simulation. 
Claim-Type-Based Appeal Router 
• Key Objective: Auto-direct appeals to local/home plans. 
• Specs: Rule engine (e.g., if-else on claim type); output destination (fax/email). 
• Inputs: Claim details. 
• Outputs: Routed destination. 
• Edge Cases: Unknown type (default to manual); multi-plan (prompt choice). 
• Testing: 100% routing accuracy. 
Negotiation Form-Filler and Reply Suggester 
• Key Objective: Auto-fill negotiation forms; suggest replies/next steps. 
• Specs: Template filler; NLP suggester based on carrier responses. 
• Inputs: Negotiation data; response text. 
• Outputs: Filled form; suggested reply. 

## Page 6

• Edge Cases: Complex negotiations (escalate); short responses (default templates). 
• Testing: Time reduction per survey (1-2 hours/shift) 
Banyan 
Overview: Focus on call handling inefficiencies in addiction counseling. Key themes: 
Specialist transfer waits (up to 5 mins/call), multi -system docs (tracker/SF), limited caller 
info leading to ticketing delays. 
Current Process Overview 
Agents, primarily CSRs and Addiction Specialists, handle inbound calls (main type: Calls or 
Mixed; duration: 3 -10 mins for facility/admission calls) via CTM during night/mid/rotating 
shifts. 
Workflow 
1. Receive call via CTM, manually look up customer info in SF (0.35-1 time allocation, 1-
2 mins), talk/listen to customers (0.5 -1 allocation, 3-10 mins, emphasizing empathy 
for addiction concerns).  
2. During call, type notes/updating records (0.2-1, 1-2 mins), fill forms/data entry (0.05-
0.089, 1 min), and lookup info/documents (0.05-1, 1 min).  
3. For admissions, create tickets (70% time) with limited caller info, park/transfer to 
specialist via group chat "All Admissions Team" , wait for availability/response (longest 
wait: 5-10 mins/specialist, up to 0.4 shift).  
4. Post-call, track call in tracker (repetitive after every call), document in SF 
(duplication: same info in tracker/SF , rewrites, checks twice), update leads (50% 
time), and sometimes write replies (0-0.3).  
a. If repeat caller, re-enter info in SF .  
5. System latencies slow history load.  
CTM-Salesforce Integration for Auto-Account Pop-Up 
• Key Objective: When a call comes in via CTM, auto-fetch and display the caller's SF 
account/lead to avoid manual search. 
• Specs: Hook into CTM webhook/API on incoming call. Query SF via API (e.g., using 
caller ID/phone as key). Display pop -up with account details (name, history, notes). 
If no match, create new lead auto-filled with caller basics. 
• Inputs: Caller phone from CTM; SF auth token. 
• Outputs: JSON with account data; UI pop-up in agent dashboard. 
• Edge Cases: No match (create lead); slow SF response (timeout after 5s, fallback to 
manual); duplicate accounts (prompt merge). 

## Page 7

• Testing: Simulate calls; verify pop-up in <2s for 90% cases. 
Auto-Call Tracking and Form/Note Auto-Fill 
• Key Objective:  After a call, auto -tracking in tracker/SF without duplicate entry, 
including auto-fill for forms/notes based on call disposition. 
• Specs: Use speech-to-text (e.g., Google STT) or post -call inputs to generate notes. 
Auto-post to both systems via APIs. Pre -fill forms (e.g., tickets) with caller info, 
concern tags. 
• Inputs: Call metadata (duration, disposition); transcribed notes. 
• Outputs: Updated records in tracker/SF; confirmation UI. 
• Edge Cases: Incomplete transcription (manual edit prompt); conflicting data (alert 
user); high queue (batch process). 
• Testing: End-to-end call simulation; check no duplicates; accuracy >95% for 
standard dispositions. 
Note Summarizer and Reply Suggester 
• Key Objective:  For long notes/history, quick summaries; for replies/next steps, 
suggest templates during admissions/transfers. 
• Specs: NLP model (e.g., BERT) to summarize notes (<100 words). Suggest replies 
from template DB based on keywords (e.g., "admission" -> transfer script). 
• Inputs: Note text; context keywords. 
• Outputs: Summarized text; suggested reply list (editable). 
• Edge Cases: Empty notes (default summary); sensitive content (flag for review); non-
English (handle via translation). 
• Testing: User acceptance: reduces time by 30% (survey estimate). 
Element Medical Billing 
Overview: Billing/VOB specialists face repetitive PDF fills and insurance lookups. Themes: 
Queue waits, portal navigation, repeated fields (10+ forms/day). 
Current Process Overview 
VOB Specialists and Verification of Benefits Specialists handle back office processing or 
mixed calls/outbound (50%) during night/morning shifts. 
 
 
 

## Page 8

Workflow 
1. Look up info in systems/portals (0.1 -1 allocation, especially new portals), call 
insurances/representatives (0.35-1, outbound active talking, risk of voice strain).  
2. Fill forms/data entry (0.2 -1, 10+ PDF forms/day for patients), type notes/updates 
(0.05-1), write replies (0.1-1).  
3. Search for policy/product info (waits in IVR/queue, 1 -4 hours). Update multiple 
systems post-call.  
a. Duplications: Entering same info in two places (e.g., phone numbers in PDFs).  
b. Repetitive: Filling PDFs (10x+/day), calling insurances. Waits: Queue (50% 
shift, 4 hours), system slow load.  
PDF Auto-Filler 
• Key Objective:  When filling PDFs (e.g., VOB forms), auto -population of standard 
fields from DB/patient data. 
• Specs: Use PDF lib (e.g., PyPDF2) to parse/edit forms. Pull data from central DB 
(patient ID as key). Support all insurance types with templates. 
• Inputs: PDF template path; patient ID; insurance type. 
• Outputs: Filled PDF downloadable; preview UI. 
• Edge Cases: Missing fields (prompt user); invalid data (validation errors); large PDFs 
(chunk processing). 
• Testing: Fill 10 forms; verify 100% accuracy for repeats (phones, etc.); time savings 
>50%. 
Insurance Portal Integration for Lookups/Reminders 
• Key Obective: During lookups, auto -fetch of policy info and reminders for missed 
details. 
• Specs: API wrappers for common portals (e.g., via Selenium if no API). Remind via 
pop-ups (e.g., "Check deductible"). Cache results for repeats. 
• Inputs: Policy ID; portal URL. 
• Outputs: JSON data; UI reminders. 
• Edge Cases:  Portal downtime (fallback cache); auth expiry (auto -refresh); new 
portals (manual add). 
• Testing: Simulate calls; accuracy >90%. 
Pre-Filled Insurance Form Templates Generator 
• Key Objective: Ready templates for all insurances, auto-generated based on type. 
• Specs: DB of templates; generate on-demand with partial fills. 

## Page 9

• Inputs: Insurance type. 
• Outputs: Template PDF/editable form. 
• Edge Cases: Custom insurances (user-upload template 
• Testing: Generate examples; user feedback loop. 


---

# AST_TechStack_Conflict_Analysis.pdf

## Page 1

AST AUTOMATION PLAN
TECH STACK CONFLICT ANALYSIS
Identified conflicts between the v2.0 Implementation Plan and actual client tech stacks  |  March 2026
4
CRITICAL
5
HIGH
2
MEDIUM
1
LOW

## Page 2

Overview
Cross-referencing the v2.0 RPA Implementation Plan against the Master Resource List revealed 13 conflicts 
across 5 of the 6 clients. These range from critical system mismatches (wrong call platform assumed) to missing 
systems that need dedicated automation profiles.
No conflicts were found for Legacy's core systems — CTM, Salesforce, and ZOHO are all correctly referenced in 
the plan. Legacy has one medium-severity note about ZOHO SalesIQ needing a specific DOM profile.
Conflict Summary Table
Client Conflict Severity Resolution Direction
TBT No CTM — SF Lightning Only CRITICAL Retarget all call automation to SF Lightning 
DOM
TBT Shared SF Instance with Flyland HIGH Add owner/record-type filters to all SF 
reads/writes
TAKAHA
MI RingCentral, not CTM CRITICAL Rebuild call triggers around RingCentral web 
app DOM
TAKAHA
MI CollaborateMD not in plan CRITICAL Build CMD-specific RPA profile for 
claims/status/appeals
TAKAHA
MI KIPU EHR missing from plan HIGH Add KIPU as fallback data source for clinical 
fields
EMB Adobe Acrobat, not pdfplumber CRITICAL Use Acrobat JS macros or PyAutoGUI for 
form-filling
EMB Elevate billing portal missing HIGH Add Elevate as primary data source / write-
back target
EMB Availity + VerifyTx are specific 
portals HIGH Build dedicated RPA profiles for each portal
EMB TurboScribe already handles STT MEDIUM Remove STT build; use TurboScribe exports 
as input
BANYAN Tracker is Google Form, not web 
app HIGH Use Google Form URL pre-fill or direct 
Sheets write
BANYAN Ticketing is Power Apps HIGH Use ARIA selectors + slow-type for Power 
Apps inputs
LEGACY ZOHO SalesIQ needs specific 
profile MEDIUM Build SalesIQ DOM profile for chat extension
FLYLAN
D ZOHO Mail differs from SalesIQ LOW Separate ZOHO Mail DOM profile from 
SalesIQ profile

## Page 3

Detailed Conflict Findings
TBT  —  TBT Has No CTM — Uses Salesforce Lightning as Primary System CRITICAL
What the plan 
assumed
Plan assumes CTM (calltrackingmetrics.com) for call event detection, DOM 
monitoring, and outbound dial automation in TBT.
What actually 
exists
TBT's listed 'CTM' URL resolves to https://wethebest.lightning.force.com — a 
Salesforce Lightning instance, not Call Tracking Metrics. TBT does not appear to 
use CTM at all.
Impact on plan
All TBT automations that hook into CTM DOM (lead routing, call detection, wrap-up 
triggers) will have no target system. The entire call-tracking layer needs to be rebuilt 
around Salesforce Lightning.
Recommended fix
Re-target all TBT call-event automations to Salesforce Lightning DOM 
(wethebest.lightning.force.com). Use Salesforce Lightning's activity timeline and lead 
views as the data source instead of CTM. Chrome extension selectors need to be 
written for SF Lightning UI, not CTM.
Specific action items:
• Auto-Lead Pruning: CSV export trigger should come from SF Lightning's lead list view, not CTM
• Auto-Lead/Number Pull & Routing: read incoming activity from SF Lightning dashboard, not CTM call 
notification
• Note Templates: disposition triggers should fire on SF Lightning activity record save, not CTM wrap-up
TBT  —  TBT and Flyland Share the Same Salesforce Instance HIGH
What the plan 
assumed
Plan treats Flyland and TBT as having separate, independent Salesforce CRM 
environments.
What actually 
exists
Both Flyland and TBT point to the same SF org: flyland.my.salesforce.com. TBT's 
'CRM' entry is the same URL as Flyland's.
Impact on plan
Any automation that creates, updates, or reads SF records for TBT will be operating 
inside Flyland's SF instance. Data scoping must be enforced carefully to avoid 
cross-client record contamination. Shared SF also means one Chrome extension 
config can serve both — reducing deployment work but increasing risk.
Recommended fix
Add record-type or owner-based filters to all SF DOM reads for TBT. Confirm with 
client whether TBT uses a separate SF account owner or record type to distinguish 
their leads. Update field-mapping configs to include a client/team identifier filter.
Specific action items:
• SF DOM scraper must filter by TBT-specific owner, account type, or custom field before reading/writing
• New lead auto-creation must assign to correct TBT owner/queue to avoid mixing with Flyland records
• Single Chrome extension deployment can cover both clients if selector configs are kept separate per 
subdomain path
TAKAHAMI  —  Takahami Uses RingCentral, Not CTM — Completely 
Different Call System CRITICAL

## Page 4

What the plan 
assumed
Plan references CTM DOM monitoring for call events and assumes a generic 'online 
fax portal' for appeal submissions.
What actually 
exists
Takahami uses RingCentral (ringcentral.com) as their calling app — no CTM at all. 
RingCentral also has built-in fax capability via its web interface.
Impact on plan
All call-event triggers in the plan target CTM DOM elements that don't exist in 
Takahami's stack. The fax workaround (navigating to a separate fax portal) is 
unnecessary — RingCentral's own web app can send faxes.
Recommended fix
Rewrite Takahami's call-event detection to monitor RingCentral web app DOM 
(app.ringcentral.com). For fax submissions, automate directly within RingCentral's 
fax interface using Playwright — the agent is already logged in. This is actually 
simpler than using a third-party fax portal.
Specific action items:
• Auto-Fax for Appeals: use Playwright to navigate RingCentral web → Fax → attach document → fill 
recipient from local carrier directory JSON → send
• Claim Status Updater: target CollaborateMD DOM (see conflict below), not a generic billing portal
• Negotiation Reply Suggester: read carrier responses from email client open in browser (Outlook/Gmail), not 
a generic message thread
TAKAHAMI  —  CollaborateMD is the Billing/Claims System — Not in Plan CRITICAL
What the plan 
assumed
Plan refers to a generic 'billing portal' for claim lookups and status changes without 
naming the specific system.
What actually 
exists
Takahami uses CollaborateMD (CMD) at app.collaboratemd.com for all billing, 
claims follow-up, and status management. This is a specialized medical billing 
platform with its own specific DOM structure.
Impact on plan
The Claim Status Updater, Appeal Router, and Negotiation Form-Filler all need to 
operate inside CollaborateMD's UI. Generic selectors will not work. CollaborateMD 
has specific claim list views, status dropdowns, and appeal workflows that need 
dedicated Playwright/extension profiles.
Recommended fix
Build a CollaborateMD-specific RPA profile: map the DOM selectors for claim list 
view, claim detail fields (billed amount, allowed amount, status dropdown), and 
appeal submission flow. Store as a named portal profile in the extension config.
Specific action items:
• Claim lookup: target CollaborateMD claims follow-up page DOM for billed/allowed amount fields
• Status change: find and interact with CollaborateMD's status dropdown (PAID → UNDERPAID) via DOM
• Appeal Router: read claim type from CollaborateMD claim detail page, not a generic portal
• Cheat Sheet (Excel on SharePoint): use this existing resource as the carrier fax directory instead of building 
a new JSON file
TAKAHAMI  —  KIPU EHR System Not Accounted For in Plan HIGH
What the plan 
assumed Plan does not reference any EHR (Electronic Health Record) system for Takahami.
What actually 
exists
Takahami uses KIPU EHR (lhc10828.kipuworks.com) alongside CollaborateMD. 
Patient clinical data lives in KIPU, while billing/claims live in CollaborateMD. 
Negotiation and appeal work may require cross-referencing both.

## Page 5

Impact on plan
Negotiation form-filling and claim lookup automations may need to pull patient data 
from KIPU if the CollaborateMD record doesn't contain all required fields. Missing 
this system could result in incomplete form fills.
Recommended fix
Add KIPU as a secondary data source for Takahami automations. When negotiation 
form-filler runs, check if required fields (e.g., diagnosis codes, treatment dates) are 
available in CollaborateMD first; if not, trigger a KIPU DOM lookup as a fallback. 
Build a KIPU portal profile in the extension config.
Specific action items:
• Negotiation Form-Filler: add KIPU fallback lookup for clinical fields not present in CollaborateMD
• KIPU DOM profile: map patient lookup by name/ID, extract relevant clinical fields
• Carrier fax directory: already exists in the SharePoint Cheat Sheet — scrape that instead of building from 
scratch
EMB  —  EMB Uses Adobe Acrobat — Not pdfplumber/pdfrw CRITICAL
What the plan 
assumed
Plan proposes using Python libraries (pdfplumber, pdfrw) to programmatically read 
and write PDF form fields for the PDF Auto-Filler.
What actually 
exists
Element Medical Billing uses Adobe Acrobat (both desktop and web at adobe.com). 
Specialists open, fill, and save PDFs inside Acrobat — not in a browser or via 
Python scripts.
Impact on plan
The PDF auto-fill approach in the plan won't integrate with Acrobat's workflow. 
Agents don't open PDFs in a browser — they open them in Acrobat desktop app. 
Python file-write approach would create a separate file the agent hasn't opened, 
breaking their workflow.
Recommended fix
Two viable workarounds: (1) Use PyAutoGUI to detect when Acrobat opens a PDF, 
then simulate Tab/field navigation and typing within Acrobat's form fill interface. (2) 
Use Acrobat's built-in JavaScript API (Acrobat supports JS macros) to auto-fill fields 
when a form opens — no external tool needed, runs inside Acrobat itself. Option 2 is 
more stable.
Specific action items:
• Primary approach: Acrobat JavaScript action that fires on form open, reads patient data from clipboard or a 
local data file, and auto-populates standard fields
• Fallback: PyAutoGUI desktop automation that detects Acrobat window, maps field tab-order, and types in 
values
• pdfplumber/pdfrw can still be used for the Template Generator (generating blank template files), but not for 
live form-filling inside Acrobat
EMB  —  Elevate Billing Portal Not in Plan HIGH
What the plan 
assumed Plan does not mention Elevate as a system for EMB. No automation targets it.
What actually 
exists
EMB uses Elevate (elevate.serverdata.net) as their billing system. This is likely 
where VOB results and patient billing records are stored and updated post-
verification.
Impact on plan
Post-call system updates and data sources for PDF auto-fill may need to pull from or 
write to Elevate, not just SF. If Elevate is the primary data store (not SF), all DOM-
scraping for patient data needs to target Elevate's interface.

## Page 6

Recommended fix
Add Elevate as a data source portal in the RPA stack. Build a Playwright/extension 
profile for Elevate's patient lookup and record update flows. Determine with client 
whether Elevate or SF is the primary patient data source for form-filling — this 
changes where the extension reads from.
Specific action items:
• PDF Auto-Filler: if patient data lives in Elevate (not SF), DOM scraper must target Elevate's patient detail 
page instead
• Portal Integration: add Elevate to the list of systems the wrap-up sync writes back to
• Elevate profile: map DOM selectors for patient ID lookup, insurance fields, and record update flow
EMB  —  Availity and VerifyTx Are the Specific Insurance/Verification 
Portals HIGH
What the plan 
assumed
Plan references 'insurance portals' and 'verification portals' generically, proposing 
Selenium scraping with URL-pattern detection.
What actually 
exists
EMB specifically uses Availity (availity.com) for insurance lookups and VerifyTx 
(app.verifytx.com) for benefits verification. These are the two concrete portals that 
need RPA profiles.
Impact on plan
Generic portal profiles won't work — each portal has unique DOM structure, login 
flows, and result page layouts. Without Availity and VerifyTx-specific selector maps, 
the scraper won't know where to find eligibility data.
Recommended fix
Build dedicated Playwright/extension profiles for Availity and VerifyTx. Map the 
eligibility lookup flow, result fields (deductible, copay, coverage status), and cache 
structure for each. These become the two concrete portal targets replacing the 
generic 'insurance portal' reference in the plan.
Specific action items:
• Availity profile: map eligibility search page, member ID field, and coverage result DOM selectors
• VerifyTx profile: map verification request flow and benefit result extraction
• Cache layer: store results per policy ID with 24hr expiry in localStorage
• Reminder engine: trigger 'Check deductible' and 'Check out-of-network' pop-ups based on Availity/VerifyTx 
result fields
EMB  —  TurboScribe Already Handles Transcription — Don't Rebuild STT MEDIUM
What the plan 
assumed
Plan proposed building or integrating a speech-to-text solution (Google STT or local 
model) for note generation and call summarization.
What actually 
exists
EMB already uses TurboScribe (turboscribe.ai) for transcription. Agents already 
have a working transcription pipeline.
Impact on plan
Building a separate STT layer is wasted effort. More importantly, TurboScribe 
outputs are likely already saved as text files or accessible via the TurboScribe 
dashboard — these outputs can be used directly as input to the note summarizer 
and auto-fill automations.
Recommended fix
Remove STT from EMB's scope. Instead, build the note summarizer to ingest 
TurboScribe's output: (1) File watcher monitors TurboScribe's download/export 
folder for new transcript files, (2) Local NLP model summarizes the transcript text, 
(3) Summary injected into Elevate/SF note field. No STT development needed.

## Page 7

Specific action items:
• File watcher: monitor TurboScribe export folder for new .txt/.docx transcript files
• Auto-Note: feed TurboScribe transcript into local summarizer (DistilBERT) instead of building STT
• Remove Google STT and LibreTranslate from EMB's deployment requirements
BANYAN  —  Banyan's Tracker is a Google Form — Cannot Be Auto-Filled 
Like a Web App HIGH
What the plan 
assumed
Plan assumes the call tracker is a tab-based web interface (like a spreadsheet or 
internal dashboard) that can be updated via DOM injection or simulated input after 
each call.
What actually 
exists
Banyan's tracker is a Google Form (specific URL: docs.google.com/forms/…). 
Google Forms are submit-only inputs — they cannot be pre-populated via URL 
parameters in the standard embed and each submission creates a new response 
row.
Impact on plan
The 'multi-tab wrap-up sync' approach (navigating to tracker tab and filling fields) still 
works, but Google Forms have specific DOM structures. The form fields are 
rendered differently from a regular web app, and the submit action creates a new 
row in the linked Google Sheet — which is actually what we want.
Recommended fix
The Google Form can be auto-filled using URL query parameters (Google Forms 
supports ?entry.FIELD_ID=VALUE pre-fill via URL). Build the automation to 
construct a pre-filled Google Form URL from wrap-up data, open it in a tab, and 
auto-submit — cleaner than DOM injection. Alternatively, write directly to the linked 
Google Sheet via Playwright if agents have edit access.
Specific action items:
• Wrap-up auto-sync: construct pre-filled Google Form URL using field entry IDs + wrap-up data, open and 
auto-submit
• Map Banyan Tracker form field entry IDs (inspectable from form source) to CTM wrap-up fields
• Alternative: if agents have Google Sheets edit access, Playwright can write directly to the linked Sheet, 
bypassing the form entirely
• Either approach eliminates manual form submission without needing Google Sheets API
BANYAN  —  Banyan's Ticketing is Power Apps — Complex DOM, Not a 
Standard Web Form HIGH
What the plan 
assumed
Plan refers to 'admission ticket form' generically, assuming standard HTML form 
fields that can be auto-filled via DOM manipulation or simulated input.
What actually 
exists
Banyan uses a Power Apps canvas app (apps.powerapps.com) for ticketing. Power 
Apps renders controls as custom elements — not standard HTML inputs — making 
DOM injection unreliable. Fields are rendered in an iframe-based canvas with 
custom event handling.
Impact on plan
Standard DOM injection and simulated typing are less reliable in Power Apps. Power 
Apps controls intercept keyboard events differently from normal HTML inputs, which 
can cause automation to miss fields or trigger validation errors.
Recommended fix Use PyAutoGUI (coordinate-based clicking and typing) as the primary approach for 
Power Apps, since DOM manipulation is unreliable. Alternatively, use Playwright 
with a slow-type approach (character-by-character input with delays) which Power 

## Page 8

Apps controls tend to accept. Map field positions or use accessibility tree (ARIA 
labels) as selectors instead of CSS selectors.
Specific action items:
• Power Apps form-fill: use Playwright with accessibility tree selectors (aria-label attributes) rather than CSS 
DOM selectors
• Slow-type mode: type characters with 50ms delay between keystrokes to avoid Power Apps input race 
conditions
• Fallback: PyAutoGUI coordinate-based clicking for fields where ARIA selectors are unavailable
• Pre-fill data source: read caller info from the SF pop-up overlay already shown during the call
LEGACY  —  Legacy's Chat System is ZOHO SalesIQ — Needs Specific 
DOM Profile MEDIUM
What the plan 
assumed
Plan refers to 'chat window DOM' and 'active chat window content' generically for the 
chat reply suggester.
What actually 
exists
Legacy uses ZOHO SalesIQ (zoho.com/salesiq) for chat — a specific platform with 
its own DOM structure, message thread layout, and input field implementation. 
Flyland also uses ZOHO but via ZOHO Mail/Chat (different product).
Impact on plan
The Chrome extension's chat reader needs ZOHO SalesIQ-specific CSS selectors 
to find the message thread and input field. Generic selectors won't work across 
different chat platforms.
Recommended fix
Build a ZOHO SalesIQ-specific DOM profile for the chat reply suggester extension. 
Map the CSS selectors for: incoming message container, conversation thread, and 
reply input field. This is a straightforward selector mapping — ZOHO SalesIQ's web 
app has inspectable, stable DOM classes.
Specific action items:
• Extension config: add 'zoho.com/salesiq' as a recognized URL pattern with SalesIQ-specific selectors
• Flyland uses ZOHO Mail/Chat (different product) — needs a separate selector profile for zoho.com/mail
• Reply suggestion logic is identical — only the DOM selectors differ between SalesIQ and ZOHO Mail
FLYLAND  —  Flyland Uses ZOHO Mail/Chat — Different From ZOHO 
SalesIQ Used by Legacy LOW
What the plan 
assumed
Plan groups chat automation generically without distinguishing between ZOHO 
products.
What actually 
exists
Flyland uses ZOHO Mail (zoho.com/mail) for chat, while Legacy uses ZOHO 
SalesIQ — these are different ZOHO products with different DOM structures.
Impact on plan Minor — both are ZOHO products accessible via browser, but the chat thread DOM 
and input field selectors will differ between ZOHO Mail and ZOHO SalesIQ.
Recommended fix
Create separate DOM selector profiles for ZOHO Mail (Flyland) and ZOHO SalesIQ 
(Legacy) in the Chrome extension config. The suggestion logic is shared — only the 
selectors are client-specific.
Specific action items:
• Extension: two ZOHO profiles — one for zoho.com/mail (Flyland), one for zoho.com/salesiq (Legacy)

## Page 9

• Shared suggestion engine; client-specific DOM mapping configs

## Page 10

Revised System Map by Client
Updated reference showing actual tools per client and their automation role after resolving conflicts.
Flyland Recovery
System Tool Automation Role Status
Call Tracking
CTM 
(calltrackingmetrics.co
m)
Call event trigger, DOM monitoring for incoming 
calls
 ✓
Confirmed
CRM
Salesforce 
(flyland.my.salesforce.
com)
Account pop-up, note injection, lead creation — 
shared with TBT, apply data filters
 Shared ⚠
w/ TBT
Chat ZOHO Mail/Chat 
(zoho.com/mail)
Chat reply suggester — needs ZOHO Mail-specific 
DOM profile
 Needs ⚠
profile
TBT
System Tool Automation Role Status
Call / CRM
Salesforce Lightning 
(wethebest.lightning.fo
rce.com)
Call activity detection, lead routing, wrap-up 
triggers — NO CTM
 Plan ✗
wrong
CRM 
(shared)
Salesforce 
(flyland.my.salesforce.
com)
Shared SF org with Flyland — must filter by TBT 
owner/record type
 Filter ⚠
needed
Takahami
System Tool Automation Role Status
Calling / Fax RingCentral 
(ringcentral.com)
Call event triggers + fax submission via 
RingCentral web app — replaces CTM and third-
party fax
 Plan ✗
wrong
Billing / 
Claims
CollaborateMD 
(app.collaboratemd.co
m)
Claim lookup, status update, appeal workflow — 
needs dedicated RPA profile
 Not in ✗
plan
EHR
KIPU 
(lhc10828.kipuworks.c
om)
Clinical data fallback for negotiation form-filling  Not in ✗
plan
Reference Cheat Sheet (Excel on 
SharePoint)
Use as carrier fax directory — replaces building a 
new JSON config
 Use ✓
existing
Document 
Mgmt
SharePoint (Takahami 
Billing) Appeal document storage and retrieval for auto-fax  ✓
Confirmed

## Page 11

Element Medical Billing
System Tool Automation Role Status
PDF Adobe Acrobat Form-filling via Acrobat JS macros or PyAutoGUI 
— replaces pdfplumber/pdfrw for live fills
 Plan ✗
wrong
Billing
Elevate 
(elevate.serverdata.net
)
Primary patient data source for form-filling and 
post-call record updates
 Not in ✗
plan
Insurance Availity (availity.com) Insurance eligibility lookup — primary portal RPA 
target
 Generic⚠  
in plan
Verification VerifyTx 
(app.verifytx.com)
Benefits verification portal — secondary portal RPA 
target
 Not in ✗
plan
Transcription TurboScribe 
(turboscribe.ai)
Existing STT — use export files as input to note 
summarizer, no new STT needed
 Use ✓
existing
Document 
Mgmt
SharePoint + Office 
365 Appeal document storage, template management  ✓
Confirmed
Banyan
System Tool Automation Role Status
Call Tracking
CTM 
(calltrackingmetrics.co
m)
Call event trigger, DOM monitoring  ✓
Confirmed
CRM
Salesforce 
(banyan.lightning.force
.com)
Account pop-up, record updates — separate SF 
instance from Flyland/TBT
 ✓
Confirmed
Tracker Banyan Tracker 
(Google Form)
Pre-fill via URL params or direct Google Sheets 
write — not standard tab automation
 ⚠
Approach 
change
Ticketing Power Apps 
(apps.powerapps.com)
Use ARIA selectors + slow-type mode — not 
standard DOM injection
 ⚠
Approach 
change
Reporting Google Sheets Reporting data source, Playwright write target  ✓
Confirmed
Communicati
on MS Teams Internal transfer alerts, escalation notifications  ✓
Confirmed
Legacy
System Tool Automation Role Status
Call Tracking
CTM 
(calltrackingmetrics.co
m)
Call event trigger, wrap-up monitoring  ✓
Confirmed
CRM Salesforce History auto-pull, record updates  ✓
Confirmed
Chat ZOHO SalesIQ Chat reply suggester — needs SalesIQ-specific  Needs ⚠

## Page 12

System Tool Automation Role Status
(zoho.com/salesiq) DOM profile profile
Reporting Google Sheets Wrap-up sync write target  ✓
Confirmed
Communicati
on MS Teams Internal team notifications  ✓
Confirmed
AST Automation Plan — Tech Stack Conflict Analysis  |  Confidential  |  March 2026


---

# AST_Automation_Implementation_Plan_v2.pdf

## Page 1

AST AUTOMATION
IMPLEMENTATION PLAN  v2.0
RPA & No-Credential Approach  |  6 Clients  |  17 Automations
Version 2.0  |  March 2026  |  Confidential
6
Clients
17
Automations
2
Phases
0
Client Credentials 
Required

## Page 2

Executive Summary
This document is the updated automation implementation plan for six AST client operations. All automation 
approaches have been revised to use RPA (Robotic Process Automation) and browser-session-based 
methods — eliminating the need to request API credentials, backend access, or system integrations from 
any client.
The core principle: agents are already logged into every system they use (SF, CTM, billing portals, trackers). 
All automations work on top of these active sessions using browser extensions, screen scraping, DOM 
interaction, local scripts, and simulated input — operating entirely on data that is already visible on the 
agent's screen or machine.
RPA-First Architecture Principles
• No API credentials, tokens, or backend access required from any client
• Works on existing agent login sessions — piggybacks on authenticated browsers
• All NLP/AI processing runs locally on the agent's machine — no cloud data exposure
• Config files (JSON) allow team leads to update rules, templates, and mappings without developer help
• Browser extensions (Chrome/Edge) + desktop Python scripts = zero server infrastructure required
• Fallback to manual always available — automation assists, never blocks the agent
Core RPA Toolstack
Tool / Library Use Case Why No Credentials Needed
Playwright / Selenium Multi-tab browser automation, 
form filling, navigation
Uses agent's existing authenticated browser 
session
Chrome Extension 
(Content Scripts)
DOM reading, overlay injection, 
event detection
Runs inside the browser, reads page 
content directly
PyAutoGUI / AutoIt Desktop-level clicks, keystrokes, 
hotkey triggers
Simulates user input — no system access 
required
Tesseract OCR Read data from screens, PDFs, 
portal images Purely local image processing, offline
Python watchdog Monitor Downloads folder for 
CSV/PDF exports
File system watcher, no network access 
needed
pdfplumber / pdfrw Read and write PDF form fields Local file manipulation, no PDF service 
needed
DistilBERT / spaCy 
(local)
Note summarization, call 
classification
Model runs on-device — no API calls, no 
data sent externally
LibreTranslate (offline) Non-English call/note translation Self-hosted local instance, no cloud 
translation API
Phased Rollout Overview
Phase Timeline Focus Areas Clients
Phase 1 Foundation & CTM-SF session-based pop-ups, auto-note All 6 clients

## Page 3

Phase Timeline Focus Areas Clients
(Weeks 1–6) Quick Wins
generators, wrap-up multi-tab sync, lead pruning 
via CSV watcher, auto-fax via portal RPA, PDF 
auto-filler
Phase 2 
(Weeks 7–14)
Intelligence 
Layer
AI reply/note suggesters (local NLP), queue 
prioritizer overlay, negotiation form-filler, portal 
scraping with cache, template generator app
All 6 clients
Phase 3 
(Weeks 15–20)
Tuning & 
Expansion
Model accuracy tuning, new portal profiles, team-
lead config UIs, field-mapping updates, user 
feedback loops
Legacy, Banyan, 
TBT

## Page 4

Flyland Recovery
Addiction counseling center facing manual SF lookups, note duplication between CTM and SF, and 1–2 
hour transfer waits to US reps. Specialists handle 50–100% of shifts on calls/chats across night/morning/mid 
shifts.
Pain Points
• Manual SF account lookups take 1–3 mins per call with slow load times
• Notes duplicated across both CTM and SF systems post-call
• Transfer waits to US reps up to 2 hours (10–20 min queue)
• Repetitive note-typing for unqualified or duplicate callers
• Manual chat replies typed individually per interaction
Automation Summary
Automation Priority Effort Phase Business Impact
CTM-SF Auto-Account Access HIGH Medium Phase 
1
Saves 1–3 mins per call; zero 
credential exposure
Auto-Note Generator for 
Unqualified/Duplicates HIGH Medium Phase 
1
Eliminates 1–2 mins of note typing per 
unqualified/duplicate call
Chat Reply Suggester & Form 
Auto-Filler
MEDIU
M
Low-
Medium
Phase 
2
Reduces 1–3 mins chat writing + 1 min 
form fill per interaction
Automation Detail Specs
CTM-SF Auto-Account Access
Priority HIGH
Phase Phase 1
Effort Level Medium
Inputs Caller phone number visible on CTM screen
Outputs SF account auto-opened in adjacent browser tab/panel
Technical Approach
Browser extension (Chrome/Edge) detects incoming call UI in CTM via DOM 
monitoring. Extracts caller number from CTM's call notification element. Auto-
opens SF search URL in a side panel pre-filled with the number — no 
credentials needed, agent is already logged into SF. Extension reads the 
resulting SF page and surfaces key fields (name, history, last contact) in a 
floating overlay.
Edge Cases No SF match: extension shows 'New Lead' button that pre-fills SF new lead 
form with phone number. Slow SF page: timeout with manual fallback notice.
Testing Criteria Record/replay testing via Playwright; verify panel appears within 2s of call 
notification.
Business Impact Saves 1–3 mins per call; zero credential exposure

## Page 5

  RPA / No-Credential Approach⚙
• Chrome Extension with content script monitors CTM DOM for call events
• Playwright/Selenium script triggered on call-start reads the phone number from screen
• Opens SF in existing browser session using pre-built search URL pattern
• Overlay panel injects into browser — reads SF DOM, no SF API required
• Duplicate detection: scans SF search results page for multiple matches and alerts agent
Auto-Note Generator for Unqualified/Duplicates
Priority HIGH
Phase Phase 1
Effort Level Medium
Inputs Call transcript text (from screen/clipboard), disposition selected in CTM
Outputs Draft note pre-filled in SF/CTM note field
Technical Approach
Desktop listener monitors CTM's disposition dropdown selection. On 
'Unqualified' or 'Duplicate' selection, reads any transcript text visible on screen 
via DOM scraping or clipboard capture. Runs local NLP (spaCy/transformers 
offline model) to classify and generate summary note. Injects generated note 
text directly into the SF/CTM notes field via simulated keystrokes (PyAutoGUI) 
or DOM injection.
Edge Cases Complex or emotional content: skip auto-note, flag for manual. Low transcript 
confidence: show draft with 'Review before posting' prompt.
Testing Criteria Replay recorded dispositions; validate 80% of drafts accepted without edits.
Business Impact Eliminates 1–2 mins of note typing per unqualified/duplicate call
  RPA / No-Credential Approach⚙
• PyAutoGUI or Playwright detects disposition field change in CTM
• Screen region OCR (Tesseract) or clipboard monitor captures transcript text
• Local NLP model (spaCy or lightweight BERT) classifies call type offline — no cloud API
• Generated note injected into note field via DOM manipulation or simulated typing
• Empathy flags preserved: keywords like 'crisis', 'distress' skip automation and alert agent
Chat Reply Suggester & Form Auto-Filler
Priority MEDIUM
Phase Phase 2
Effort Level Low-Medium
Inputs Active chat window content (screen), form type visible on screen
Outputs Suggested replies in floating panel; form fields populated
Technical Approach Chrome extension reads chat window DOM to extract conversation context. 
Matches keywords against a local template library (JSON file on agent's 
machine) to surface 2–3 reply suggestions in a non-intrusive sidebar. For 
admission forms, detects form type by page URL or field labels and auto-fills 

## Page 6

using data already visible in the open SF record.
Edge Cases Long chats: summarize last 5 messages only for context. Unrecognized form: 
skip auto-fill, show manual prompt.
Testing Criteria Measure reply selection rate and time-to-send before/after.
Business Impact Reduces 1–3 mins chat writing + 1 min form fill per interaction
  RPA / No-Credential Approach⚙
• Chrome content script reads chat DOM in real-time for keyword matching
• Local JSON template library — no external service needed
• Form filler reads field labels via DOM, matches to SF data already on screen
• One-click 'Insert' button pastes suggestion into chat input field
• Offline mode: templates cached locally, works without internet connectivity

## Page 7

Legacy
Multi-channel contact center with post-call duplication across CTM, SF, chatter, and separate trackers. 
Agents spend significant time re-entering identical data across systems after every interaction.
Pain Points
• Same disposition entered manually into CTM, SF, chatter, and tracker
• Customer history requires manual SF lookup per call (2–5 mins, slow load)
• Repetitive form fills and tagging after every interaction
• Long US rep approval queues (3 mins to 1 hour)
• Repeat callers re-entered by different agents
Automation Summary
Automation Priority Effort Phase Business Impact
Wrap-Up Auto-Sync Across 
Systems HIGH High Phase 
1
Eliminates 1–2 hrs/shift of redundant 
data entry
Customer History Auto-Pull & 
Reminders HIGH Medium Phase 
1
Saves 2–5 mins of manual lookup per 
call
Form-Filler, Note Summarizer 
& AI Queue Prioritizer
MEDIU
M High Phase 
2
Reduces wrap-up and triage time by 
an estimated 30–50%
Automation Detail Specs
Wrap-Up Auto-Sync Across Systems
Priority HIGH
Phase Phase 1
Effort Level High
Inputs Wrap-up form data visible on screen after call ends
Outputs Same data automatically entered into all other open system tabs
Technical Approach
After agent completes wrap-up in primary system (CTM), a desktop automation 
script reads the submitted form data from the confirmation screen using DOM 
scraping. It then switches to each other open browser tab (SF, chatter, tracker) 
and fills matching fields via simulated input. Uses a field-mapping config file 
(maintained locally) to match field names across systems. No credentials 
needed — agent is already logged into all tabs.
Edge Cases Tab not open: skip with alert to agent. Conflicting existing data: highlight and 
ask agent before overwriting.
Testing Criteria End-to-end simulation across all 4 systems; verify zero duplicate entries.
Business Impact Eliminates 1–2 hrs/shift of redundant data entry
  RPA / No-Credential Approach⚙

## Page 8

• Playwright multi-tab controller: identifies open tabs by URL pattern
• Reads wrap-up data from CTM confirmation page DOM
• Field mapping config (local JSON) maps CTM field names to SF/chatter/tracker equivalents
• Simulated typing + tab navigation fills each system sequentially
• Duplicate detection: checks if record already exists by scanning page before writing
Customer History Auto-Pull & Reminders
Priority HIGH
Phase Phase 1
Effort Level Medium
Inputs Caller ID visible in CTM call notification
Outputs SF history panel auto-opened; reminder pop-ups on screen
Technical Approach
Chrome extension detects incoming call in CTM DOM. Extracts phone number 
and auto-navigates SF (already open) to the caller's record using SF's built-in 
search. Reads resulting page data and builds a lightweight history summary 
card injected as an overlay. Rule-based reminder engine (local config) checks 
for conditions like 'unqualified' status and surfaces pop-up reminders.
Edge Cases Slow SF load: show progress bar and partial results. Sensitive fields: audit log 
entry written to local file.
Testing Criteria Validate reminders fire correctly for all configured rule conditions.
Business Impact Saves 2–5 mins of manual lookup per call
  RPA / No-Credential Approach⚙
• Content script polls CTM DOM for active call state changes
• Auto-navigates SF search using extracted phone number — uses existing login session
• Overlay card reads SF DOM fields: name, last contact date, status, notes
• Local rules engine (JSON config): maps SF status values to reminder messages
• Progress indicator shown during SF page load; partial data displayed immediately
Form-Filler, Note Summarizer & AI Queue Prioritizer
Priority MEDIUM
Phase Phase 2
Effort Level High
Inputs Queue list visible in CTM, notes text on screen, form fields on active page
Outputs Sorted queue display overlay, note summaries, auto-filled form fields
Technical Approach Three coordinated components: (1) Form filler reads active form's field labels 
via DOM and fills from data visible in open SF tab. (2) Note summarizer runs 
locally using a lightweight transformer model (e.g., DistilBERT) on note text 
copied to clipboard — outputs summary under 100 words injected back. (3) 
Queue prioritizer reads CTM queue list via DOM, scores items using keyword 

## Page 9

rules (crisis terms = high urgency), re-renders a sorted visual overlay on top of 
CTM.
Edge Cases Queue > 10: cap display at top 10 by urgency. Abstract content: fallback to full 
text display.
Testing Criteria Verify complex/crisis cases consistently rank at top of queue.
Business Impact Reduces wrap-up and triage time by an estimated 30–50%
  RPA / No-Credential Approach⚙
• DOM-based form filler with local field-mapping config file
• Clipboard hook captures note text; local transformer model summarizes offline
• CTM queue DOM scraper reads caller info, wait time, and any visible notes
• Urgency scoring via local keyword list (configurable JSON)
• Queue overlay rendered as floating browser panel — does not modify CTM data

## Page 10

TBT
Outbound-heavy operation (40–50% OB calls) dealing with old FB form leads and hourly dial cycles. ASTs 
spend half their shift dialing unresponsive leads and manually managing SF/CTM updates.
Pain Points
• Hourly outbound dials to leads with no response for weeks or months
• SF/CTM duplication across notes, trackers, VOB records
• Inbound routing lacks equal load balancing
• SMS fallback to voicemail managed manually
• Insurance verification is manual with no status checker
Automation Summary
Automation Priority Effort Phase Business Impact
Auto-Lead Pruning & Dial/SMS 
Automation HIGH Medium Phase 
1
Saves 2–3 hrs/shift on dead-lead 
outbound cycles
Auto-Lead Pull & Inbound 
Routing HIGH Medium Phase 
1
Eliminates manual routing decisions 
and lead lookup overhead
Text Reply Suggester, Note 
Templates & Insurance Status 
Checker
MEDIU
M Medium Phase 
2
Reduces note-writing and insurance 
verification by 3–5 mins per call
Automation Detail Specs
Auto-Lead Pruning & Dial/SMS Automation
Priority HIGH
Phase Phase 1
Effort Level Medium
Inputs Lead list exported from SF/CTM as CSV (standard export agents already do)
Outputs Filtered lead list, auto-dial sequence, SMS drafts queued
Technical Approach
Agent exports lead list from SF/CTM as CSV (existing workflow). A local Python 
script watches the Downloads folder for new CSV exports, parses them 
automatically, and filters out leads with last_contact older than threshold 
(configurable, default 14 days). Cleaned list is loaded into CTM's predictive 
dialer by simulating the import UI. For voicemail-detected calls, SMS templates 
are auto-drafted and queued in the messaging tool using DOM injection.
Edge Cases Partial responses (e.g., 1 text back): flag lead, exclude from prune. Bulk prune: 
batch in chunks of 100.
Testing Criteria Simulate 200-lead list; verify 50%+ reduction in dialer queue.
Business Impact Saves 2–3 hrs/shift on dead-lead outbound cycles

## Page 11

  RPA / No-Credential Approach⚙
• Local file watcher (Python watchdog) monitors Downloads folder for SF/CTM CSV exports
• Pandas-based CSV parser applies prune rules — runs fully offline
• Playwright bot imports filtered list into CTM dialer via the existing import UI
• Voicemail detection: monitors CTM call result field; on VM result, opens SMS tool and pre-fills 
template
• Batch limit: 100 leads per run to avoid overwhelming the dialer
Auto-Lead Pull & Inbound Routing
Priority HIGH
Phase Phase 1
Effort Level Medium
Inputs Incoming call notification visible in CTM, agent status visible on screen
Outputs Lead data pre-loaded in SF; call routed to next available agent
Technical Approach
Chrome extension reads incoming call data from CTM notification DOM. 
Simultaneously reads agent status panel (also in CTM DOM) to identify 
available agents. Round-robin state maintained in a local JSON file on the 
machine. Extension auto-opens matching SF lead in a side panel. Routing 
suggestion displayed to supervisor as an overlay — no backend change 
needed.
Edge Cases No lead found: show 'Create Lead' shortcut. All agents busy: display wait queue 
with ETA.
Testing Criteria Simulate 20 calls; verify even distribution across 5 agents.
Business Impact Eliminates manual routing decisions and lead lookup overhead
  RPA / No-Credential Approach⚙
• Content script reads CTM call queue and agent status DOM in real-time
• Round-robin state stored in localStorage or local JSON file — no backend needed
• SF lead lookup triggered by phone match using existing browser session
• Routing overlay shows supervisor which agent to assign next
• Unbalanced load alert: highlights agents above 2x average queue depth
Text Reply Suggester, Note Templates & Insurance Status Checker
Priority MEDIUM
Phase Phase 2
Effort Level Medium
Inputs Active SMS/chat window, note field on screen, insurance info visible in SF
Outputs Suggested texts, pre-filled note templates, qualified/unqualified badge
Technical Approach Chrome extension reads SMS/chat content from DOM and matches against 
local template library for suggestions. Note templates triggered by disposition 
selection in CTM — pre-fills note field with structured template. Insurance 

## Page 12

checker reads insurance name and member ID from SF record currently open, 
then uses Playwright to auto-navigate to the relevant insurance portal (agent 
already logged in) and scrapes the eligibility/coverage status.
Edge Cases Portal navigation fails: alert agent to check manually. Non-standard insurer: skip 
checker, show manual prompt.
Testing Criteria Target > 85% correct status reads across top 10 insurance portals used.
Business Impact Reduces note-writing and insurance verification by 3–5 mins per call
  RPA / No-Credential Approach⚙
• DOM reader for SMS window content; local template JSON for suggestions
• Disposition-triggered note template injection via simulated keystrokes
• Playwright navigates to insurance portal in new tab using agent's existing login
• Screen scraper reads eligibility result and displays qualified/unqualified badge in overlay
• Ambiguous results: prompt agent for manual confirmation before tagging

## Page 13

Takahami
Medical billing and claims negotiation team dealing with daily carrier contacts, lengthy claim lookups, manual 
fax submissions for appeals, and repetitive status updates per Date of Service.
Pain Points
• Manual fax submission for insurance appeals (5+ mins per submission)
• Daily carrier contacts for same accounts (repetitive, 1–2 hr waits)
• 20-minute claim lookups with double-check verification
• Status changes (PAID → UNDERPAID) done manually per claim
• Notation duplication per Date of Service in reports
Automation Summary
Automation Priority Effort Phase Business Impact
Auto-Fax for Appeals & Claim 
Status Updater HIGH Medium Phase 
1
Saves 5–10 mins per appeal; 
eliminates manual fax navigation
Claim-Type-Based Appeal 
Router HIGH Low Phase 
1
Eliminates manual destination lookup 
per claim; reduces routing errors
Negotiation Form-Filler & Reply 
Suggester
MEDIU
M Medium Phase 
2
Reduces 10–15 mins of drafting per 
negotiation/appeal
Automation Detail Specs
Auto-Fax for Appeals & Claim Status Updater
Priority HIGH
Phase Phase 1
Effort Level Medium
Inputs Appeal document open on screen (PDF viewer or web form), claim record open 
in billing portal
Outputs Fax queued and sent via online fax tool; claim status field updated
Technical Approach
Agent prepares appeal document as usual. RPA bot monitors for a 'Send 
Appeal' button click (or hotkey trigger). It captures the active PDF path from the 
browser download bar or file picker using screen OCR. Then it auto-navigates 
to the online fax portal the team already uses (agent is logged in), fills the 
recipient fax number (pulled from a local carrier fax directory JSON), attaches 
the file, and submits. Status update: bot reads current claim status in the billing 
portal DOM and changes it via UI interaction.
Edge Cases Fax portal session expired: alert specialist to re-login. Invalid status transition: 
validation check from local rules file.
Testing Criteria Full cycle simulation: prep doc → fax submission → status change → 
confirmation.
Business Impact Saves 5–10 mins per appeal; eliminates manual fax navigation

## Page 14

  RPA / No-Credential Approach⚙
• PyAutoGUI hotkey listener triggers fax workflow on specialist's command
• Screen OCR (Tesseract) identifies open PDF filename from title bar or download bar
• Playwright navigates existing fax portal session — no fax API credentials required
• Carrier fax directory: local JSON file mapping carrier names to fax numbers
• Claim status update: DOM interaction on billing portal — reads current value, selects new status 
from dropdown
Claim-Type-Based Appeal Router
Priority HIGH
Phase Phase 1
Effort Level Low
Inputs Claim record visible on screen in billing portal
Outputs Routing decision shown as overlay (fax number or email address)
Technical Approach
Chrome extension reads claim type, plan name, and payer fields from the billing 
portal DOM. Applies a local rule engine (JSON config: claim type → destination) 
to determine whether the appeal goes to local plan fax, home plan fax, or email. 
Displays the correct destination prominently as an overlay and pre-fills the 
fax/email tool accordingly. Config file is editable by team lead — no developer 
needed for rule updates.
Edge Cases Unknown type: default to manual with alert. Multi-plan claims: prompt agent to 
select plan.
Testing Criteria Target 100% routing accuracy for all known claim types in config.
Business Impact Eliminates manual destination lookup per claim; reduces routing errors
  RPA / No-Credential Approach⚙
• Content script reads claim type and payer fields from billing portal DOM
• Local routing rules config (JSON): editable by team lead without code changes
• Overlay card shows routing decision with one-click 'Use This' button
• Pre-fills fax number or email address in the communication tool already open
• Unknown claim type: display 'Manual Review Required' with routing guide link
Negotiation Form-Filler & Reply Suggester
Priority MEDIUM
Phase Phase 2
Effort Level Medium
Inputs Carrier response visible on screen (email/portal message), negotiation form 
open
Outputs Pre-filled negotiation form, suggested reply/next step in overlay
Technical Approach Chrome extension reads carrier response text from the open email or portal 

## Page 15

message DOM. Runs local keyword matching against a negotiation playbook 
(JSON config) to identify response type (e.g., 'denial', 'partial approval', 'request 
for info'). Surfaces 2–3 suggested next steps/reply templates. For the 
negotiation form, reads existing claim data from the open billing portal tab and 
injects it into the negotiation form fields using DOM manipulation.
Edge Cases Short/vague carrier response: default to general template. Complex 
negotiations: escalation button in overlay.
Testing Criteria Survey-based time reduction target: 1–2 hrs saved per shift.
Business Impact Reduces 10–15 mins of drafting per negotiation/appeal
  RPA / No-Credential Approach⚙
• DOM reader captures carrier response text from email client or portal message thread
• Local negotiation playbook (JSON): response patterns mapped to suggested actions
• Overlay panel shows ranked suggestions with 'Copy' and 'Insert' buttons
• Form filler reads claim fields from open billing portal tab; injects into negotiation form
• Complex cases: 'Escalate' button in overlay opens team lead chat with pre-filled context

## Page 16

Banyan
Addiction counseling center with inbound call inefficiencies. Specialist transfer waits (5–10 mins), duplicate 
data between tracker and SF, and limited caller info causing admission ticket delays.
Pain Points
• Manual SF lookup takes 1–2 mins per call with system latency
• Admission tickets created with limited caller info (70% of time)
• Transfer waits to specialist via group chat: 5–10 mins, up to 40% of shift
• Post-call tracker and SF updated separately (duplication every call)
• Repeat callers re-entered manually in SF
Automation Summary
Automation Priority Effort Phase Business Impact
CTM-SF Auto-Account Pop-Up HIGH Medium Phase 
1
Saves 1–2 mins per call; eliminates 
most common manual lookup
Auto-Call Tracking & 
Form/Note Auto-Fill HIGH High Phase 
1
Eliminates duplicate entry; saves 1–2 
mins of wrap-up per call
Note Summarizer & Reply 
Suggester
MEDIU
M Medium Phase 
2
Reduces review and response time; 
speeds up admissions workflow
Automation Detail Specs
CTM-SF Auto-Account Pop-Up
Priority HIGH
Phase Phase 1
Effort Level Medium
Inputs Caller phone number visible in CTM call notification
Outputs SF account data displayed as floating overlay; new lead shortcut if no match
Technical Approach
Chrome extension with content script monitors CTM tab for incoming call events 
by polling the DOM. On call detection, extracts caller phone number from CTM's 
call notification element. Uses the phone number to construct a SF search URL 
and opens it in the background within the same browser window (agent already 
logged into SF). Reads the resulting SF page DOM to extract key fields (name, 
admission history, last contact, status) and renders them as a floating overlay 
card pinned to the corner of the screen.
Edge Cases SF timeout after 5s: overlay shows partial data with 'Open SF manually' link. 
Duplicate accounts: prompt merge.
Testing Criteria Simulate 50 calls; verify overlay renders within 2s for 90% of cases.
Business Impact Saves 1–2 mins per call; eliminates most common manual lookup

## Page 17

  RPA / No-Credential Approach⚙
• Content script polls CTM DOM for call state changes every 500ms
• Phone number extracted via DOM selector targeting CTM's caller ID element
• SF opened in background tab using search URL pattern — no API token needed
• Overlay card reads SF DOM fields and renders summary using injected CSS/JS
• Duplicate accounts: scans SF results for multiple entries and shows merge prompt
• No match: 'Create Lead' button in overlay pre-fills SF new lead form with phone number
Auto-Call Tracking & Form/Note Auto-Fill
Priority HIGH
Phase Phase 1
Effort Level High
Inputs Call metadata visible in CTM post-call (duration, disposition, outcome), agent's 
wrap-up screen
Outputs Tracker row added automatically; SF record updated; ticket pre-filled
Technical Approach
After agent selects disposition in CTM wrap-up, a Playwright script reads all 
visible wrap-up fields from CTM DOM. It switches to the tracker (Google Sheets 
or internal web tracker open in another tab) and adds a new row by simulating 
clicks and keystrokes — no Sheets API needed. Simultaneously navigates to 
the SF record (already open from the earlier pop-up) and updates relevant 
fields. Ticket pre-fill: opens admission ticket form and populates caller info fields 
from data already on screen.
Edge Cases Incomplete transcription: show editable draft with required fields highlighted. 
Conflicting data: alert agent before overwriting.
Testing Criteria End-to-end simulation; verify zero duplicate entries across tracker and SF.
Business Impact Eliminates duplicate entry; saves 1–2 mins of wrap-up per call
  RPA / No-Credential Approach⚙
• Playwright multi-tab manager: reads CTM wrap-up DOM after disposition submit
• Tracker update: navigates to tracker tab, uses keyboard shortcut to add row, fills via Tab/Enter 
simulation
• SF update: navigates to open SF record tab, fills fields via DOM injection or simulated input
• Ticket pre-fill: reads SF record data already on screen, injects into ticket form fields
• Repeat caller detection: SF search checks for existing record before creating new entry
Note Summarizer & Reply Suggester
Priority MEDIUM
Phase Phase 2
Effort Level Medium
Inputs Note text visible on screen or copied to clipboard, chat/reply window content
Outputs Summary under 100 words shown in overlay; suggested reply options panel

## Page 18

Technical Approach
Agent selects (highlights) note text in SF or copies it — clipboard hook captures 
content. Local transformer model (DistilBERT or similar, running offline on 
agent machine) generates a summary under 100 words. Summary is displayed 
in a persistent overlay panel and can be inserted into fields with one click. Reply 
suggester reads the active chat/message window DOM, matches keywords to a 
local template DB, and surfaces 2–3 options in the same panel.
Edge Cases Empty clipboard: show 'Select text first' prompt. Sensitive content flag: skip 
auto-summarize, alert supervisor.
Testing Criteria User acceptance test: target 30% time reduction per survey.
Business Impact Reduces review and response time; speeds up admissions workflow
  RPA / No-Credential Approach⚙
• Clipboard monitor captures highlighted/copied text automatically
• Local NLP model runs offline — no cloud processing, no data leaves the machine
• Summary overlay panel: one-click insert into active note field
• Template DB: local JSON with keyword-to-reply mappings, updatable by team lead
• Non-English text: passed through local translation layer (LibreTranslate offline) before 
summarization

## Page 19

Element Medical Billing
VOB and verification specialists fill 10+ PDF forms daily, navigate multiple insurance portals, and spend up 
to 4 hours per shift in IVR/queue waits. Same patient data re-entered repeatedly across forms.
Pain Points
• 10+ PDF forms filled manually per day per specialist
• Same patient/insurance data re-entered across multiple forms
• 1–4 hour IVR/queue waits to reach insurance representatives
• Multiple systems updated post-call (duplication)
• New portals require manual navigation without API support
Automation Summary
Automation Priority Effort Phase Business Impact
PDF Auto-Filler HIGH Medium Phase 
1
Saves 2–5 mins × 10+ forms/day = 
20–50+ mins daily per specialist
Insurance Portal Auto-Lookup 
& Reminders HIGH High Phase 
2
Eliminates manual portal navigation; 
surfaces missed fields automatically
Pre-Filled Insurance Form 
Template Generator
MEDIU
M Low Phase 
2
Eliminates template setup time; 
ensures field consistency across all 
forms
Automation Detail Specs
PDF Auto-Filler
Priority HIGH
Phase Phase 1
Effort Level Medium
Inputs Blank PDF form opened by specialist, patient record open in SF/billing system
Outputs PDF with standard fields auto-populated; specialist fills only non-standard fields
Technical Approach
When specialist opens a PDF form, a desktop Python script (running as a 
background tray app) detects the new PDF via file watcher. It reads the PDF's 
field labels using pdfplumber (no server needed). Simultaneously reads patient 
data from the currently open SF/billing portal tab via DOM scraping. Matches 
field labels to patient data using a local field-mapping config. Writes data into 
PDF fields using PyPDF2/pdfrw and saves a pre-filled copy for the specialist to 
review and finalize.
Edge Cases Missing patient data: highlight unfilled fields in yellow for specialist. Large PDFs: 
process in chunks. Unrecognized form: skip and alert.
Testing Criteria Fill 10 representative forms; target 100% accuracy on repeat fields; time 
savings > 50%.
Business Impact Saves 2–5 mins × 10+ forms/day = 20–50+ mins daily per specialist

## Page 20

  RPA / No-Credential Approach⚙
• Python file watcher (watchdog) detects when specialist opens a new PDF
• pdfplumber reads form field labels offline — no external service needed
• DOM scraper reads patient data from open SF/billing portal tab in Chrome
• Local field-mapping config (JSON): maps PDF field labels to SF DOM selectors
• pdfrw/PyPDF2 writes values into PDF fields and saves pre-filled copy to same folder
• Preview UI: system notification with 'Open Filled PDF' button
Insurance Portal Auto-Lookup & Reminders
Priority HIGH
Phase Phase 2
Effort Level High
Inputs Insurance portal open in browser (agent already logged in), patient policy ID 
visible on screen
Outputs Eligibility/coverage data extracted and displayed in overlay; reminder pop-ups 
for missed fields
Technical Approach
Chrome extension detects when specialist navigates to a known insurance 
portal (by URL pattern). Reads the policy ID from the open SF/billing record tab. 
Auto-navigates to the portal's eligibility lookup page and enters the policy ID via 
DOM interaction — specialist is already authenticated. Scrapes the result page 
for key coverage fields (deductible, copay, in/out-of-network status). Displays 
results in a floating overlay and triggers reminders for any missing/expiring 
data. Cached results stored in browser localStorage to avoid repeat lookups.
Edge Cases Portal downtime: use cached result with timestamp shown. Auth expired: alert 
specialist to re-login. New portal: specialist adds URL pattern via settings panel.
Testing Criteria Simulate lookups on top 10 insurance portals; target > 90% field accuracy.
Business Impact Eliminates manual portal navigation; surfaces missed fields automatically
  RPA / No-Credential Approach⚙
• Content script detects portal URL and activates portal-specific scraping profile
• Policy ID read from open SF/billing tab DOM automatically
• Playwright sub-script navigates portal eligibility form using existing authenticated session
• Result scraper extracts coverage fields from portal response page DOM
• Results cached in localStorage per policy ID with 24hr expiry
• Pop-up reminders triggered by local rules (e.g., 'Deductible field empty')
Pre-Filled Insurance Form Template Generator
Priority MEDIUM
Phase Phase 2
Effort Level Low
Inputs Insurance type selected by specialist (dropdown in local tool)

## Page 21

Outputs Template PDF with common fields pre-filled, ready for specialist to complete
Technical Approach
A lightweight local desktop app (Tkinter or Electron) presents a simple 
dropdown of insurance types. On selection, it loads the matching template PDF 
from a local templates folder, pre-fills standard fields (insurance name, address, 
standard codes) from a local JSON config, and opens the result in the system 
PDF viewer. Specialists can upload new template PDFs and map their fields 
through a simple UI — no developer needed.
Edge Cases Custom/non-standard insurer: 'Upload Template' option in app. Missing field 
values: highlight in yellow.
Testing Criteria Generate templates for all active insurers; gather specialist feedback for 
iteration.
Business Impact Eliminates template setup time; ensures field consistency across all forms
  RPA / No-Credential Approach⚙
• Local desktop app (Tkinter) — no internet connection required
• Templates stored as PDF files in a shared network folder or local directory
• JSON config maps insurance type to standard field values
• Field mapping UI allows team lead to add new insurance types and templates
• Output: pre-filled PDF opened in default viewer, saved to specialist's working folder

## Page 22

Master Implementation Roadmap
Phase 1 — Foundation & Quick Wins (Weeks 1–6)
All Phase 1 automations use session-based browser automation and local file processing — deployable 
without any client backend access.
Automation Client Priority Effort Primary RPA Method
CTM-SF Auto-Account 
Access Flyland Recovery HIGH Medium
Chrome Extension with 
content script monitors CTM 
DOM for call events
Auto-Note Generator for 
Unqualified/Duplicates Flyland Recovery HIGH Medium
PyAutoGUI or Playwright 
detects disposition field 
change in CTM
Wrap-Up Auto-Sync 
Across Systems Legacy HIGH High
Playwright multi-tab 
controller: identifies open 
tabs by URL pattern
Customer History Auto-
Pull & Reminders Legacy HIGH Medium
Content script polls CTM 
DOM for active call state 
changes
Auto-Lead Pruning & 
Dial/SMS Automation TBT HIGH Medium
Local file watcher (Python 
watchdog) monitors 
Downloads folder for SF/CTM 
CSV exports
Auto-Lead Pull & 
Inbound Routing TBT HIGH Medium
Content script reads CTM call 
queue and agent status DOM 
in real-time
Auto-Fax for Appeals & 
Claim Status Updater Takahami HIGH Medium
PyAutoGUI hotkey listener 
triggers fax workflow on 
specialist's command
Claim-Type-Based 
Appeal Router Takahami HIGH Low
Content script reads claim 
type and payer fields from 
billing portal DOM
CTM-SF Auto-Account 
Pop-Up Banyan HIGH Medium
Content script polls CTM 
DOM for call state changes 
every 500ms
Auto-Call Tracking & 
Form/Note Auto-Fill Banyan HIGH High
Playwright multi-tab manager: 
reads CTM wrap-up DOM 
after disposition submit
PDF Auto-Filler Element Medical 
Billing HIGH Medium
Python file watcher 
(watchdog) detects when 
specialist opens a new PDF
Phase 2 — Intelligence Layer (Weeks 7–14)
Phase 2 adds local AI/NLP models, portal scraping with caching, and team-lead configurable tools. Still zero 
credential requirements.

## Page 23

Automation Client Priority Effort Primary RPA Method
Chat Reply Suggester & 
Form Auto-Filler Flyland Recovery MEDIUM Low-
Medium
Chrome content script reads 
chat DOM in real-time for 
keyword matching
Form-Filler, Note 
Summarizer & AI Queue 
Prioritizer
Legacy MEDIUM High DOM-based form filler with 
local field-mapping config file
Text Reply Suggester, 
Note Templates & 
Insurance Status 
Checker
TBT MEDIUM Medium
DOM reader for SMS window 
content; local template JSON 
for suggestions
Negotiation Form-Filler & 
Reply Suggester Takahami MEDIUM Medium
DOM reader captures carrier 
response text from email 
client or portal message 
thread
Note Summarizer & 
Reply Suggester Banyan MEDIUM Medium
Clipboard monitor captures 
highlighted/copied text 
automatically
Insurance Portal Auto-
Lookup & Reminders
Element Medical 
Billing HIGH High
Content script detects portal 
URL and activates portal-
specific scraping profile
Pre-Filled Insurance 
Form Template 
Generator
Element Medical 
Billing MEDIUM Low
Local desktop app (Tkinter) 
— no internet connection 
required
Deployment Requirements (Per Agent Machine)
• Python 3.10+ with: playwright, selenium, pyautogui, watchdog, pdfplumber, pdfrw, spacy, pandas, 
tesseract-ocr
• Chrome or Edge browser with the custom automation extension installed
• Local NLP models downloaded once: DistilBERT (summarization), spaCy en_core_web_sm (classification)
• LibreTranslate local instance (optional, for clients handling non-English callers)
• Local config folder with JSON files: field mappings, templates, routing rules, carrier fax directory
• Network access only to systems agents already use — no new endpoints or firewall rules needed
Risk Register
Risk Likelihood Impact Mitigation
Portal UI changes break 
DOM scrapers High Medium
Modular scraper profiles per portal; auto-
detect breakage and alert; quick config 
update process
CTM/SF DOM structure 
differs per client Medium High Client-specific selector config files; one-
time mapping session per deployment
Local NLP model accuracy 
below threshold Medium Medium Confidence threshold gates; low-confidence 
outputs shown as drafts, not auto-posted
Agent machine 
performance impacted by 
Low Medium Lightweight polling intervals; scripts idle 
when agent is not on a call

## Page 24

Risk Likelihood Impact Mitigation
background scripts
PDF form structure varies 
across insurers
High Medium Pdfplumber field-label matching; fallback to 
OCR for non-standard PDFs; manual 
override always available
Estimated Time Savings Summary
Client Key Automation Time Lost Currently Projected Savings
Flyland Recovery CTM-SF session pop-up + 
auto-notes 1–3 hrs/shift ~60–90 min/shift
Legacy Multi-tab wrap-up sync + AI 
prioritizer 1–2 hrs/shift ~60–90 min/shift
TBT CSV-based lead pruning + 
auto-dialer
Half shift on dead 
leads ~2–3 hrs/shift
Takahami Portal RPA fax + status 
DOM updater 20 min–2 hrs/shift ~60–90 min/shift
Banyan Session pop-up + multi-tab 
auto-tracking
40% shift on manual 
entry ~2 hrs/shift
Element Medical PDF auto-filler + portal 
scraper
50% shift in queue + 
10+ forms ~2–3 hrs/shift
AST Automation Implementation Plan v2.0  |  RPA / No-Credential Approach  |  Confidential  |  March 2026


---

