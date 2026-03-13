/**
 * AGS Popup - Main extension popup
 */

// ====== ATS FALLBACK - EXTEND, NOT REPLACE ======
(function() {
    'use strict';
    
    // Extend ATS if it exists, otherwise create minimal fallback
    if (!window.ATS) {
        window.ATS = {
            config: { 
                debug: true, 
                apiUrl: 'http://localhost:8000', 
                storageKey: 'ats_config' 
            },
            
            init: async function() {
                console.log('[AGS] Initializing...');
                try {
                    const stored = await new Promise(resolve => {
                        chrome.storage.local.get(this.config.storageKey, resolve);
                    });
                    if (stored[this.config.storageKey]) {
                        Object.assign(this.config, stored[this.config.storageKey]);
                    }
                } catch(e) {
                    console.error('[AGS] Init error:', e);
                }
                return this;
            },
            
            getConfig: async function() {
                return new Promise(resolve => {
                    chrome.storage.local.get(this.config.storageKey, result => {
                        resolve(result[this.config.storageKey] || {});
                    });
                });
            },
            
            saveConfig: async function(config) {
                return new Promise(resolve => {
                    chrome.storage.local.set({ [this.config.storageKey]: config }, () => {
                        resolve(true);
                    });
                });
            },
            
            log: function(msg, data) {
                if (this.config.debug) {
                    console.log('[AGS]', msg, data || '');
                }
            },
            
            error: function(msg, data) {
                console.error('[AGS ERROR]', msg, data || '');
            }
        };
        
        // Add storage utility if not present
        window.ATS.storage = {
            async get(keys) {
                return new Promise(resolve => {
                    chrome.storage.local.get(keys, resolve);
                });
            },
            async set(items) {
                return new Promise(resolve => {
                    chrome.storage.local.set(items, resolve);
                });
            }
        };
        
        console.log('[AGS] ATS fallback created');
    } else {
        console.log('[AGS] ATS core loaded');
    }
})();
// =========================================

// Helper functions
async function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['ats_config', 'ats_stats'], (result) => {
            const config = result.ats_config || {};
            const stats = result.ats_stats || { calls: 0, searches: 0, analysis: 0 };
            
            const els = ['callsCount', 'searchesCount', 'analysisCount'];
            const vals = [stats.calls || 0, stats.searches || 0, stats.analysis || 0];
            els.forEach((id, i) => {
                const el = document.getElementById(id);
                if (el) el.textContent = vals[i];
            });
            
            resolve(config);
        });
    });
}

async function saveSettings(updates) {
    return new Promise((resolve) => {
        chrome.storage.local.get('ats_config', (result) => {
            const config = result.ats_config || {};
            Object.assign(config, updates);
            chrome.storage.local.set({ ats_config: config }, resolve);
        });
    });
}

function showStatus(message, success) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    if (!statusDot || !statusText) return;
    
    const originalText = statusText.textContent;
    const originalClass = statusText.className;
    
    statusText.textContent = message;
    
    if (success === true) {
        statusText.classList.add('active');
        statusDot.classList.remove('inactive');
    } else if (success === false) {
        statusText.classList.remove('active');
    }
    
    setTimeout(() => {
        statusText.textContent = originalText;
        statusText.className = originalClass;
    }, 3000);
}

function getClientName(clientId) {
    const names = {
        'flyland': 'Flyland Recovery',
        'legacy': 'Legacy Services',
        'tbt': 'TBT Communications',
        'banyan': 'Banyan Health',
        'takami': 'Takahami Medical',
        'element': 'Element Medical'
    };
    return names[clientId] || clientId;
}

// ====== NOTES & QUALIFICATION SYSTEM ======
const NotesManager = {
    notes: [],
    maxNotes: 50,
    
    async load(clientId) {
        const key = 'ats_notes_' + clientId;
        return new Promise(resolve => {
            chrome.storage.local.get(key, result => {
                this.notes = result[key] || [];
                this.render();
                resolve(this.notes);
            });
        });
    },
    
    async addNote(text, type = 'manual') {
        if (!text.trim()) return;
        
        const note = {
            id: Date.now(),
            text: text.trim(),
            type: type,
            timestamp: new Date().toISOString(),
            keywords: []
        };
        
        // Detect keywords
        note.keywords = this.detectKeywords(text);
        if (note.keywords.length > 0) {
            note.type = 'keyword';
        }
        
        this.notes.unshift(note);
        if (this.notes.length > this.maxNotes) {
            this.notes = this.notes.slice(0, this.maxNotes);
        }
        
        await this.save();
        this.render();
        
        // Trigger qualification update
        QualificationManager.updateFromNotes(this.notes);
        
        return note;
    },
    
    detectKeywords(text) {
        const keywords = [];
        const textLower = text.toLowerCase();
        
        const keywordPatterns = {
            'interested': ['interested', 'want', 'need', 'looking for'],
            'pricing': ['pricing', 'cost', 'price', 'how much', 'expensive'],
            'insurance': ['insurance', 'coverage', 'benefits', 'aetna', 'cigna', 'blue cross'],
            'schedule': ['appointment', 'schedule', 'book', 'meeting', 'when'],
            'family': ['family', 'son', 'daughter', 'husband', 'wife', 'parent'],
            'crisis': ['crisis', 'emergency', 'suicidal', 'danger', 'overdose'],
            'unqualified': ['not interested', 'no thank', 'wrong number']
        };
        
        for (const [category, words] of Object.entries(keywordPatterns)) {
            for (const word of words) {
                if (textLower.includes(word)) {
                    keywords.push(category);
                    break;
                }
            }
        }
        
        return [...new Set(keywords)];
    },
    
    async save() {
        const key = 'ats_notes_' + (document.getElementById('clientSelect')?.value || 'flyland');
        await new Promise(resolve => {
            chrome.storage.local.set({ [key]: this.notes }, resolve);
        });
    },
    
    render() {
        const container = document.getElementById('notesContainer');
        const empty = document.getElementById('notesEmpty');
        const count = document.getElementById('noteCount');
        
        if (!container) return;
        
        count.textContent = this.notes.length;
        
        if (this.notes.length === 0) {
            if (empty) empty.style.display = 'block';
            container.innerHTML = '';
            container.appendChild(empty);
            return;
        }
        
        if (empty) empty.style.display = 'none';
        
        container.innerHTML = this.notes.map((note, index) => `
            <div class="note-item" data-index="${index}">
                <div class="note-content">
                    <span class="note-type ${note.type}">${note.type}</span>
                    <span class="note-text" id="note-text-${index}">${this.escapeHtml(note.text)}</span>
                </div>
                <div class="note-actions">
                    <button class="note-action-btn edit" data-action="edit" data-index="${index}" title="Edit">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button class="note-action-btn delete" data-action="delete" data-index="${index}" title="Delete">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
                <span class="note-time">${this.formatTime(note.timestamp)}</span>
            </div>
        `).join('');
    },
    
    editNote(index) {
        const textEl = document.getElementById(`note-text-${index}`);
        const note = this.notes[index];
        
        if (!textEl || !note) return;
        
        if (textEl.dataset.editing === 'true') {
            return;
        }
        
        textEl.dataset.originalText = textEl.textContent;
        textEl.dataset.editing = 'true';
        textEl.contentEditable = true;
        textEl.classList.add('editing');
        textEl.focus();
        
        const noteItem = textEl.closest('.note-item');
        const actions = noteItem.querySelector('.note-actions');
        
        actions.innerHTML = `
            <button class="note-action-btn save" data-action="save" data-index="${index}" title="Save">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </button>
            <button class="note-action-btn cancel" data-action="cancel" data-index="${index}" title="Cancel">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        `;
        
        textEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.saveEdit(index);
            } else if (e.key === 'Escape') {
                this.cancelEdit(index);
            }
        });
    },
    
    async saveEdit(index) {
        const textEl = document.getElementById(`note-text-${index}`);
        if (!textEl || !this.notes[index]) return;
        
        const newText = textEl.textContent.trim();
        if (newText && newText !== textEl.dataset.originalText) {
            this.notes[index].text = newText;
            this.notes[index].editedAt = Date.now();
            await this.save();
        }
        
        this.render();
        
        if (typeof QualificationManager !== 'undefined') {
            QualificationManager.updateFromNotes(this.notes);
        }
    },
    
    cancelEdit(index) {
        this.render();
    },
    
    async deleteNote(index) {
        if (confirm('Are you sure you want to delete this note?')) {
            this.notes.splice(index, 1);
            await this.save();
            this.render();
            
            if (typeof QualificationManager !== 'undefined') {
                QualificationManager.updateFromNotes(this.notes);
            }
        }
    },
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    async clear() {
        this.notes = [];
        await this.save();
        this.render();
    }
};

const QualificationManager = {
    knowledgeBase: null,
    currentScore: 0,
    detectedKeywords: [],
    isListening: false,
    
    async loadKnowledgeBase(clientId) {
        // Try to load new Flyland KB first (path is relative to extension root)
        try {
            const newKbUrl = chrome.runtime.getURL(`clients/${clientId}/knowledge-base/flyland-kb.json`);
            const response = await fetch(newKbUrl);
            if (response.ok) {
                this.knowledgeBase = await response.json();
                console.log('[AGS] Knowledge base loaded for:', clientId);
                return this.knowledgeBase;
            }
        } catch(e) {
            console.log('[AGS] flyland-kb.json not found, trying qualification.json');
        }
        
        // Fallback to old qualification.json
        try {
            const response = await fetch(chrome.runtime.getURL(`clients/${clientId}/knowledge-base/qualification.json`));
            if (response.ok) {
                this.knowledgeBase = await response.json();
                console.log('[AGS] Knowledge base loaded for:', clientId);
            } else {
                console.log('[AGS] Using default knowledge base');
                this.knowledgeBase = this.getDefaultKB();
            }
        } catch(e) {
            console.log('[AGS] Using default knowledge base');
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
        
        // Calculate score
        for (const [category, data] of Object.entries(criteria)) {
            for (const keyword of this.detectedKeywords) {
                if (data.keywords.includes(keyword)) {
                    totalScore += data.score_weight;
                }
            }
        }
        
        this.currentScore = Math.max(0, Math.min(100, totalScore));
        this.render();
        
        // Send to background for department routing
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
        
        // Add transcription as note
        NotesManager.addNote(transcription.substring(0, 500), 'auto');
        
        // Trigger AI analysis
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
        
        // Keywords
        if (keywordsList) {
            keywordsList.innerHTML = this.detectedKeywords.length > 0 
                ? this.detectedKeywords.map(k => `<span class="keyword-tag">${k}</span>`).join('')
                : '<span class="keyword-tag">None</span>';
        }
        
        // Score and badge
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
        
        // Reason
        const reasons = [];
        if (this.detectedKeywords.includes('crisis')) reasons.push('Crisis detected');
        if (this.detectedKeywords.includes('interested')) reasons.push('High interest');
        if (this.detectedKeywords.includes('schedule')) reasons.push('Wants to schedule');
        if (this.detectedKeywords.includes('insurance')) reasons.push('Insurance inquiry');
        if (this.detectedKeywords.includes('unqualified')) reasons.push('Not interested');
        
        if (reason) {
            reason.textContent = reasons.length > 0 ? reasons.join(', ') : 'Analyzing...';
        }
        
        // Department routing
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

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[AGS] Popup loading...');
    
    // Initialize ATS first
    try {
        await window.ATS.init();
        console.log('[AGS] ATS initialized');
    } catch(e) {
        console.error('[AGS] ATS init failed:', e);
    }
    
    // Get elements
    const clientSelect = document.getElementById('clientSelect');
    const callMonitorToggle = document.getElementById('callMonitorToggle');
    const sfSyncToggle = document.getElementById('sfSyncToggle');
    const aiToggle = document.getElementById('aiToggle');
    const testBtn = document.getElementById('testBtn');
    const configBtn = document.getElementById('configBtn');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const serverStatus = document.getElementById('serverStatus');

    // Load settings
    const config = await loadSettings();
    
    if (config.activeClient) clientSelect.value = config.activeClient;
    if (config.callMonitorEnabled !== undefined) callMonitorToggle.checked = config.callMonitorEnabled;
    if (config.sfSyncEnabled !== undefined) sfSyncToggle.checked = config.sfSyncEnabled;
    if (config.aiEnabled !== undefined) aiToggle.checked = config.aiEnabled;

    // Check server
    checkServerConnection();
    
    // Initialize service statuses
    updateServiceStatus('storage', true);
    updateServiceStatus('background', true);
    updateServiceStatus('ctm', true);

    // Initialize Notes and Qualification
    const currentClient = clientSelect?.value || 'flyland';
    await NotesManager.load(currentClient);
    await QualificationManager.loadKnowledgeBase(currentClient);
    
    // Event delegation for note actions (avoids CSP issues with inline handlers)
    const notesContainer = document.getElementById('notesContainer');
    if (notesContainer) {
        notesContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            
            const action = btn.dataset.action;
            const index = parseInt(btn.dataset.index, 10);
            
            if (action === 'edit') {
                NotesManager.editNote(index);
            } else if (action === 'delete') {
                NotesManager.deleteNote(index);
            } else if (action === 'save') {
                NotesManager.saveEdit(index);
            } else if (action === 'cancel') {
                NotesManager.cancelEdit(index);
            }
        });
    }

    // Add note event
    const noteInput = document.getElementById('noteInput');
    const addNoteBtn = document.getElementById('addNoteBtn');
    
    if (addNoteBtn && noteInput) {
        addNoteBtn.addEventListener('click', async () => {
            const text = noteInput.value;
            if (text.trim()) {
                await NotesManager.addNote(text, 'manual');
                noteInput.value = '';
            }
        });
        
        noteInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = noteInput.value;
                if (text.trim()) {
                    await NotesManager.addNote(text, 'manual');
                    noteInput.value = '';
                }
            }
        });
    }

    // Listen for messages from background
    if (chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'CALL_TRANSCRIPTION') {
                QualificationManager.analyzeCall(message.transcription);
            } else if (message.action === 'KEYWORD_DETECTED') {
                NotesManager.addNote('Keyword detected: ' + message.keyword, 'keyword');
            }
        });
    }

    // Event listeners
    clientSelect.addEventListener('change', async (e) => {
        await saveSettings({ activeClient: e.target.value });
        showStatus('Switched to ' + getClientName(e.target.value), true);
        chrome.runtime.sendMessage({ action: 'CLIENT_CHANGED', client: e.target.value });
        
        // Reload knowledge base and notes for new client
        await NotesManager.load(e.target.value);
        await QualificationManager.loadKnowledgeBase(e.target.value);
    });

    callMonitorToggle.addEventListener('change', async (e) => {
        await saveSettings({ callMonitorEnabled: e.target.checked });
        showStatus(e.target.checked ? 'Call monitoring enabled' : 'Call monitoring disabled', e.target.checked);
    });

    sfSyncToggle.addEventListener('change', async (e) => {
        await saveSettings({ sfSyncEnabled: e.target.checked });
        showStatus(e.target.checked ? 'Salesforce sync enabled' : 'Salesforce sync disabled', e.target.checked);
    });

    aiToggle.addEventListener('change', async (e) => {
        await saveSettings({ aiEnabled: e.target.checked });
        showStatus(e.target.checked ? 'AI analysis enabled' : 'AI analysis disabled', e.target.checked);
    });

    testBtn.addEventListener('click', async () => {
        updateAllServiceStatus('checking');
        
        const results = {
            storage: false,
            aiServer: false,
            background: false,
            ctmMonitor: true
        };
        
        try {
            const storageResult = await testStorage();
            results.storage = storageResult;
            updateServiceStatus('storage', storageResult);
        } catch(e) { 
            results.storage = false;
            updateServiceStatus('storage', false);
        }
        
        try {
            const aiResult = await testAIServer();
            results.aiServer = aiResult;
            updateServiceStatus('aiServer', aiResult);
        } catch(e) { 
            results.aiServer = false;
            updateServiceStatus('aiServer', false);
        }
        
        try {
            const bgResult = await testBackground();
            results.background = bgResult;
            updateServiceStatus('background', bgResult);
        } catch(e) { 
            results.background = false;
            updateServiceStatus('background', false);
        }
        
        try {
            const configResult = await testConfig();
            results.config = configResult;
        } catch(e) { results.config = false; }
        
        updateServiceStatus('ctm', results.ctmMonitor);
        
        const allPassed = results.storage && results.aiServer && results.background;
        
        if (allPassed) {
            showStatus('All services online!', true);
            updateMainStatus(true);
        } else {
            const failed = Object.entries(results).filter(([k,v]) => !v).map(([k]) => k).join(', ');
            showStatus('Issues: ' + failed, false);
            updateMainStatus(false);
        }
        
        updateStats();
    });
    
    function updateServiceStatus(service, isOnline) {
        const statusEl = document.getElementById(service + 'Status');
        if (!statusEl) return;
        
        const indicator = statusEl.querySelector('.status-indicator');
        statusEl.classList.remove('online', 'offline', 'checking');
        indicator.classList.remove('online', 'offline', 'checking');
        
        if (isOnline) {
            statusEl.classList.add('online');
            indicator.classList.add('online');
        } else {
            statusEl.classList.add('offline');
            indicator.classList.add('offline');
        }
    }
    
    function updateAllServiceStatus(status) {
        const services = ['storage', 'aiServer', 'background', 'ctm'];
        services.forEach(service => {
            const statusEl = document.getElementById(service + 'Status');
            if (!statusEl) return;
            
            const indicator = statusEl.querySelector('.status-indicator');
            statusEl.classList.remove('online', 'offline', 'checking');
            indicator.classList.remove('online', 'offline', 'checking');
            statusEl.classList.add(status);
            indicator.classList.add(status);
        });
    }
    
    function updateMainStatus(isOnline) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        if (!statusDot || !statusText) return;
        
        if (isOnline) {
            statusDot.classList.remove('inactive');
            statusText.classList.add('active');
            statusText.textContent = 'Ready';
        } else {
            statusDot.classList.add('inactive');
            statusText.classList.remove('active');
            statusText.textContent = 'Issues Detected';
        }
    }
    
    // Helper function to get configured AI server URL
    async function getAIServerUrl() {
        const result = await new Promise(resolve => {
            chrome.storage.local.get('aiServerUrl', resolve);
        });
        return result.aiServerUrl || 'http://localhost:8000';
    }
    
    async function testStorage() {
        return new Promise((resolve) => {
            chrome.storage.local.set({ '__test_key': 'test_value' }, () => {
                chrome.storage.local.get('__test_key', (result) => {
                    chrome.storage.local.remove('__test_key', () => {
                        resolve(result['__test_key'] === 'test_value');
                    });
                });
            });
        });
    }
    
    async function testAIServer() {
        try {
            const serverUrl = await getAIServerUrl();
            const response = await fetch(`${serverUrl}/health`, { 
                method: 'GET', 
                signal: AbortSignal.timeout(5000) 
            });
            return response.ok;
        } catch(e) {
            return false;
        }
    }
    
    async function testBackground() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'PING' }, (response) => {
                resolve(response && response.pong === true);
            });
        });
    }
    
    async function testConfig() {
        return new Promise((resolve) => {
            chrome.storage.local.get('ats_config', (result) => {
                resolve(true);
            });
        });
    }

    configBtn.addEventListener('click', () => {
        window.open(chrome.runtime.getURL('config/config.html'), '_blank');
    });

    async function checkServerConnection() {
        try {
            const serverUrl = await getAIServerUrl();
            const response = await fetch(`${serverUrl}/health`, { 
                method: 'GET', 
                signal: AbortSignal.timeout(3000) 
            });
            if (response.ok) {
                updateMainStatus(true);
                updateServiceStatus('aiServer', true);
                serverStatus.textContent = serverUrl.replace('http://', '').replace('https://', '');
            } else {
                updateMainStatus(false);
                updateServiceStatus('aiServer', false);
                serverStatus.textContent = 'Connection failed';
            }
        } catch (error) {
            updateMainStatus(false);
            updateServiceStatus('aiServer', false);
            serverStatus.textContent = 'Not connected';
        }
    }

    function updateStats() {
        chrome.storage.local.get('ats_stats', (result) => {
            const stats = result.ats_stats || { calls: 0, searches: 0, analysis: 0 };
            document.getElementById('callsCount').textContent = stats.calls || 0;
            document.getElementById('searchesCount').textContent = stats.searches || 0;
            document.getElementById('analysisCount').textContent = stats.analysis || 0;
        });
    }
    
    console.log('[AGS] Popup ready');
});
