# ATS Automation - Implementation Plan

## Overview

| Phase | Timeline | Focus Areas | Clients |
|-------|----------|-------------|---------|
| Phase 1 | Weeks 1-6 | Quick Wins: session pop-ups, auto-notes, wrap-up sync, lead pruning, auto-fax, PDF filler | All 6 clients |
| Phase 2 | Weeks 7-14 | Intelligence Layer: AI reply/note suggesters, queue prioritizer, negotiation form-filler, portal scraping | All 6 clients |
| Phase 3 | Weeks 15-20 | Tuning & Expansion: Model accuracy tuning, new portal profiles, team config UIs, feedback loops | Legacy, Banyan, TBT |

---

## Phase 1: Quick Wins (Weeks 1-6)

### Goal
Deploy high-impact, lower-complexity automations that deliver immediate time savings.

### Automations
1. CTM-SF Auto-Account Access (Flyland)
2. Auto-Note Generator (Flyland)
3. Wrap-Up Auto-Sync (Legacy)
4. Customer History Auto-Pull (Legacy)
5. Auto-Lead Pruning (TBT)
6. Auto-Lead Pull & Inbound Routing (TBT)
7. Auto-Fax for Appeals (Takahami)
8. Claim-Type-Based Appeal Router (Takahami)
9. CTM-SF Auto-Account Pop-Up (Banyan)
10. Auto-Call Tracking & Form/Note Auto-Fill (Banyan)
11. PDF Auto-Filler (Element)

### Weekly Breakdown

#### Week 1-2: Foundation
- [ ] Setup development environment
- [ ] Install Playwright, PyAutoGUI, NLP libraries
- [ ] Create Chrome Extension skeleton
- [ ] Build DOM profile for Flyland (CTM + SF)
- [ ] Test CTM call event detection

#### Week 3-4: Core Development
- [ ] Implement CTM-SF Auto-Account Access (Flyland)
- [ ] Implement Auto-Note Generator (Flyland)
- [ ] Implement PDF Auto-Filler (Element)
- [ ] Test all automations in dev environment

#### Week 5-6: Deployment & Testing
- [ ] Deploy to 2-3 pilot agents (Flyland)
- [ ] Collect feedback, fix bugs
- [ ] Deploy remaining Phase 1 automations
- [ ] Document issues for Phase 2

### Success Criteria
- Each automation saves 1-3 mins per interaction
- Zero credential exposure
- 80%+ automation success rate

---

## Phase 2: Intelligence Layer (Weeks 7-14)

### Goal
Add AI-powered automations for more complex tasks.

### Automations
1. Chat Reply Suggester & Form Auto-Filler (Flyland)
2. Form-Filler, Note Summarizer & AI Queue Prioritizer (Legacy)
3. Text Reply Suggester, Note Templates & Insurance Status Checker (TBT)
4. Note Summarizer & Reply Suggester (Banyan)
5. Negotiation Form-Filler & Reply Suggester (Takahami)
6. Pre-Filled Insurance Form Template Generator (Element)

### Weekly Breakdown

#### Week 7-8: NLP Foundation
- [ ] Download and test DistilBERT model
- [ ] Build summarization pipeline
- [ ] Create reply template system
- [ ] Test offline performance

#### Week 9-10: AI Integration
- [ ] Integrate NLP with Chrome Extension
- [ ] Build overlay panel for suggestions
- [ ] Implement clipboard monitoring
- [ ] Test with real calls (pilot)

#### Week 11-12: Portal Intelligence
- [ ] Build Availity portal scraper (Element)
- [ ] Build negotiation form-filler (Takahami)
- [ ] Build insurance status checker (TBT)
- [ ] Test with production data

#### Week 13-14: Refinement
- [ ] Polish all Phase 2 automations
- [ ] Deploy to all agents
- [ ] Collect feedback
- [ ] Plan Phase 3 refinements

### Success Criteria
- 30%+ time reduction per task
- <5% error rate on AI suggestions
- Agent satisfaction >4/5

---

## Phase 3: Tuning & Expansion (Weeks 15-20)

### Goal
Fine-tune existing automations based on feedback and expand to new scenarios.

### Focus Areas
1. Model accuracy tuning based on real outputs
2. New portal profiles (as clients add systems)
3. Team lead configuration UIs
4. Field-mapping updates without code changes
5. User feedback loops

### Weekly Breakdown

#### Week 15-16: Feedback Integration
- [ ] Review all agent feedback
- [ ] Identify top 10 issues
- [ ] Prioritize fixes by impact
- [ ] Update NLP model training

#### Week 17-18: Config UIs
- [ ] Build field-mapping UI for non-technical users
- [ ] Build template editor UI
- [ ] Build rule configuration UI
- [ ] Test with team leads

#### Week 19-20: Optimization
- [ ] Performance optimization (reduce memory/CPU)
- [ ] Browser update compatibility fixes
- [ ] Documentation updates
- [ ] Final deployment to all agents

### Success Criteria
- <2% automation failure rate
- Non-technical users can update configs
- 50%+ reduction in manual tasks

---

## Rollout Strategy

### Pilot Program (Phase 1)
```
Week 3: 2-3 agents (Flyland)
Week 5: 5-8 agents (all clients)
Week 6: Full rollout
```

### Staggered Client Deployment
```
Week 1-2: Flyland (most mature CTM/SF setup)
Week 3-4: Legacy, TBT (similar systems)
Week 5-6: Banyan, Takahami, Element (unique setups)
```

---

## Testing Strategy

### Unit Tests
- Each function has >80% test coverage
- Mock DOM elements for isolated testing

### Integration Tests
- Test against CTM/SF staging (if available)
- Test Chrome Extension + Playwright integration

### User Acceptance Testing
- 5 agents per client
- 2-week UAT period
- Survey-based feedback

### Performance Testing
- Memory usage <500MB
- CPU idle when not on call
- <2s response time for overlays

---

## Resource Requirements

### Team Structure
| Role | Count | Phase 1 | Phase 2 | Phase 3 |
|------|-------|---------|---------|---------|
| Python Developer | 2 | Full | Full | 1 |
| Chrome Extension Dev | 1 | Full | Part | Part |
| QA Engineer | 1 | Full | Full | Part |
| Project Manager | 1 | Part | Part | Part |

### Equipment
- 3 developer machines (8GB RAM minimum)
- 5 test agent machines (for UAT)
- Central server (optional, for config management)

---

## Timeline Summary

```
Phase 1 (Quick Wins)     ████████░░░░░░░  Weeks 1-6
Phase 2 (Intelligence)   ░░░░░░████████  Weeks 7-14
Phase 3 (Tuning)         ░░░░░░░░░████  Weeks 15-20

Total Duration: 20 Weeks
```

---

## Go/No-Go Criteria

### Phase 1 Go
- [ ] Development environment ready
- [ ] Chrome Extension loads without errors
- [ ] Playwright can navigate CTM/SF
- [ ] DOM selectors identified for Flyland

### Phase 2 Go
- [ ] Phase 1 automations deployed
- [ ] >80% success rate achieved
- [ ] NLP models downloaded and tested
- [ ] Agent feedback collected

### Phase 3 Go
- [ ] Phase 2 automations deployed
- [ ] <5% error rate
- [ ] Config UIs functional
- [ ] Documentation complete

---

## Risk-Adjusted Timeline

| Risk | Likelihood | Impact | Mitigation | Buffer |
|------|------------|--------|------------|--------|
| Portal UI changes | High | Medium | Modular scraper profiles | +1 week |
| NLP model accuracy | Medium | Medium | Confidence thresholds | +1 week |
| Agent adoption | Medium | High | Training sessions | +1 week |
| Browser updates | Medium | Medium | Version pinning | +1 week |

**Adjusted Timeline**: 24 weeks (20 planned + 4 buffer)

---

*Last updated: March 2026*
