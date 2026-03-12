# ATS Automation - Complete Document Extraction
============================================

*Extracted from PDF with tables - March 2026*

---

# AST Automation Brief.pdf

## Table 1 (Page 1)

Flyland Recovery

Overview: Addiction specialists deal with US rep waits, note typing, duplicates.

Current Process Overview

Addiction  Counseling  Specialists  handle  mixed  calls/chats  (3-5  mins/call,  50-100%  shift

talking) during night/morning/mid shifts.

Workflow


## Table 2 (Page 1)

| 0 | 1 | 2 |
| --- | --- | --- |
| Addiction  Counseling  Specialists  handle  mixed  |  |  |
| talking) during night/morning/mid shifts. |  |  |
| Workflow |  |  |
|  | 1.  Receive call/chat via CTM (inbound/outbound),  |  |
| mins, slow load). |  |  |
| 2.  Talk/listen  with  empathy | for  mental  health/substance  abuse | (3-5  mins,  gather |
| concerns). |  |  |
| 3.  Type notes/updates (1-2 mins, every call detai |  |  |
|  | 4.  Write replies/chats (1-3 mins, if mixed). Fill |  |
|  | (longest wait: 1-2 hours, 10-20 mins/queue, depend |  |
|  | 5.  Post-call, update SF records (duplication: not |  |
|  | a.  For unqualified/duplicates, do notes (repetiti |  |

## Table 3 (Page 2)

| 0 | 1 |
| --- | --- |
| Chat Reply Suggester and Admissions Form Auto-Fill |  |
| • | Key Objective: Suggest replies for chats; auto-fil |
| • | Specs: Template-based suggester; form filler pulli |
| • | Inputs: Chat context; form type. |
| • | Outputs: Suggested replies; filled form. |
| • | Edge Cases: Long chats (summarize first); offline  |
| • | Testing: Measure reply time reduction. |

## Table 4 (Page 2)

| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Addiction | Counseling | Specialists, | CSRs, | Agents | handle  mixed | calls/chats | (3-5 |
| mins/interaction, 0.3-1 talking) during night/morn |  |  |  |  |  |  |  |
| Workflow |  |  |  |  |  |  |  |
|  | 1.  Receive  call/chat  (queued  simultaneously,   |  |  |  |  |  |  |
|  | (0.05-1, 2-5 mins, slow load). |  |  |  |  |  |  |
|  | 2.  Talk/listen/gather info (0.3-1, 1-5 mins, accu |  |  |  |  |  |  |
|  | 3.  Type  notes/records |  | (0.2-1,  1-5  mins,  tagging/disposition  after  e |  |  |  |  |
|  | emails/chats (0.05-1, 1-5 mins, standard replies). |  |  |  |  |  |  |
|  | 4.  Fill forms/data entry (0.1-1, repetitive). |  |  |  |  |  |  |
|  | 5.  Wait for approvals/US reps (0.05-1, 3 mins-1 h |  |  |  |  |  |  |
|  | 6.  Post-interaction,  wrap-up  notes,  dispositio |  |  |  | track | in  CTM/SF/chatter/tracker |  |
|  | (duplication: same info multiple places, rewrites) |  |  |  |  |  |  |

## Table 5 (Page 2)

| 0 | 1 |
| --- | --- |
|  | 7.  Repeat  callers  (duplication  from  US  reps) |
|  | (updates, typing); tiring due to multitasking, que |
| Wrap-Up to SF/Chatter Auto-Link for Disposition/Tr |  |
| • | Key Objective: Post-call, auto-sync disposition to |
| • | Specs: API batch post; use disposition codes to ge |
| • | Inputs: Wrap-up form data. |
| • | Outputs: Synced records; no-dupe confirmation. |
| • | Edge Cases: Partial sync failure (retry queue); hi |

## Table 6 (Page 3)

| 0 | 1 |
| --- | --- |
| • | Testing: Eliminate 100% duplications. |
| Customer History Auto-Pull and Update Reminders |  |
| • | Key Objective: Auto-load history; remind missed de |
| • | Specs:  SF  query  on  call  start;  rule-based  r |
|  | unqualified"). |
| • | Inputs: Caller ID. |
| • | Outputs: History UI; pop-up reminders. |
| • | Edge Cases: Slow load (progress bar); sensitive up |
| • | Testing: Cover new updates. |

## Table 7 (Page 3)

ASTs and Addiction Specialists handle mixed calls/outbound (40-50%, 1-5 mins/call) during

night/morning/mid shifts.

Workflow

1.  Receive inbound (1-5 mins, verify/pull info 1-5 mins, slow load).

2.  For outbound (FB forms/old leads, hourly, even months old no-response), dial (1-2

mins), text/SMS if VM (depends on reply time).

3.  Talk/listen (3-5 mins, empathy, probing if no US notes).

4.  Type notes (1-2 mins). Write replies (1-2 mins). Fill forms (1 min).

5.  Transfer to openers if needed (wait 1-3 mins, latencies).

6.  Update  SF/CTM  (duplication:  notes  in  multiple  places,  trackers  for  transfers/VOB).

Multi-task during latencies.


## Table 8 (Page 4)

| 0 | 1 |
| --- | --- |
|  | b.  Waits:  US  counterparts  (half  shift,  1  ho |
|  | (outbounds, verifies). |
| Auto-Lead Pruning and Dial/SMS for Forms |  |
| • | Key  Objective:  Auto-remove  unresponsive 
leads  |
|  | forms. |
| • | Specs: DB query for last response; prune via rules |
| • | Inputs: Lead list; prune threshold. |
| • | Outputs: Updated list; call/SMS logs. |
| • | Edge Cases: Partial responses (flag); bulk prune ( |
| • | Testing: Reduce OBs by 50%. |

## Table 9 (Page 5)

| 0 | 1 | 2 | 3 |
| --- | --- | --- | --- |
| Workflow |  |  |  |
| 1.  Contact | insurance  carriers/TPAs | (0.5  allocation,  daily | for  accounts,  negotiate |
| claims). |  |  |  |
|  | 2.  Lookup claims (0.1-0.35, 20 mins, double-check |  |  |
|  | 3.  Draft negotiations/appeals (2-3/day, 10-15 min |  |  |
|  | 4.  Fill forms/data entry (0.05-0.1, 5 mins). |  |  |
|  | 5.  Wait for responses (0.05-0.1, 10-30 mins). |  |  |
|  | 6.  Change claim status (e.g., PAID to UNDERPAID). |  |  |
|  | 7.  Submit appeals via fax (if applicable). |  |  |
|  | 8.  Update reports (0.05-30 mins). |  |  |
|  | a.  Repetitive: Contacting carriers (daily same ac |  |  |

## Table 10 (Page 6)

| 0 | 1 |
| --- | --- |
| • | Edge Cases: Complex negotiations (escalate); short |
| • | Testing: Time reduction per survey (1-2 hours/shif |
| Banyan |  |
| Overview:  Focus  on  call  handling | inefficiencies 
in  addiction  counseling.  Key  t |
| Specialist transfer waits (up to 5 mins/call), mul |  |
| info leading to ticketing delays. |  |
| Current Process Overview |  |
| Agents, primarily CSRs and Addiction Specialists,  |  |
| Mixed;  duration:  3-10  mins  for  facility/admis |  |
| shifts. |  |
| Workflow |  |

## Table 11 (Page 7)

| 0 | 1 |
| --- | --- |
| • | Testing: Simulate calls; verify pop-up in <2s for  |
| Auto-Call Tracking and Form/Note Auto-Fill |  |
| • | Key  Objective:  After  a  call,  auto-tracking 
i |
|  | including auto-fill for forms/notes based on call  |
| • | Specs: Use speech-to-text (e.g., Google STT) or po |
|  | Auto-post  to  both  systems  via  APIs.  Pre-fill |
|  | concern tags. |
| • | Inputs: Call metadata (duration, disposition); tra |
| • | Outputs: Updated records in tracker/SF; confirmati |
| • | Edge Cases: Incomplete transcription (manual edit  |
|  | user); high queue (batch process). |
| • | Testing:  End-to-end  call  simulation;  check  no |
|  | standard dispositions. |
|  | Note Summarizer and Reply Suggester |
| • | Key  Objective:  For  long  notes/history,  quick  |
|  | suggest templates during admissions/transfers. |
| • | Specs:  NLP  model  (e.g.,  BERT)  to  summarize   |
|  | from template DB based on keywords (e.g., "admissi |
| • | Inputs: Note text; context keywords. |
| • | Outputs: Summarized text; suggested reply list (ed |
| • | Edge Cases: Empty notes (default summary); sensiti |
|  | English (handle via translation). |
| • | Testing: User acceptance: reduces time by 30% (sur |
| Element Medical Billing |  |
| Overview: Billing/VOB specialists face repetitive  |  |
| Queue waits, portal navigation, repeated fields (1 |  |
| Current Process Overview |  |
| VOB  Specialists  and  Verification  of  Benefits  |  |
| mixed calls/outbound (50%) during night/morning sh |  |

## Table 12 (Page 8)

| 0 | 1 |
| --- | --- |
| Workflow |  |
| 1.  Look  up | info 
in  systems/portals 
(0.1-1  allocation,  es |
|  | insurances/representatives (0.35-1, outbound activ |
|  | 2.  Fill  forms/data  entry  (0.2-1,  10+  PDF  fo |
|  | (0.05-1), write replies (0.1-1). |
| 3.  Search  for  policy/product | info  (waits 
in  IVR/queue,  1-4  hours).  Update |
|  | systems post-call. |
|  | a.  Duplications: Entering same info in two places |
|  | b.  Repetitive:  Filling  PDFs  (10x+/day),  calli |
|  | shift, 4 hours), system slow load. |
| PDF Auto-Filler |  |
| • | Key  Objective:  When  filling  PDFs  (e.g.,  VOB  |
|  | fields from DB/patient data. |
| • | Specs:  Use  PDF  lib  (e.g.,  PyPDF2)  to  parse/ |
|  | (patient ID as key). Support all insurance types w |
| • | Inputs: PDF template path; patient ID; insurance t |
| • | Outputs: Filled PDF downloadable; preview UI. |
| • | Edge Cases: Missing fields (prompt user); invalid  |
|  | (chunk processing). |
| • | Testing: Fill 10 forms; verify 100% accuracy for r |
|  | >50%. |
| Insurance Portal Integration for Lookups/Reminders |  |
| • | Key  Obective:  During  lookups,  auto-fetch  of   |
|  | details. |
| • | Specs: API wrappers for common portals (e.g., via  |
|  | pop-ups (e.g., "Check deductible"). Cache results  |
| • | Inputs: Policy ID; portal URL. |
| • | Outputs: JSON data; UI reminders. |
| • | Edge  Cases:  Portal  downtime  (fallback  cache); |
|  | portals (manual add). |
| • | Testing: Simulate calls; accuracy >90%. |
|  | Pre-Filled Insurance Form Templates Generator |
| • | Key Objective: Ready templates for all insurances, |
| • | Specs: DB of templates; generate on-demand with pa |

## Table 13 (Page 9)

| 0 | 1 |
| --- | --- |
| • | Inputs: Insurance type. |
| • | Outputs: Template PDF/editable form. |
| • | Edge Cases: Custom insurances (user-upload templat |
| • | Testing: Generate examples; user feedback loop. |

# AST_TechStack_Conflict_Analysis.pdf

## Table 1 (Page 1)

| 0 | 1 | 2 | 3 |
| --- | --- | --- | --- |
|  | AST AUTOMATION PLAN |  |  |
|  | TECH STACK CONFLICT ANALYSIS |  |  |
| Identified conflicts between the v2.0 Implementati |  |  |  |
| 4 | 5 | 2 | 1 |
| CRITICAL | HIGH | MEDIUM | LOW |

## Table 2 (Page 2)

Overview

Cross-referencing the v2.0 RPA Implementation Plan against the Master Resource List revealed 13 conflicts

across 5 of the 6 clients. These range from critical system mismatches (wrong call platform assumed) to missing

systems that need dedicated automation profiles.

No conflicts were found for Legacy's core systems — CTM, Salesforce, and ZOHO are all correctly referenced in

the plan. Legacy has one medium-severity note about ZOHO SalesIQ needing a specific DOM profile.

Conflict Summary Table


## Table 3 (Page 2)

| 0 | 1 | 2 | 3 |
| --- | --- | --- | --- |
| Conflict Summary Table |  |  |  |
| Client | Conflict | Severity | Resolution Direction |
|  |  |  | Retarget all call automation to SF Lightning |
| TBT | No CTM — SF Lightning Only | CRITICAL |  |
|  |  |  | DOM |
|  |  |  | Add owner/record-type filters to all SF |
| TBT | Shared SF Instance with Flyland | HIGH |  |
|  |  |  | reads/writes |
| TAKAHA |  |  | Rebuild call triggers around RingCentral web |
|  | RingCentral, not CTM | CRITICAL |  |
| MI |  |  | app DOM |
| TAKAHA |  |  | Build CMD-specific RPA profile for |
|  | CollaborateMD not in plan | CRITICAL |  |
| MI |  |  | claims/status/appeals |
| TAKAHA |  |  | Add KIPU as fallback data source for clinical |
|  | KIPU EHR missing from plan | HIGH |  |
| MI |  |  | fields |
|  |  |  | Use Acrobat JS macros or PyAutoGUI for |
| EMB | Adobe Acrobat, not pdfplumber | CRITICAL |  |
|  |  |  | form-filling |
|  |  |  | Add Elevate as primary data source / write- |
| EMB | Elevate billing portal missing | HIGH |  |
|  |  |  | back target |
|  | Availity + VerifyTx are specific |  |  |
| EMB |  | HIGH | Build dedicated RPA profiles for each portal |
|  | portals |  |  |
|  |  |  | Remove STT build; use TurboScribe exports |
| EMB | TurboScribe already handles STT | MEDIUM |  |
|  |  |  | as input |
|  | Tracker is Google Form, not web |  | Use Google Form URL pre-fill or direct |
| BANYAN |  | HIGH |  |
|  | app |  | Sheets write |
|  |  |  | Use ARIA selectors + slow-type for Power |
| BANYAN | Ticketing is Power Apps | HIGH |  |
|  |  |  | Apps inputs |
|  | ZOHO SalesIQ needs specific |  |  |
| LEGACY |  | MEDIUM | Build SalesIQ DOM profile for chat extension |
|  | profile |  |  |
| FLYLAN |  |  | Separate ZOHO Mail DOM profile from |
|  | ZOHO Mail differs from SalesIQ | LOW |  |
| D |  |  | SalesIQ profile |

## Table 4 (Page 3)

CRITICAL
TBT  —  TBT Has No CTM — Uses Salesforce Lightning as Primary System

What the plan 
Plan assumes CTM (calltrackingmetrics.com) for call event detection, DOM

assumed
monitoring, and outbound dial automation in TBT.

TBT's listed 'CTM' URL resolves to https://wethebest.lightning.force.com — a

What actually

Salesforce Lightning instance, not Call Tracking Metrics. TBT does not appear to

exists

use CTM at all.

All TBT automations that hook into CTM DOM (lead routing, call detection, wrap-up

Impact on plan
triggers) will have no target system. The entire call-tracking layer needs to be rebuilt

around Salesforce Lightning.

Re-target all TBT call-event automations to Salesforce Lightning DOM

(wethebest.lightning.force.com). Use Salesforce Lightning's activity timeline and lead

Recommended fix

views as the data source instead of CTM. Chrome extension selectors need to be

written for SF Lightning UI, not CTM.


## Table 5 (Page 4)

| 0 | 1 |
| --- | --- |
| What the plan | Plan references CTM DOM monitoring for call events |
| assumed | fax portal' for appeal submissions. |
| What actually | Takahami uses RingCentral (ringcentral.com) as the |
| exists | RingCentral also has built-in fax capability via i |
|  | All call-event triggers in the plan target CTM DOM |
| Impact on plan | Takahami's stack. The fax workaround (navigating t |
|  | unnecessary — RingCentral's own web app can send f |
|  | Rewrite Takahami's call-event detection to monitor |
|  | (app.ringcentral.com). For fax submissions, automa |
| Recommended fix |  |
|  | fax interface using Playwright — the agent is alre |
|  | simpler than using a third-party fax portal. |

## Table 6 (Page 4)

| 0 | 1 |
| --- | --- |
|  | simpler than using a third-party fax portal. |
| Specific action items: |  |
| • | Auto-Fax for Appeals: use Playwright to navigate R |
|  | recipient from local carrier directory JSON → send |
| • | Claim Status Updater: target CollaborateMD DOM (se |
| • | Negotiation Reply Suggester: read carrier response |
|  | a generic message thread |

## Table 7 (Page 5)

| 0 | 1 |
| --- | --- |
|  | Negotiation form-filling and claim lookup automati |
| Impact on plan | from KIPU if the CollaborateMD record doesn't cont |
|  | this system could result in incomplete form fills. |
|  | Add KIPU as a secondary data source for Takahami a |
|  | form-filler runs, check if required fields (e.g.,  |
| Recommended fix |  |
|  | available in CollaborateMD first; if not, trigger  |
|  | Build a KIPU portal profile in the extension confi |

## Table 8 (Page 6)

Add Elevate as a data source portal in the RPA stack. Build a Playwright/extension

profile for Elevate's patient lookup and record update flows. Determine with client

Recommended fix

whether Elevate or SF is the primary patient data source for form-filling — this

changes where the extension reads from.

Specific action items:

•
PDF Auto-Filler: if patient data lives in Elevate (not SF), DOM scraper must target Elevate's patient detail

page instead

•
Portal Integration: add Elevate to the list of systems the wrap-up sync writes back to

•
Elevate profile: map DOM selectors for patient ID lookup, insurance fields, and record update flow

EMB  —  Availity and VerifyTx Are the Specific Insurance/Verification

HIGH

Portals

What the plan 
Plan references 'insurance portals' and 'verification portals' generically, proposing

assumed
Selenium scraping with URL-pattern detection.

EMB specifically uses Availity (availity.com) for insurance lookups and VerifyTx

What actually

(app.verifytx.com) for benefits verification. These are the two concrete portals that

exists

need RPA profiles.

Generic portal profiles won't work — each portal has unique DOM structure, login

Impact on plan
flows, and result page layouts. Without Availity and VerifyTx-specific selector maps,

the scraper won't know where to find eligibility data.

Build dedicated Playwright/extension profiles for Availity and VerifyTx. Map the

eligibility lookup flow, result fields (deductible, copay, coverage status), and cache

Recommended fix

structure for each. These become the two concrete portal targets replacing the

generic 'insurance portal' reference in the plan.

Specific action items:

•
Availity profile: map eligibility search page, member ID field, and coverage result DOM selectors

•
VerifyTx profile: map verification request flow and benefit result extraction

•
Cache layer: store results per policy ID with 24hr expiry in localStorage

•
Reminder engine: trigger 'Check deductible' and 'Check out-of-network' pop-ups based on Availity/VerifyTx

result fields

MEDIUM
EMB  —  TurboScribe Already Handles Transcription — Don't Rebuild STT

What the plan 
Plan proposed building or integrating a speech-to-text solution (Google STT or local

assumed
model) for note generation and call summarization.

What actually 
EMB already uses TurboScribe (turboscribe.ai) for transcription. Agents already

exists
have a working transcription pipeline.

Building a separate STT layer is wasted effort. More importantly, TurboScribe

outputs are likely already saved as text files or accessible via the TurboScribe

Impact on plan

dashboard — these outputs can be used directly as input to the note summarizer

and auto-fill automations.

Remove STT from EMB's scope. Instead, build the note summarizer to ingest

TurboScribe's output: (1) File watcher monitors TurboScribe's download/export

Recommended fix

folder for new transcript files, (2) Local NLP model summarizes the transcript text,

(3) Summary injected into Elevate/SF note field. No STT development needed.


## Table 9 (Page 7)

| 0 | 1 |
| --- | --- |
| BANYAN  —  Banyan's Tracker is a Google Form — Can |  |
|  | HIGH |
| Like a Web App |  |
|  | Plan assumes the call tracker is a tab-based web i |
| What the plan |  |
|  | internal dashboard) that can be updated via DOM in |
| assumed |  |
|  | each call. |
|  | Banyan's tracker is a Google Form (specific URL: d |
| What actually | Google Forms are submit-only inputs — they cannot  |
| exists | parameters in the standard embed and each submissi |
|  | row. |
|  | The 'multi-tab wrap-up sync' approach (navigating  |
|  | works, but Google Forms have specific DOM structur |
| Impact on plan |  |
|  | rendered differently from a regular web app, and t |
|  | row in the linked Google Sheet — which is actually |
|  | The Google Form can be auto-filled using URL query |
|  | supports ?entry.FIELD_ID=VALUE pre-fill via URL).  |
| Recommended fix | construct a pre-filled Google Form URL from wrap-u |
|  | auto-submit — cleaner than DOM injection. Alternat |
|  | Google Sheet via Playwright if agents have edit ac |

## Table 10 (Page 8)

| 0 | 1 |
| --- | --- |
|  | labels) as selectors instead of CSS selectors. |
| Specific action items: |  |
| • | Power Apps form-fill: use Playwright with accessib |
|  | DOM selectors |
| • | Slow-type mode: type characters with 50ms delay be |
|  | conditions |
| • | Fallback: PyAutoGUI coordinate-based clicking for  |
| • | Pre-fill data source: read caller info from the SF |

## Table 11 (Page 8)

| 0 | 1 |
| --- | --- |
| LEGACY  —  Legacy's Chat System is ZOHO SalesIQ —  |  |
|  | MEDIUM |
| DOM Profile |  |
| What the plan | Plan refers to 'chat window DOM' and 'active chat  |
| assumed | chat reply suggester. |
|  | Legacy uses ZOHO SalesIQ (zoho.com/salesiq) for ch |
| What actually |  |
|  | its own DOM structure, message thread layout, and  |
| exists |  |
|  | Flyland also uses ZOHO but via ZOHO Mail/Chat (dif |
|  | The Chrome extension's chat reader needs ZOHO Sale |
| Impact on plan | to find the message thread and input field. Generi |
|  | different chat platforms. |
|  | Build a ZOHO SalesIQ-specific DOM profile for the  |
|  | Map the CSS selectors for: incoming message contai |
| Recommended fix |  |
|  | reply input field. This is a straightforward selec |
|  | app has inspectable, stable DOM classes. |

## Table 12 (Page 9)

| 0 | 1 |
| --- | --- |
| • | Shared suggestion engine; client-specific DOM mapp |

## Table 13 (Page 10)

| 0 | 1 | 2 | 3 |
| --- | --- | --- | --- |
| Flyland Recovery |  |  |  |
| System | Tool | Automation Role | Status |
|  | CTM |  |  |
|  |  | Call event trigger, DOM monitoring for incoming | ✓ |
| Call Tracking | (calltrackingmetrics.co |  |  |
|  |  | calls | Confirmed |
|  | m) |  |  |
|  | Salesforce |  |  |
|  |  | Account pop-up, note injection, lead creation — | Shared |
| CRM | (flyland.my.salesforce. |  | ⚠ w |
|  |  | shared with TBT, apply data filters | / TBT |
|  | com) |  |  |
|  | ZOHO Mail/Chat | Chat reply suggester — needs ZOHO Mail-specific | Needs |
| Chat |  |  | ⚠ p |
|  | (zoho.com/mail) | DOM profile | rofile |

## Table 14 (Page 11)

| 0 | 1 | 2 | 3 |
| --- | --- | --- | --- |
| Element Medical Billing |  |  |  |
| System | Tool | Automation Role | Status |
|  |  | Form-filling via Acrobat JS macros or PyAutoGUI | Plan |
| PDF | Adobe Acrobat |  | ✗ w |
|  |  | — replaces pdfplumber/pdfrw for live fills | rong |
|  | Elevate |  |  |
|  |  | Primary patient data source for form-filling and | Not in |
| Billing | (elevate.serverdata.net |  | ✗ p |
|  |  | post-call record updates | lan |
|  | ) |  |  |
|  |  | Insurance eligibility lookup — primary portal RPA | Generic
 
⚠ |
| Insurance | Availity (availity.com) |  |  |
|  |  | target | in plan |
|  | VerifyTx | Benefits verification portal — secondary portal RP | Not in |
| Verification |  |  | ✗ p |
|  | (app.verifytx.com) | target | lan |
|  | TurboScribe | Existing STT — use export files as input to note | Use |
| Transcription |  |  | ✓ e |
|  | (turboscribe.ai) | summarizer, no new STT needed | xisting |
| Document | SharePoint + Office |  | ✓ |
|  |  | Appeal document storage, template management |  |
| Mgmt | 365 |  | Confirmed |

## Table 15 (Page 12)

| 0 | 1 | 2 | 3 |
| --- | --- | --- | --- |
| System | Tool | Automation Role | Status |
|  | (zoho.com/salesiq) | DOM profile | profile |
|  |  |  | ✓ |
| Reporting | Google Sheets | Wrap-up sync write target |  |
|  |  |  | Confirmed |
| Communicati |  |  | ✓ |
|  | MS Teams | Internal team notifications |  |
| on |  |  | Confirmed |
|  |  | AST Automation Plan — Tech Stack Conflict Analysis |  |

# AST_Automation_Implementation_Plan_v2.pdf

## Table 1 (Page 1)

| 0 | 1 | 2 | 3 |
| --- | --- | --- | --- |
|  |  | AST AUTOMATION |  |
|  | IMPLEMENTATION PLAN  v2.0 |  |  |
|  | RPA & No-Credential Approach  |  6 Clients  |  17  |  |  |
|  |  | Version 2.0  |  March 2026  |  Confidential |  |
| 6 | 17 | 2 | 0 |
| Clients | Automations | Phases | Client Credentials |
|  |  |  | Required |

## Table 2 (Page 2)

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


## Table 3 (Page 2)

| 0 | 1 |
| --- | --- |
| RPA-First Architecture Principles |  |
| • | No API credentials, tokens, or backend access requ |
|  | • Works on existing agent login sessions — piggyba |
| • | All NLP/AI processing runs locally on the agent's  |
| • | Config files (JSON) allow team leads to update rul |
| • | Browser extensions (Chrome/Edge) + desktop Python  |
| • | Fallback to manual always available — automation a |

## Table 4 (Page 2)

| 0 | 1 | 2 |
| --- | --- | --- |
| Core RPA Toolstack |  |  |
| Tool / Library | Use Case | Why No Credentials Needed |
|  | Multi-tab browser automation, | Uses agent's existing authenticated browser |
| Playwright / Selenium |  |  |
|  | form filling, navigation | session |
| Chrome Extension | DOM reading, overlay injection, | Runs inside the browser, reads page |
| (Content Scripts) | event detection | content directly |
|  | Desktop-level clicks, keystrokes, | Simulates user input — no system access |
| PyAutoGUI / AutoIt |  |  |
|  | hotkey triggers | required |
|  | Read data from screens, PDFs, |  |
| Tesseract OCR |  | Purely local image processing, offline |
|  | portal images |  |
|  | Monitor Downloads folder for | File system watcher, no network access |
| Python watchdog |  |  |
|  | CSV/PDF exports | needed |
|  |  | Local file manipulation, no PDF service |
| pdfplumber / pdfrw | Read and write PDF form fields |  |
|  |  | needed |
| DistilBERT / spaCy | Note summarization, call | Model runs on-device — no API calls, no |
| (local) | classification | data sent externally |
|  |  | Self-hosted local instance, no cloud |
| LibreTranslate (offline) | Non-English call/note translation |  |
|  |  | translation API |

## Table 5 (Page 3)

| 0 | 1 | 2 | 3 |
| --- | --- | --- | --- |
| Phase | Timeline | Focus Areas | Clients |
|  |  | generators, wrap-up multi-tab sync, lead pruning |  |
| (Weeks 1–6) | Quick Wins | via CSV watcher, auto-fax via portal RPA, PDF |  |
|  |  | auto-filler |  |
|  |  | AI reply/note suggesters (local NLP), queue | All 6 clients |
| Phase 2 | Intelligence |  |  |
|  |  | prioritizer overlay, negotiation form-filler, port |  |
| (Weeks 7–14) | Layer |  |  |
|  |  | scraping with cache, template generator app |  |
|  |  | Model accuracy tuning, new portal profiles, team- |  |
| Phase 3 | Tuning & |  | Legacy, Banyan, |
|  |  | lead config UIs, field-mapping updates, user |  |
| (Weeks 15–20) | Expansion |  | TBT |
|  |  | feedback loops |  |

## Table 6 (Page 4)

Flyland Recovery

Addiction counseling center facing manual SF lookups, note duplication between CTM and SF, and 1–2

hour transfer waits to US reps. Specialists handle 50–100% of shifts on calls/chats across night/morning/mid

shifts.

Pain Points


## Table 7 (Page 4)

| 0 | 1 |
| --- | --- |
| Pain Points |  |
| • | Manual SF account lookups take 1–3 mins per call w |
| • | Notes duplicated across both CTM and SF systems po |
| • | Transfer waits to US reps up to 2 hours (10–20 min |
| • | Repetitive note-typing for unqualified or duplicat |
| • | Manual chat replies typed individually per interac |

## Table 8 (Page 4)

| 0 | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| Automation Summary |  |  |  |  |
| Automation | Priority | Effort | Phase | Business Impact |
|  |  |  | Phase | Saves 1–3 mins per call; zero |
| CTM-SF Auto-Account Access | HIGH | Medium |  |  |
|  |  |  | 1 | credential exposure |
| Auto-Note Generator for |  |  | Phase | Eliminates 1–2 mins of note typing per |
|  | HIGH | Medium |  |  |
| Unqualified/Duplicates |  |  | 1 | unqualified/duplicate call |
| Chat Reply Suggester & Form | MEDIU | Low- | Phase | Reduces 1–3 mins chat writing + 1 min |
| Auto-Filler | M | Medium | 2 | form fill per interaction |

## Table 9 (Page 4)

| 0 | 1 |
| --- | --- |
| Automation Detail Specs |  |
| CTM-SF Auto-Account Access |  |
| Priority | HIGH |
| Phase | Phase 1 |
| Effort Level | Medium |
| Inputs | Caller phone number visible on CTM screen |
| Outputs | SF account auto-opened in adjacent browser tab/pan |
|  | Browser extension (Chrome/Edge) detects incoming c |
|  | monitoring. Extracts caller number from CTM's call |
|  | opens SF search URL in a side panel pre-filled wit |
| Technical Approach |  |
|  | credentials needed, agent is already logged into S |
|  | resulting SF page and surfaces key fields (name, h |
|  | floating overlay. |
|  | No SF match: extension shows 'New Lead' button tha |
| Edge Cases |  |
|  | form with phone number. Slow SF page: timeout with |
|  | Record/replay testing via Playwright; verify panel |
| Testing Criteria |  |
|  | notification. |
| Business Impact | Saves 1–3 mins per call; zero credential exposure |

## Table 10 (Page 5)

RPA / No-Credential Approach
⚙

Chrome Extension with content script monitors CTM DOM for call events
•

Playwright/Selenium script triggered on call-start reads the phone number from screen
•

Opens SF in existing browser session using pre-built search URL pattern
•

Overlay panel injects into browser — reads SF DOM, no SF API required
•

Duplicate detection: scans SF search results page for multiple matches and alerts agent
•


## Table 11 (Page 5)

| 0 | 1 |
| --- | --- |
| Auto-Note Generator for Unqualified/Duplicates |  |
| Priority | HIGH |
| Phase | Phase 1 |
| Effort Level | Medium |
| Inputs | Call transcript text (from screen/clipboard), disp |
| Outputs | Draft note pre-filled in SF/CTM note field |
|  | Desktop listener monitors CTM's disposition dropdo |
|  | 'Unqualified' or 'Duplicate' selection, reads any  |
|  | via DOM scraping or clipboard capture. Runs local  |
| Technical Approach |  |
|  | offline model) to classify and generate summary no |
|  | text directly into the SF/CTM notes field via simu |
|  | or DOM injection. |
|  | Complex or emotional content: skip auto-note, flag |
| Edge Cases |  |
|  | confidence: show draft with 'Review before posting |
| Testing Criteria | Replay recorded dispositions; validate 80% of draf |
| Business Impact | Eliminates 1–2 mins of note typing per unqualified |

## Table 12 (Page 6)

| 0 | 1 |
| --- | --- |
|  | using data already visible in the open SF record. |
|  | Long chats: summarize last 5 messages only for con |
| Edge Cases |  |
|  | skip auto-fill, show manual prompt. |
| Testing Criteria | Measure reply selection rate and time-to-send befo |
| Business Impact | Reduces 1–3 mins chat writing + 1 min form fill pe |

## Table 13 (Page 6)

Business Impact
Reduces 1–3 mins chat writing + 1 min form fill per interaction

RPA / No-Credential Approach
⚙

Chrome content script reads chat DOM in real-time for keyword matching
•

Local JSON template library — no external service needed
•

Form filler reads field labels via DOM, matches to SF data already on screen
•

One-click 'Insert' button pastes suggestion into chat input field
•

Offline mode: templates cached locally, works without internet connectivity
•


## Table 14 (Page 7)

| 0 | 1 |
| --- | --- |
| Pain Points |  |
| • | Same disposition entered manually into CTM, SF, ch |
| • | Customer history requires manual SF lookup per cal |
| • | Repetitive form fills and tagging after every inte |
| • | Long US rep approval queues (3 mins to 1 hour) |
| • | Repeat callers re-entered by different agents |

## Table 15 (Page 7)

| 0 | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| Automation Summary |  |  |  |  |
| Automation | Priority | Effort | Phase | Business Impact |
| Wrap-Up Auto-Sync Across |  |  | Phase | Eliminates 1–2 hrs/shift of redundant |
|  | HIGH | High |  |  |
| Systems |  |  | 1 | data entry |
| Customer History Auto-Pull & |  |  | Phase | Saves 2–5 mins of manual lookup per |
|  | HIGH | Medium |  |  |
| Reminders |  |  | 1 | call |
| Form-Filler, Note Summarizer | MEDIU |  | Phase | Reduces wrap-up and triage time by |
|  |  | High |  |  |
| & AI Queue Prioritizer | M |  | 2 | an estimated 30–50% |

## Table 16 (Page 7)

| 0 | 1 |
| --- | --- |
| Automation Detail Specs |  |
| Wrap-Up Auto-Sync Across Systems |  |
| Priority | HIGH |
| Phase | Phase 1 |
| Effort Level | High |
| Inputs | Wrap-up form data visible on screen after call end |
| Outputs | Same data automatically entered into all other ope |
|  | After agent completes wrap-up in primary system (C |
|  | script reads the submitted form data from the conf |
|  | scraping. It then switches to each other open brow |
| Technical Approach |  |
|  | and fills matching fields via simulated input. Use |
|  | (maintained locally) to match field names across s |
|  | needed — agent is already logged into all tabs. |
|  | Tab not open: skip with alert to agent. Conflictin |
| Edge Cases |  |
|  | ask agent before overwriting. |
| Testing Criteria | End-to-end simulation across all 4 systems; verify |
| Business Impact | Eliminates 1–2 hrs/shift of redundant data entry |

## Table 17 (Page 8)

| 0 | 1 |
| --- | --- |
| • | Playwright multi-tab controller: identifies open t |
| • | Reads wrap-up data from CTM confirmation page DOM |
| • | Field mapping config (local JSON) maps CTM field n |
| • | Simulated typing + tab navigation fills each syste |
| • | Duplicate detection: checks if record already exis |

## Table 18 (Page 8)

| 0 | 1 |
| --- | --- |
| Customer History Auto-Pull & Reminders |  |
| Priority | HIGH |
| Phase | Phase 1 |
| Effort Level | Medium |
| Inputs | Caller ID visible in CTM call notification |
| Outputs | SF history panel auto-opened; reminder pop-ups on  |
|  | Chrome extension detects incoming call in CTM DOM. |
|  | and auto-navigates SF (already open) to the caller |
| Technical Approach | search. Reads resulting page data and builds a lig |
|  | card injected as an overlay. Rule-based reminder e |
|  | for conditions like 'unqualified' status and surfa |
|  | Slow SF load: show progress bar and partial result |
| Edge Cases |  |
|  | entry written to local file. |
| Testing Criteria | Validate reminders fire correctly for all configur |
| Business Impact | Saves 2–5 mins of manual lookup per call |

## Table 19 (Page 9)

| 0 | 1 |
| --- | --- |
|  | rules (crisis terms = high urgency), re-renders a  |
|  | CTM. |
|  | Queue > 10: cap display at top 10 by urgency. Abst |
| Edge Cases |  |
|  | text display. |
| Testing Criteria | Verify complex/crisis cases consistently rank at t |
| Business Impact | Reduces wrap-up and triage time by an estimated 30 |

## Table 20 (Page 9)

Business Impact
Reduces wrap-up and triage time by an estimated 30–50%

RPA / No-Credential Approach
⚙

DOM-based form filler with local field-mapping config file
•

Clipboard hook captures note text; local transformer model summarizes offline
•

CTM queue DOM scraper reads caller info, wait time, and any visible notes
•

Urgency scoring via local keyword list (configurable JSON)
•

Queue overlay rendered as floating browser panel — does not modify CTM data
•


## Table 21 (Page 10)

| 0 | 1 |
| --- | --- |
| Pain Points |  |
| • | Hourly outbound dials to leads with no response fo |
| • | SF/CTM duplication across notes, trackers, VOB rec |
| • | Inbound routing lacks equal load balancing |
| • | SMS fallback to voicemail managed manually |
| • | Insurance verification is manual with no status ch |

## Table 22 (Page 10)

| 0 | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| Automation Summary |  |  |  |  |
| Automation | Priority | Effort | Phase | Business Impact |
| Auto-Lead Pruning & Dial/SMS |  |  | Phase | Saves 2–3 hrs/shift on dead-lead |
|  | HIGH | Medium |  |  |
| Automation |  |  | 1 | outbound cycles |
| Auto-Lead Pull & Inbound |  |  | Phase | Eliminates manual routing decisions |
|  | HIGH | Medium |  |  |
| Routing |  |  | 1 | and lead lookup overhead |
| Text Reply Suggester, Note |  |  |  |  |
|  | MEDIU |  | Phase | Reduces note-writing and insurance |
| Templates & Insurance Status |  | Medium |  |  |
|  | M |  | 2 | verification by 3–5 mins per call |
| Checker |  |  |  |  |

## Table 23 (Page 10)

| 0 | 1 |
| --- | --- |
| Automation Detail Specs |  |
| Auto-Lead Pruning & Dial/SMS Automation |  |
| Priority | HIGH |
| Phase | Phase 1 |
| Effort Level | Medium |
| Inputs | Lead list exported from SF/CTM as CSV (standard ex |
| Outputs | Filtered lead list, auto-dial sequence, SMS drafts |
|  | Agent exports lead list from SF/CTM as CSV (existi |
|  | script watches the Downloads folder for new CSV ex |
|  | automatically, and filters out leads with last_con |
| Technical Approach |  |
|  | (configurable, default 14 days). Cleaned list is l |
|  | dialer by simulating the import UI. For voicemail- |
|  | are auto-drafted and queued in the messaging tool  |
|  | Partial responses (e.g., 1 text back): flag lead,  |
| Edge Cases |  |
|  | batch in chunks of 100. |
| Testing Criteria | Simulate 200-lead list; verify 50%+ reduction in d |
| Business Impact | Saves 2–3 hrs/shift on dead-lead outbound cycles |

## Table 24 (Page 11)

RPA / No-Credential Approach
⚙

Local file watcher (Python watchdog) monitors Downloads folder for SF/CTM CSV exports
•

Pandas-based CSV parser applies prune rules — runs fully offline
•

Playwright bot imports filtered list into CTM dialer via the existing import UI
•

Voicemail detection: monitors CTM call result field; on VM result, opens SMS tool and pre-fills 
•

template

Batch limit: 100 leads per run to avoid overwhelming the dialer
•


## Table 25 (Page 11)

| 0 | 1 |
| --- | --- |
| Auto-Lead Pull & Inbound Routing |  |
| Priority | HIGH |
| Phase | Phase 1 |
| Effort Level | Medium |
| Inputs | Incoming call notification visible in CTM, agent s |
| Outputs | Lead data pre-loaded in SF; call routed to next av |
|  | Chrome extension reads incoming call data from CTM |
|  | Simultaneously reads agent status panel (also in C |
|  | available agents. Round-robin state maintained in  |
| Technical Approach |  |
|  | machine. Extension auto-opens matching SF lead in  |
|  | suggestion displayed to supervisor as an overlay — |
|  | needed. |
|  | No lead found: show 'Create Lead' shortcut. All ag |
| Edge Cases |  |
|  | with ETA. |
| Testing Criteria | Simulate 20 calls; verify even distribution across |
| Business Impact | Eliminates manual routing decisions and lead looku |

## Table 26 (Page 12)

| 0 | 1 |
| --- | --- |
|  | checker reads insurance name and member ID from SF |
|  | then uses Playwright to auto-navigate to the relev |
|  | already logged in) and scrapes the eligibility/cov |
|  | Portal navigation fails: alert agent to check manu |
| Edge Cases |  |
|  | checker, show manual prompt. |
| Testing Criteria | Target > 85% correct status reads across top 10 in |
| Business Impact | Reduces note-writing and insurance verification by |

## Table 27 (Page 12)

Business Impact
Reduces note-writing and insurance verification by 3–5 mins per call

RPA / No-Credential Approach
⚙

DOM reader for SMS window content; local template JSON for suggestions
•

Disposition-triggered note template injection via simulated keystrokes
•

Playwright navigates to insurance portal in new tab using agent's existing login
•

Screen scraper reads eligibility result and displays qualified/unqualified badge in overlay
•

Ambiguous results: prompt agent for manual confirmation before tagging
•


## Table 28 (Page 13)

| 0 | 1 |
| --- | --- |
| Pain Points |  |
| • | Manual fax submission for insurance appeals (5+ mi |
| • | Daily carrier contacts for same accounts (repetiti |
| • | 20-minute claim lookups with double-check verifica |
| • | Status changes (PAID → UNDERPAID) done manually pe |
| • | Notation duplication per Date of Service in report |

## Table 29 (Page 13)

| 0 | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| Automation Summary |  |  |  |  |
| Automation | Priority | Effort | Phase | Business Impact |
| Auto-Fax for Appeals & Claim |  |  | Phase | Saves 5–10 mins per appeal; |
|  | HIGH | Medium |  |  |
| Status Updater |  |  | 1 | eliminates manual fax navigation |
| Claim-Type-Based Appeal |  |  | Phase | Eliminates manual destination lookup |
|  | HIGH | Low |  |  |
| Router |  |  | 1 | per claim; reduces routing errors |
| Negotiation Form-Filler & Reply | MEDIU |  | Phase | Reduces 10–15 mins of drafting per |
|  |  | Medium |  |  |
| Suggester | M |  | 2 | negotiation/appeal |

## Table 30 (Page 13)

| 0 | 1 |
| --- | --- |
| Automation Detail Specs |  |
| Auto-Fax for Appeals & Claim Status Updater |  |
| Priority | HIGH |
| Phase | Phase 1 |
| Effort Level | Medium |
|  | Appeal document open on screen (PDF viewer or web  |
| Inputs |  |
|  | in billing portal |
| Outputs | Fax queued and sent via online fax tool; claim sta |
|  | Agent prepares appeal document as usual. RPA bot m |
|  | Appeal' button click (or hotkey trigger). It captu |
|  | browser download bar or file picker using screen O |
| Technical Approach | to the online fax portal the team already uses (ag |
|  | recipient fax number (pulled from a local carrier  |
|  | the file, and submits. Status update: bot reads cu |
|  | portal DOM and changes it via UI interaction. |
|  | Fax portal session expired: alert specialist to re |
| Edge Cases |  |
|  | validation check from local rules file. |
|  | Full cycle simulation: prep doc → fax submission → |
| Testing Criteria |  |
|  | confirmation. |
| Business Impact | Saves 5–10 mins per appeal; eliminates manual fax  |

## Table 31 (Page 14)

RPA / No-Credential Approach
⚙

PyAutoGUI hotkey listener triggers fax workflow on specialist's command
•

Screen OCR (Tesseract) identifies open PDF filename from title bar or download bar
•

Playwright navigates existing fax portal session — no fax API credentials required
•

Carrier fax directory: local JSON file mapping carrier names to fax numbers
•

Claim status update: DOM interaction on billing portal — reads current value, selects new status 
•

from dropdown


## Table 32 (Page 14)

| 0 | 1 |
| --- | --- |
| Claim-Type-Based Appeal Router |  |
| Priority | HIGH |
| Phase | Phase 1 |
| Effort Level | Low |
| Inputs | Claim record visible on screen in billing portal |
| Outputs | Routing decision shown as overlay (fax number or e |
|  | Chrome extension reads claim type, plan name, and  |
|  | portal DOM. Applies a local rule engine (JSON conf |
|  | to determine whether the appeal goes to local plan |
| Technical Approach |  |
|  | Displays the correct destination prominently as an |
|  | fax/email tool accordingly. Config file is editabl |
|  | needed for rule updates. |
|  | Unknown type: default to manual with alert. Multi- |
| Edge Cases |  |
|  | select plan. |
| Testing Criteria | Target 100% routing accuracy for all known claim t |
| Business Impact | Eliminates manual destination lookup per claim; re |

## Table 33 (Page 15)

| 0 | 1 |
| --- | --- |
|  | message DOM. Runs local keyword matching against a |
|  | (JSON config) to identify response type (e.g., 'de |
|  | for info'). Surfaces 2–3 suggested next steps/repl |
|  | negotiation form, reads existing claim data from t |
|  | injects it into the negotiation form fields using  |
|  | Short/vague carrier response: default to general t |
| Edge Cases |  |
|  | negotiations: escalation button in overlay. |
| Testing Criteria | Survey-based time reduction target: 1–2 hrs saved  |
| Business Impact | Reduces 10–15 mins of drafting per negotiation/app |

## Table 34 (Page 15)

Business Impact
Reduces 10–15 mins of drafting per negotiation/appeal

RPA / No-Credential Approach
⚙

DOM reader captures carrier response text from email client or portal message thread
•

Local negotiation playbook (JSON): response patterns mapped to suggested actions
•

Overlay panel shows ranked suggestions with 'Copy' and 'Insert' buttons
•

Form filler reads claim fields from open billing portal tab; injects into negotiation form
•

Complex cases: 'Escalate' button in overlay opens team lead chat with pre-filled context
•


## Table 35 (Page 16)

| 0 | 1 |
| --- | --- |
| Pain Points |  |
| • | Manual SF lookup takes 1–2 mins per call with syst |
| • | Admission tickets created with limited caller info |
| • | Transfer waits to specialist via group chat: 5–10  |
| • | Post-call tracker and SF updated separately (dupli |
| • | Repeat callers re-entered manually in SF |

## Table 36 (Page 16)

| 0 | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| Automation Summary |  |  |  |  |
| Automation | Priority | Effort | Phase | Business Impact |
|  |  |  | Phase | Saves 1–2 mins per call; eliminates |
| CTM-SF Auto-Account Pop-Up | HIGH | Medium |  |  |
|  |  |  | 1 | most common manual lookup |
| Auto-Call Tracking & |  |  | Phase | Eliminates duplicate entry; saves 1–2 |
|  | HIGH | High |  |  |
| Form/Note Auto-Fill |  |  | 1 | mins of wrap-up per call |
| Note Summarizer & Reply | MEDIU |  | Phase | Reduces review and response time; |
|  |  | Medium |  |  |
| Suggester | M |  | 2 | speeds up admissions workflow |

## Table 37 (Page 16)

| 0 | 1 |
| --- | --- |
| Automation Detail Specs |  |
| CTM-SF Auto-Account Pop-Up |  |
| Priority | HIGH |
| Phase | Phase 1 |
| Effort Level | Medium |
| Inputs | Caller phone number visible in CTM call notificati |
| Outputs | SF account data displayed as floating overlay; new |
|  | Chrome extension with content script monitors CTM  |
|  | by polling the DOM. On call detection, extracts ca |
|  | call notification element. Uses the phone number t |
| Technical Approach | and opens it in the background within the same bro |
|  | logged into SF). Reads the resulting SF page DOM t |
|  | admission history, last contact, status) and rende |
|  | card pinned to the corner of the screen. |
|  | SF timeout after 5s: overlay shows partial data wi |
| Edge Cases |  |
|  | Duplicate accounts: prompt merge. |
| Testing Criteria | Simulate 50 calls; verify overlay renders within 2 |
| Business Impact | Saves 1–2 mins per call; eliminates most common ma |

## Table 38 (Page 17)

RPA / No-Credential Approach
⚙

Content script polls CTM DOM for call state changes every 500ms
•

Phone number extracted via DOM selector targeting CTM's caller ID element
•

SF opened in background tab using search URL pattern — no API token needed
•

Overlay card reads SF DOM fields and renders summary using injected CSS/JS
•

Duplicate accounts: scans SF results for multiple entries and shows merge prompt
•

No match: 'Create Lead' button in overlay pre-fills SF new lead form with phone number
•


## Table 39 (Page 17)

| 0 | 1 |
| --- | --- |
| Auto-Call Tracking & Form/Note Auto-Fill |  |
| Priority | HIGH |
| Phase | Phase 1 |
| Effort Level | High |
|  | Call metadata visible in CTM post-call (duration,  |
| Inputs |  |
|  | wrap-up screen |
| Outputs | Tracker row added automatically; SF record updated |
|  | After agent selects disposition in CTM wrap-up, a  |
|  | visible wrap-up fields from CTM DOM. It switches t |
|  | or internal web tracker open in another tab) and a |
| Technical Approach | clicks and keystrokes — no Sheets API needed. Simu |
|  | the SF record (already open from the earlier pop-u |
|  | fields. Ticket pre-fill: opens admission ticket fo |
|  | from data already on screen. |
|  | Incomplete transcription: show editable draft with |
| Edge Cases |  |
|  | Conflicting data: alert agent before overwriting. |
| Testing Criteria | End-to-end simulation; verify zero duplicate entri |
| Business Impact | Eliminates duplicate entry; saves 1–2 mins of wrap |

## Table 40 (Page 18)

| 0 | 1 |
| --- | --- |
|  | Agent selects (highlights) note text in SF or copi |
|  | content. Local transformer model (DistilBERT or si |
|  | agent machine) generates a summary under 100 words |
| Technical Approach |  |
|  | in a persistent overlay panel and can be inserted  |
|  | suggester reads the active chat/message window DOM |
|  | local template DB, and surfaces 2–3 options in the |
|  | Empty clipboard: show 'Select text first' prompt.  |
| Edge Cases |  |
|  | auto-summarize, alert supervisor. |
| Testing Criteria | User acceptance test: target 30% time reduction pe |
| Business Impact | Reduces review and response time; speeds up admiss |

## Table 41 (Page 18)

Business Impact
Reduces review and response time; speeds up admissions workflow

RPA / No-Credential Approach
⚙

Clipboard monitor captures highlighted/copied text automatically
•

Local NLP model runs offline — no cloud processing, no data leaves the machine
•

Summary overlay panel: one-click insert into active note field
•

Template DB: local JSON with keyword-to-reply mappings, updatable by team lead
•

Non-English text: passed through local translation layer (LibreTranslate offline) before 
•

summarization


## Table 42 (Page 19)

| 0 | 1 |
| --- | --- |
| Pain Points |  |
| • | 10+ PDF forms filled manually per day per speciali |
| • | Same patient/insurance data re-entered across mult |
| • | 1–4 hour IVR/queue waits to reach insurance repres |
| • | Multiple systems updated post-call (duplication) |
| • | New portals require manual navigation without API  |

## Table 43 (Page 19)

| 0 | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| Automation Summary |  |  |  |  |
| Automation | Priority | Effort | Phase | Business Impact |
|  |  |  | Phase | Saves 2–5 mins × 10+ forms/day = |
| PDF Auto-Filler | HIGH | Medium |  |  |
|  |  |  | 1 | 20–50+ mins daily per specialist |
| Insurance Portal Auto-Lookup |  |  | Phase | Eliminates manual portal navigation; |
|  | HIGH | High |  |  |
| & Reminders |  |  | 2 | surfaces missed fields automatically |
|  |  |  |  | Eliminates template setup time; |
| Pre-Filled Insurance Form | MEDIU |  | Phase |  |
|  |  | Low |  | ensures field consistency across all |
| Template Generator | M |  | 2 |  |
|  |  |  |  | forms |

## Table 44 (Page 19)

| 0 | 1 |
| --- | --- |
| Automation Detail Specs |  |
| PDF Auto-Filler |  |
| Priority | HIGH |
| Phase | Phase 1 |
| Effort Level | Medium |
| Inputs | Blank PDF form opened by specialist, patient recor |
| Outputs | PDF with standard fields auto-populated; specialis |
|  | When specialist opens a PDF form, a desktop Python |
|  | background tray app) detects the new PDF via file  |
|  | field labels using pdfplumber (no server needed).  |
| Technical Approach | data from the currently open SF/billing portal tab |
|  | field labels to patient data using a local field-m |
|  | PDF fields using PyPDF2/pdfrw and saves a pre-fill |
|  | review and finalize. |
|  | Missing patient data: highlight unfilled fields in |
| Edge Cases |  |
|  | process in chunks. Unrecognized form: skip and ale |
|  | Fill 10 representative forms; target 100% accuracy |
| Testing Criteria |  |
|  | savings > 50%. |
| Business Impact | Saves 2–5 mins × 10+ forms/day = 20–50+ mins daily |

## Table 45 (Page 20)

RPA / No-Credential Approach
⚙

Python file watcher (watchdog) detects when specialist opens a new PDF
•

pdfplumber reads form field labels offline — no external service needed
•

DOM scraper reads patient data from open SF/billing portal tab in Chrome
•

Local field-mapping config (JSON): maps PDF field labels to SF DOM selectors
•

pdfrw/PyPDF2 writes values into PDF fields and saves pre-filled copy to same folder
•

Preview UI: system notification with 'Open Filled PDF' button
•


## Table 46 (Page 20)

| 0 | 1 |
| --- | --- |
| Insurance Portal Auto-Lookup & Reminders |  |
| Priority | HIGH |
| Phase | Phase 2 |
| Effort Level | High |
|  | Insurance portal open in browser (agent already lo |
| Inputs |  |
|  | visible on screen |
|  | Eligibility/coverage data extracted and displayed  |
| Outputs |  |
|  | for missed fields |
|  | Chrome extension detects when specialist navigates |
|  | portal (by URL pattern). Reads the policy ID from  |
|  | Auto-navigates to the portal's eligibility lookup  |
| Technical Approach | DOM interaction — specialist is already authentica |
|  | for key coverage fields (deductible, copay, in/out |
|  | results in a floating overlay and triggers reminde |
|  | data. Cached results stored in browser localStorag |
|  | Portal downtime: use cached result with timestamp  |
| Edge Cases |  |
|  | specialist to re-login. New portal: specialist add |
| Testing Criteria | Simulate lookups on top 10 insurance portals; targ |
| Business Impact | Eliminates manual portal navigation; surfaces miss |

## Table 47 (Page 21)

| 0 | 1 |
| --- | --- |
| Outputs | Template PDF with common fields pre-filled, ready  |
|  | A lightweight local desktop app (Tkinter or Electr |
|  | dropdown of insurance types. On selection, it load |
|  | from a local templates folder, pre-fills standard  |
| Technical Approach |  |
|  | standard codes) from a local JSON config, and open |
|  | PDF viewer. Specialists can upload new template PD |
|  | through a simple UI — no developer needed. |
|  | Custom/non-standard insurer: 'Upload Template' opt |
| Edge Cases |  |
|  | values: highlight in yellow. |
|  | Generate templates for all active insurers; gather |
| Testing Criteria |  |
|  | iteration. |
| Business Impact | Eliminates template setup time; ensures field cons |

## Table 48 (Page 21)

Business Impact
Eliminates template setup time; ensures field consistency across all forms

RPA / No-Credential Approach
⚙

Local desktop app (Tkinter) — no internet connection required
•

Templates stored as PDF files in a shared network folder or local directory
•

JSON config maps insurance type to standard field values
•

Field mapping UI allows team lead to add new insurance types and templates
•

Output: pre-filled PDF opened in default viewer, saved to specialist's working folder
•


## Table 49 (Page 22)

| 0 | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| without any client backend access. |  |  |  |  |
| Automation | Client | Priority | Effort | Primary RPA Method |
|  |  |  |  | Chrome Extension with |
| CTM-SF Auto-Account |  |  |  |  |
|  | Flyland Recovery | HIGH | Medium | content script monitors CTM |
| Access |  |  |  |  |
|  |  |  |  | DOM for call events |
|  |  |  |  | PyAutoGUI or Playwright |
| Auto-Note Generator for |  |  |  |  |
|  | Flyland Recovery | HIGH | Medium | detects disposition field |
| Unqualified/Duplicates |  |  |  |  |
|  |  |  |  | change in CTM |
|  |  |  |  | Playwright multi-tab |
| Wrap-Up Auto-Sync |  |  |  |  |
|  | Legacy | HIGH | High | controller: identifies open |
| Across Systems |  |  |  |  |
|  |  |  |  | tabs by URL pattern |
|  |  |  |  | Content script polls CTM |
| Customer History Auto- |  |  |  |  |
|  | Legacy | HIGH | Medium | DOM for active call state |
| Pull & Reminders |  |  |  |  |
|  |  |  |  | changes |
|  |  |  |  | Local file watcher (Python |
| Auto-Lead Pruning & |  |  |  | watchdog) monitors |
|  | TBT | HIGH | Medium |  |
| Dial/SMS Automation |  |  |  | Downloads folder for SF/CTM |
|  |  |  |  | CSV exports |
|  |  |  |  | Content script reads CTM call |
| Auto-Lead Pull & |  |  |  |  |
|  | TBT | HIGH | Medium | queue and agent status DOM |
| Inbound Routing |  |  |  |  |
|  |  |  |  | in real-time |
|  |  |  |  | PyAutoGUI hotkey listener |
| Auto-Fax for Appeals & |  |  |  |  |
|  | Takahami | HIGH | Medium | triggers fax workflow on |
| Claim Status Updater |  |  |  |  |
|  |  |  |  | specialist's command |
|  |  |  |  | Content script reads claim |
| Claim-Type-Based |  |  |  |  |
|  | Takahami | HIGH | Low | type and payer fields from |
| Appeal Router |  |  |  |  |
|  |  |  |  | billing portal DOM |
|  |  |  |  | Content script polls CTM |
| CTM-SF Auto-Account |  |  |  |  |
|  | Banyan | HIGH | Medium | DOM for call state changes |
| Pop-Up |  |  |  |  |
|  |  |  |  | every 500ms |
|  |  |  |  | Playwright multi-tab manager: |
| Auto-Call Tracking & |  |  |  |  |
|  | Banyan | HIGH | High | reads CTM wrap-up DOM |
| Form/Note Auto-Fill |  |  |  |  |
|  |  |  |  | after disposition submit |
|  |  |  |  | Python file watcher |
|  | Element Medical |  |  |  |
| PDF Auto-Filler |  | HIGH | Medium | (watchdog) detects when |
|  | Billing |  |  |  |
|  |  |  |  | specialist opens a new PDF |

## Table 50 (Page 23)

| 0 | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| Automation | Client | Priority | Effort | Primary RPA Method |
|  |  |  |  | Chrome content script reads |
| Chat Reply Suggester & |  |  | Low- |  |
|  | Flyland Recovery | MEDIUM |  | chat DOM in real-time for |
| Form Auto-Filler |  |  | Medium |  |
|  |  |  |  | keyword matching |
| Form-Filler, Note |  |  |  |  |
|  |  |  |  | DOM-based form filler with |
| Summarizer & AI Queue | Legacy | MEDIUM | High |  |
|  |  |  |  | local field-mapping config file |
| Prioritizer |  |  |  |  |
| Text Reply Suggester, |  |  |  |  |
|  |  |  |  | DOM reader for SMS window |
| Note Templates & |  |  |  |  |
|  | TBT | MEDIUM | Medium | content; local template JSON |
| Insurance Status |  |  |  |  |
|  |  |  |  | for suggestions |
| Checker |  |  |  |  |
|  |  |  |  | DOM reader captures carrier |
| Negotiation Form-Filler & |  |  |  | response text from email |
|  | Takahami | MEDIUM | Medium |  |
| Reply Suggester |  |  |  | client or portal message |
|  |  |  |  | thread |
|  |  |  |  | Clipboard monitor captures |
| Note Summarizer & |  |  |  |  |
|  | Banyan | MEDIUM | Medium | highlighted/copied text |
| Reply Suggester |  |  |  |  |
|  |  |  |  | automatically |
|  |  |  |  | Content script detects portal |
| Insurance Portal Auto- | Element Medical |  |  |  |
|  |  | HIGH | High | URL and activates portal- |
| Lookup & Reminders | Billing |  |  |  |
|  |  |  |  | specific scraping profile |
| Pre-Filled Insurance |  |  |  | Local desktop app (Tkinter) |
|  | Element Medical |  |  |  |
| Form Template |  | MEDIUM | Low | — no internet connection |
|  | Billing |  |  |  |
| Generator |  |  |  | required |

## Table 51 (Page 23)

| 0 | 1 |
| --- | --- |
| Deployment Requirements (Per Agent Machine) |  |
| • | Python 3.10+ with: playwright, selenium, pyautogui |
|  | tesseract-ocr |
| • | Chrome or Edge browser with the custom automation  |
| • | Local NLP models downloaded once: DistilBERT (summ |
| • | LibreTranslate local instance (optional, for clien |
| • | Local config folder with JSON files: field mapping |
| • | Network access only to systems agents already use  |

## Table 52 (Page 23)

| 0 | 1 | 2 | 3 |
| --- | --- | --- | --- |
| Risk Register |  |  |  |
| Risk | Likelihood | Impact | Mitigation |
|  |  |  | Modular scraper profiles per portal; auto- |
| Portal UI changes break |  |  |  |
|  | High | Medium | detect breakage and alert; quick config |
| DOM scrapers |  |  |  |
|  |  |  | update process |
| CTM/SF DOM structure |  |  | Client-specific selector config files; one- |
|  | Medium | High |  |
| differs per client |  |  | time mapping session per deployment |
| Local NLP model accuracy |  |  | Confidence threshold gates; low-confidence |
|  | Medium | Medium |  |
| below threshold |  |  | outputs shown as drafts, not auto-posted |
| Agent machine | Low | Medium | Lightweight polling intervals; scripts idle |
| performance impacted by |  |  | when agent is not on a call |

## Table 53 (Page 24)

| 0 | 1 | 2 | 3 |
| --- | --- | --- | --- |
| Estimated Time Savings Summary |  |  |  |
| Client | Key Automation | Time Lost Currently | Projected Savings |
|  | CTM-SF session pop-up + |  |  |
| Flyland Recovery |  | 1–3 hrs/shift | ~60–90 min/shift |
|  | auto-notes |  |  |
|  | Multi-tab wrap-up sync + AI |  |  |
| Legacy |  | 1–2 hrs/shift | ~60–90 min/shift |
|  | prioritizer |  |  |
|  | CSV-based lead pruning + | Half shift on dead |  |
| TBT |  |  | ~2–3 hrs/shift |
|  | auto-dialer | leads |  |
|  | Portal RPA fax + status |  |  |
| Takahami |  | 20 min–2 hrs/shift | ~60–90 min/shift |
|  | DOM updater |  |  |
|  | Session pop-up + multi-tab | 40% shift on manual |  |
| Banyan |  |  | ~2 hrs/shift |
|  | auto-tracking | entry |  |
|  | PDF auto-filler + portal | 50% shift in queue + |  |
| Element Medical |  |  | ~2–3 hrs/shift |
|  | scraper | 10+ forms |  |

