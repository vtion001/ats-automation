/**
 * Qualification Manager - Analyzes leads based on keywords and scoring
 */

const QualificationManager = {
    knowledgeBase: null,
    currentScore: 0,
    detectedKeywords: [],
    isListening: false,
    
    async loadKnowledgeBase(clientId) {
        try {
            const newKbUrl = chrome.runtime.getURL(`clients/${clientId}/knowledge-base/flyland-kb.json`);
            const response = await fetch(newKbUrl);
            if (response.ok) {
                this.knowledgeBase = await response.json();
                console.log('[QualificationManager] Knowledge base loaded for:', clientId);
                return this.knowledgeBase;
            }
        } catch(e) {
            console.log('[QualificationManager] flyland-kb.json not found, trying qualification.json');
        }
        
        try {
            const response = await fetch(chrome.runtime.getURL(`clients/${clientId}/knowledge-base/qualification.json`));
            if (response.ok) {
                this.knowledgeBase = await response.json();
                console.log('[QualificationManager] Knowledge base loaded for:', clientId);
            } else {
                console.log('[QualificationManager] Using default knowledge base');
                this.knowledgeBase = this.getDefaultKB();
            }
        } catch(e) {
            console.log('[QualificationManager] Using default knowledge base');
            this.knowledgeBase = this.getDefaultKB();
        }
        return this.knowledgeBase;
    },
    
    getDefaultKB() {
        return {
            qualification_criteria: {
                hot_lead: { keywords: ['interested', 'want', 'need', 'definitely', 'call back'], score_weight: 25 },
                warm_lead: { keywords: ['maybe', 'information', 'details', 'pricing'], score_weight: 15 },
                scheduling: { keywords: ['appointment', 'schedule', 'book', 'meeting'], score_weight: 20 },
                insurance: { keywords: ['insurance', 'coverage', 'benefits'], score_weight: 15 },
                crisis: { keywords: ['emergency', 'crisis', 'suicidal'], score_weight: 30 },
                unqualified: { keywords: ['not interested', 'no thank', 'wrong number'], score_weight: -25 }
            },
            departments: {
                intake: { name: 'Admissions', keywords: ['admission', 'intake', 'program'] },
                insurance: { name: 'Insurance', keywords: ['insurance', 'coverage', 'benefits'] },
                crisis: { name: 'Crisis Line', keywords: ['emergency', 'crisis', 'suicidal'] }
            },
            qualification_thresholds: { hot: 60, warm: 30, cold: 0 }
        };
    },
    
    updateFromNotes(notes) {
        this.detectedKeywords = [];
        let totalScore = 0;
        const criteria = this.knowledgeBase?.qualification_criteria || {};
        
        for (const note of notes) {
            for (const keyword of note.keywords) {
                if (!this.detectedKeywords.includes(keyword)) {
                    this.detectedKeywords.push(keyword);
                }
            }
        }
        
        for (const [category, data] of Object.entries(criteria)) {
            for (const keyword of this.detectedKeywords) {
                if (data.keywords.includes(keyword)) {
                    totalScore += data.score_weight;
                }
            }
        }
        
        this.currentScore = Math.max(0, Math.min(100, totalScore));
        this.render();
        
        if (chrome.runtime?.id) {
            chrome.runtime.sendMessage({
                action: 'QUALIFICATION_UPDATE',
                data: {
                    score: this.currentScore,
                    keywords: this.detectedKeywords,
                    client: document.getElementById('clientSelect')?.value || 'flyland'
                }
            });
        }
    },
    
    setListeningState(listening) {
        this.isListening = listening;
        const status = document.getElementById('qualStatus');
        if (status) {
            status.className = 'qualification-status ' + (listening ? 'listening' : '');
            status.querySelector('span').textContent = listening ? 'Listening to call...' : 'Waiting for call...';
        }
    },
    
    analyzeCall(transcription) {
        if (!transcription) {
            this.setListeningState(false);
            return;
        }
        
        this.setListeningState(true);
        const status = document.getElementById('qualStatus');
        if (status) {
            status.className = 'qualification-status analyzing';
            status.querySelector('span').textContent = 'Analyzing call...';
        }
        
        if (typeof NotesManager !== 'undefined') {
            NotesManager.addNote(transcription.substring(0, 500), 'auto');
        }
        
        setTimeout(() => {
            this.setListeningState(false);
            this.render();
        }, 2000);
    },
    
    render() {
        const result = document.getElementById('qualResult');
        const badge = document.getElementById('qualBadge');
        const score = document.getElementById('qualScore');
        const reason = document.getElementById('qualReason');
        const deptName = document.getElementById('deptName');
        const keywordsList = document.getElementById('keywordsList');
        
        if (!result) return;
        
        if (keywordsList) {
            keywordsList.innerHTML = this.detectedKeywords.length > 0 
                ? this.detectedKeywords.map(k => `<span class="keyword-tag">${k}</span>`).join('')
                : '<span class="keyword-tag">None</span>';
        }
        
        const thresholds = this.knowledgeBase?.qualification_thresholds || { hot: 60, warm: 30 };
        let badgeText = 'New Lead';
        let badgeClass = 'cold';
        
        if (this.currentScore >= thresholds.hot) {
            badgeText = 'Hot Lead';
            badgeClass = 'hot';
        } else if (this.currentScore >= thresholds.warm) {
            badgeText = 'Warm Lead';
            badgeClass = 'warm';
        } else if (this.currentScore <= -20) {
            badgeText = 'Unqualified';
            badgeClass = 'unqualified';
        }
        
        if (badge) {
            badge.textContent = badgeText;
            badge.className = 'qual-badge ' + badgeClass;
        }
        
        if (score) {
            score.textContent = 'Score: ' + this.currentScore + '%';
        }
        
        const reasons = [];
        if (this.detectedKeywords.includes('crisis')) reasons.push('Crisis detected');
        if (this.detectedKeywords.includes('interested')) reasons.push('High interest');
        if (this.detectedKeywords.includes('schedule')) reasons.push('Wants to schedule');
        if (this.detectedKeywords.includes('insurance')) reasons.push('Insurance inquiry');
        if (this.detectedKeywords.includes('unqualified')) reasons.push('Not interested');
        
        if (reason) {
            reason.textContent = reasons.length > 0 ? reasons.join(', ') : 'Analyzing...';
        }
        
        const departments = this.knowledgeBase?.departments || {};
        let recommendedDept = '-';
        
        for (const [key, dept] of Object.entries(departments)) {
            for (const keyword of this.detectedKeywords) {
                if (dept.keywords.includes(keyword)) {
                    recommendedDept = dept.name;
                    break;
                }
            }
        }
        
        if (deptName) {
            deptName.textContent = recommendedDept;
        }
        
        result.style.display = 'block';
    }
};

window.QualificationManager = QualificationManager;
