# ATS Automation - Complete Documentation

> **Project**: Automation System for 6 BPO Client Companies  
> **Version**: 2.0  
> **Date**: March 2026  
> **Approach**: RPA-First (No API Credentials Required)

---

## Quick Reference

| Item | Value |
|------|-------|
| Total Clients | 6 |
| Total Automations | 17 |
| Implementation Phases | 2 |
| Timeline | 20 Weeks |
| Client Credentials Required | 0 |

---

## Client Overview

| Client | Industry | Primary Systems | Automations |
|--------|----------|-----------------|-------------|
| Flyland Recovery | Addiction Counseling | CTM, Salesforce, ZOHO | 4 |
| Legacy | BPO Services | CTM, Salesforce, ZOHO SalesIQ | 3 |
| TBT | BPO Services | SF Lightning (no CTM) | 4 |
| Banyan | Addiction Counseling | Google Forms, Salesforce | 2 |
| Takahami | Medical Billing | RingCentral, KIPU, CollaborateMD | 2 |
| Element Medical Billing | Medical Billing | TurboScribe, Availity, VerifyTx | 2 |

---

## Core Principle

**All automations work on existing agent login sessions** - no API credentials, backend access, or system integrations required from any client.

Agents are already logged into every system they use (SF, CTM, billing portals, trackers). Automations work on top of these active sessions using:
- Browser extensions
- Screen scraping
- DOM interaction
- Local scripts
- Simulated input

---

## Documentation Structure

1. **[Architecture](architecture.md)** - Technical architecture and system design
2. **[Clients](clients..md)** - Client-specific details and system configurations
3. **[Automations](automations..md)** - All 17 automation specifications
4. **[Tech Stack](tech-stack..md)** - Technology stack and tool recommendations
5. **[Implementation Plan](implementation-plan..md)** - Phased rollout schedule
6. **[Risks](risks..md)** - Risk assessment and mitigation strategies
7. **[Deployment](deployment..md)** - Deployment requirements and setup

---

## Key Findings

### Critical Issues Resolved

1. **TBT has no CTM** - Uses Salesforce Lightning exclusively
2. **Flyland + TBT share SF** - Must use owner/record-type filters
3. **Takahami uses RingCentral** - Not CTM; requires different call detection
4. **Legacy uses ZOHO SalesIQ** - Different DOM profile than ZOHO Mail

### Estimated Time Savings

| Client | Current Loss | Projected Savings |
|--------|--------------|-------------------|
| Flyland Recovery | 1-3 hrs/shift | ~60-90 min/shift |
| Legacy | 1-2 hrs/shift | ~60-90 min/shift |
| TBT | Half shift on dead leads | ~2-3 hrs/shift |
| Banyan | 40% shift on manual entry | ~2 hrs/shift |
| Takahami | 20 min-2 hrs/shift | ~60-90 min/shift |
| Element Medical | 50% shift in queue | ~2-3 hrs/shift |

---

*This documentation is confidential and intended for internal team use only.*
