# ATS Automation - Risk Assessment & Mitigation

## Risk Register Overview

| Risk | Likelihood | Impact | Priority |
|------|------------|--------|----------|
| Portal UI changes break DOM scrapers | High | Medium | HIGH |
| CTM/SF DOM differs per client | Medium | High | HIGH |
| Local NLP model accuracy below threshold | Medium | Medium | MEDIUM |
| Agent machine performance impacted | Low | Medium | LOW |
| Chrome Extension blocked by browser | Low | High | MEDIUM |
| Data privacy concerns | Low | High | MEDIUM |
| Agent adoption resistance | Medium | High | HIGH |

---

## Detailed Risk Analysis

### 1. Portal UI Changes Break DOM Scrapers

**Risk**: Client portals (CTM, Salesforce, billing portals) update their UI frequently. DOM selectors used by automations may break without warning.

**Likelihood**: HIGH  
**Impact**: MEDIUM  
**Priority**: HIGH

**Indicators**:
- Automation fails silently
- Overlay doesn't appear
- Form fills wrong field

**Mitigation Strategies**:
```
1. Modular scraper profiles per portal
   - Separate DOM selectors from core logic
   - Easy to update without code changes

2. Auto-detect breakage
   - Monitor for repeated failures
   - Alert team lead within 1 hour
   - Fallback to manual mode

3. Quick config update process
   - JSON-based selector configs
   - Team lead can update in <5 mins
   - No developer needed for simple fixes

4. Version detection
   - Detect portal version from footer/meta
   - Load appropriate selector profile
   - Plan ahead for known updates
```

**Response Plan**:
1. Agent sees warning: "Automation unavailable - portal may have updated"
2. Agent continues manually
3. Alert sent to dev team
4. Dev team updates selector config
5. Push update within 24 hours
6. Agent tests and confirms fix

---

### 2. CTM/SF DOM Differs Per Client

**Risk**: Each client may have customized CTM or Salesforce instances. DOM structure varies.

**Likelihood**: MEDIUM  
**Impact**: HIGH  
**Priority**: HIGH

**Mitigation Strategies**:
```
1. Client-specific selector config files
   - One JSON file per client
   - Documents all DOM selectors
   - Can be updated independently

2. One-time mapping session per deployment
   - Spend 2-4 hours during onboarding
   - Document all unique selectors
   - Test with real calls

3. Flexible selector patterns
   - Use multiple selector strategies
   - Fallback from specific to general
   - Example: #phone-field → [data-testid="phone"]

4. Data filters for shared systems
   - TBT + Flyland share SF
   - Filter by owner/record type
   - Prevent data mixing
```

**Known Issues**:
- Legacy uses ZOHO SalesIQ (different from Flyland's ZOHO Mail)
- TBT uses SF Lightning (not CTM)
- Takahami uses RingCentral (not CTM)
- Banyan uses Google Form (not web app)

---

### 3. Local NLP Model Accuracy Below Threshold

**Risk**: DistilBERT summarization may produce inaccurate or irrelevant notes.

**Likelihood**: MEDIUM  
**Impact**: MEDIUM  
**Priority**: MEDIUM

**Mitigation Strategies**:
```
1. Confidence thresholds
   - Set minimum confidence score (e.g., 0.7)
   - Below threshold: flag for manual review
   - Don't auto-post low-confidence outputs

2. Draft mode
   - Show output as draft, not auto-post
   - Agent reviews and edits
   - One-click approve or edit

3. Training data
   - Collect human-approved notes
   - Fine-tune model over time
   - Improve accuracy with usage

4. Template fallback
   - For low-confidence inputs
   - Use predefined templates
   - Agent fills in specifics
```

**Acceptance Criteria**:
- 80%+ of auto-generated notes require no edits
- Agent satisfaction >4/5
- Time savings >30% despite review time

---

### 4. Agent Machine Performance Impacted

**Risk**: Automation scripts consume CPU/memory, slowing agent's workstation.

**Likelihood**: LOW  
**Impact**: MEDIUM  
**Priority**: LOW

**Mitigation Strategies**:
```
1. Lightweight polling intervals
   - Poll DOM every 500ms (not faster)
   - Sleep when agent not on call
   - No continuous background processes

2. Resource limits
   - Max 2 browser instances
   - Max 200MB RAM per script
   - Kill idle processes after 5 mins

3. Performance monitoring
   - Log CPU/memory usage
   - Alert if exceeds threshold
   - Auto-reduce polling frequency
```

**Acceptance Criteria**:
- <5% CPU when idle
- <10% CPU during automation
- Agent reports no slowdown

---

### 5. Chrome Extension Blocked by Browser

**Risk**: Organization blocks Chrome Extensions or specific permissions.

**Likelihood**: LOW  
**Impact**: HIGH  
**Priority**: MEDIUM

**Mitigation Strategies**:
```
1. Alternative browsers
   - Support Edge, Firefox
   - Same extension, different manifest

2. Standalone mode
   - Run automations without extension
   - Use PyAutoGUI instead
   - More manual, but functional

3. IT engagement
   - Work with IT to whitelist extension
   - Provide security documentation
   - Enterprise-friendly manifest
```

---

### 6. Data Privacy Concerns

**Risk**: Patient/health data processed by automation may violate HIPAA or privacy regulations.

**Likelihood**: LOW  
**Impact**: HIGH  
**Priority**: MEDIUM

**Mitigation Strategies**:
```
1. All processing local
   - No cloud services
   - No data leaves agent machine
   - NLP runs locally

2. No storage of sensitive data
   - Don't save call recordings
   - Don't save chat logs
   - Process and discard immediately

3. Configurable masking
   - Option to mask SSN, DOB
   - Agent controls what automation sees
   - Audit log of what was accessed

4. Compliance documentation
   - Document RPA approach
   - Provide to legal/compliance
   - Get approval before deployment
```

**Key Point**: Since all automation uses existing agent sessions and processes data locally, no new data access is granted. Agents already have access to this data.

---

### 7. Agent Adoption Resistance

**Risk**: Agents resist automation, preferring manual processes.

**Likelihood**: MEDIUM  
**Impact**: HIGH  
**Priority**: HIGH

**Mitigation Strategies**:
```
1. Early involvement
   - Include agents in planning
   - Gather pain points first
   - Design for their needs

2. Training sessions
   - 1-hour hands-on training
   - Show time savings
   - Answer questions

3. Gradual rollout
   - Start with pilot group
   - Expand based on feedback
   - No forced adoption

4. Visible benefits
   - Show time saved per day
   - Celebrate wins
   - Public recognition

5. Easy opt-out
   - Disable automation with hotkey
   - Always available fallback
   - No penalty for manual
```

**Success Metrics**:
- >80% daily active usage
- >4/5 satisfaction score
- Zero complaints after 2 weeks

---

## Contingency Plans

### If Phase 1 Delayed
- Focus on highest-impact automations only
- Defer complex multi-system integrations
- Consider off-the-shelf RPA tools as bridge

### If NLP Underperforms
- Fallback to template-only approach
- Reduce automation scope
- Increase manual review process

### If Agent Adoption Fails
- Reassess automation design
- Focus on biggest pain points
- Consider different tech approach

---

## Monitoring & Alerts

### Automated Monitoring
```
- Automation success rate (target: >95%)
- Average execution time (target: <3s)
- Error frequency (target: <2%)
- Resource usage (CPU <15%, RAM <300MB)
```

### Alert Thresholds
```
- Warning: 3 consecutive failures
- Critical: 10 failures in 1 hour
- Escalation: No response in 24 hours
```

### Dashboard Metrics
```
- Daily automation count
- Time saved (calculated)
- Error breakdown
- Agent feedback trends
```

---

## Risk Matrix

```
Impact
  HIGH   |  Client DOM diff   | Portal UI changes | Agent adoption
         |  (Medium)          | (Medium)          | (High)
         |-------------------|-------------------|----------------
  MEDIUM |  NLP accuracy     | Chrome blocked    | Performance
         |  (Medium)         | (Medium)          | (Low)
         |-------------------|-------------------|----------------
  LOW    |                    | Data privacy      |
         |                    | (Low)             |
         +-------------------+-------------------+----------------
                  LOW              MEDIUM              HIGH
                              Likelihood
```

---

## Key Takeaways

1. **DOM changes are the biggest risk** - Mitigate with modular configs
2. **Agent adoption determines success** - Involve them early
3. **NLP is "nice to have"** - Works fine with templates initially
4. **Everything runs locally** - Minimal compliance risk

---

*Last updated: March 2026*
