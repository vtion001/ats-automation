/**
 * AGS Popup - Clean UX Flow
 * Monitors CTM API and shows call analysis when calls end
 */

const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';

// State
let currentCall = null;
let callAnalysis = null;
let stats = { calls: 0, analyzed: 0, hot: 0 };

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Popup] Initializing...');
    
    // Initialize storage
    await StorageService.init();
    
    // Initialize UI components
    initToast();
    initCollapsibleSections();
    loadSettings();
    initNotes();
    
    // Check services
    await checkServices();
    setInterval(checkServices, 30000);
    
    // Start monitoring CTM API for calls
    startCallMonitoring();
    
    // Bind events
    bindEvents();
    
    console.log('[Popup] Ready');
});

// ============ Toast Notifications ============

let toastContainer;

function initToast() {
    toastContainer = document.getElementById('toastContainer');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-message">${message}</span>`;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============ Settings ============

async function loadSettings() {
    const config = await StorageService.getConfig();
    
    const clientSelect = document.getElementById('clientSelect');
    if (config.client && clientSelect) {
        clientSelect.value = config.client;
    }
    
    // Load stats
    const savedStats = await StorageService.get(['stats_calls', 'stats_analyzed', 'stats_hot']);
    if (savedStats) {
        stats = {
            calls: savedStats.stats_calls || 0,
            analyzed: savedStats.stats_analyzed || 0,
            hot: savedStats.stats_hot || 0
        };
        updateStatsDisplay();
    }
}

async function saveSettings() {
    const client = document.getElementById('clientSelect')?.value;
    await StorageService.setConfig({ client });
}

// ============ Notes ============

let notes = [];

async function initNotes() {
    const saved = await StorageService.get('notes');
    notes = saved?.notes || [];
    renderNotes();
    
    document.getElementById('addNoteBtn')?.addEventListener('click', addNote);
    document.getElementById('noteInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addNote();
        }
    });
}

function renderNotes() {
    const container = document.getElementById('notesContainer');
    const empty = document.getElementById('notesEmpty');
    const count = document.getElementById('noteCount');
    
    if (!container) return;
    
    if (notes.length === 0) {
        empty.style.display = 'block';
        count.textContent = '0';
        return;
    }
    
    empty.style.display = 'none';
    count.textContent = notes.length;
    
    const notesHtml = notes.slice().reverse().map((note, i) => `
        <div class="note-item">
            <span class="note-text">${escapeHtml(note.text)}</span>
            <span class="note-time">${formatTime(note.time)}</span>
        </div>
    `).join('');
    
    container.innerHTML = notesHtml + '<div class="notes-empty" id="notesEmpty" style="display:none;">No notes</div>';
}

async function addNote() {
    const input = document.getElementById('noteInput');
    if (!input || !input.value.trim()) return;
    
    notes.push({ text: input.value.trim(), time: Date.now() });
    await StorageService.set({ notes });
    input.value = '';
    renderNotes();
}

// ============ Call Monitoring ============

let callMonitorInterval = null;
let processedCallIds = new Set();

function startCallMonitoring() {
    if (callMonitorInterval) clearInterval(callMonitorInterval);
    
    checkForCalls();
    callMonitorInterval = setInterval(checkForCalls, 10000); // Poll every 10s
    
    console.log('[Popup] Call monitoring started');
}

async function checkForCalls() {
    try {
        const response = await fetch(`${SERVER_URL}/api/ctm/calls?limit=5`);
        if (!response.ok) return;
        
        const calls = await response.json();
        updateCallState(calls);
        
    } catch (e) {
        console.error('[Popup] Call check error:', e);
    }
}

function updateCallState(calls) {
    const callState = document.getElementById('callState');
    const analysisPreview = document.getElementById('callAnalysisPreview');
    
    // Find most recent call
    const recentCall = calls[0];
    
    if (!recentCall) {
        callState.innerHTML = `
            <div class="waiting-state">
                <div class="waiting-icon">📞</div>
                <div>No recent calls</div>
            </div>
        `;
        analysisPreview.style.display = 'none';
        return;
    }
    
    const isActive = recentCall.status === 'in progress';
    const callId = recentCall.call_id;
    
    if (isActive) {
        // Show active call
        callState.innerHTML = `
            <div class="call-activity">
                <div class="call-activity-header">
                    <span class="call-badge active">Active Call</span>
                </div>
                <div class="call-info">
                    <div class="call-info-row">
                        <span class="call-info-label">From:</span>
                        <span class="call-info-value">${formatPhone(recentCall.phone)}</span>
                    </div>
                    <div class="call-info-row">
                        <span class="call-info-label">Direction:</span>
                        <span class="call-info-value">${recentCall.direction}</span>
                    </div>
                    <div class="call-info-row">
                        <span class="call-info-label">Status:</span>
                        <span class="call-info-value">${recentCall.status}</span>
                    </div>
                </div>
            </div>
        `;
        analysisPreview.style.display = 'none';
        
    } else {
        // Call ended - show analysis if available
        const alreadyAnalyzed = processedCallIds.has(callId);
        
        if (alreadyAnalyzed && callAnalysis) {
            showAnalysis(callAnalysis, recentCall);
        } else {
            // Call ended, fetch and analyze
            callState.innerHTML = `
                <div class="call-activity">
                    <div class="call-activity-header">
                        <span class="call-badge ended">Call Ended</span>
                    </div>
                    <div class="call-info">
                        <div class="call-info-row">
                            <span class="call-info-label">From:</span>
                            <span class="call-info-value">${formatPhone(recentCall.phone)}</span>
                        </div>
                        <div class="call-info-row">
                            <span class="call-info-label">Duration:</span>
                            <span class="call-info-value">${recentCall.duration || 0}s</span>
                        </div>
                    </div>
                </div>
            `;
            
            // Start analysis
            if (!alreadyAnalyzed) {
                processedCallIds.add(callId);
                analyzeCall(callId, recentCall);
            }
        }
    }
}

async function analyzeCall(callId, call) {
    try {
        // Fetch transcript
        const transcriptResp = await fetch(`${SERVER_URL}/api/ctm/calls/${callId}/transcript`);
        const transcriptData = await transcriptResp.json();
        
        if (!transcriptData.available || !transcriptData.transcript) {
            showToast('No transcript available for this call', 'warning');
            return;
        }
        
        // Run analysis
        const analyzeResp = await fetch(`${SERVER_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcription: transcriptData.transcript,
                phone: call.phone,
                client: getSelectedClient()
            })
        });
        
        const analysis = await analyzeResp.json();
        
        // Store and display
        callAnalysis = analysis;
        stats.analyzed++;
        if (analysis.qualification_score >= 70) stats.hot++;
        stats.calls++;
        saveStats();
        updateStatsDisplay();
        
        showAnalysis(analysis, call);
        
    } catch (e) {
        console.error('[Popup] Analysis error:', e);
        showToast('Analysis failed: ' + e.message, 'error');
    }
}

function showAnalysis(analysis, call) {
    const callState = document.getElementById('callState');
    const analysisPreview = document.getElementById('callAnalysisPreview');
    
    callState.innerHTML = `
        <div class="call-activity">
            <div class="call-activity-header">
                <span class="call-badge ended">Call Ended</span>
            </div>
            <div class="call-info">
                <div class="call-info-row">
                    <span class="call-info-label">From:</span>
                    <span class="call-info-value">${formatPhone(call.phone)}</span>
                </div>
                <div class="call-info-row">
                    <span class="call-info-label">Duration:</span>
                    <span class="call-info-value">${call.duration || 0}s</span>
                </div>
            </div>
        </div>
    `;
    
    const score = analysis.qualification_score || 0;
    const scoreCircle = document.getElementById('scoreCircle');
    const scoreLabel = document.getElementById('scoreLabel');
    const summary = document.getElementById('analysisSummary');
    const tags = document.getElementById('analysisTags');
    
    // Score styling
    let scoreClass = 'cold';
    let label = 'Cold Lead';
    if (score >= 70) { scoreClass = 'hot'; label = 'Hot Lead'; }
    else if (score >= 40) { scoreClass = 'warm'; label = 'Warm Lead'; }
    
    scoreCircle.textContent = score;
    scoreCircle.className = `score-circle ${scoreClass}`;
    scoreLabel.textContent = label;
    summary.textContent = analysis.summary || 'No summary available';
    
    // Tags
    const tagList = analysis.tags || [];
    tags.innerHTML = tagList.map(t => `<span class="tag">${t}</span>`).join('');
    
    analysisPreview.style.display = 'block';
}

// ============ Services ============

async function checkServices() {
    await Promise.all([
        checkStorage(),
        checkAIServer(),
        checkCTMAPI()
    ]);
}

async function checkStorage() {
    const status = document.getElementById('storageStatus');
    try {
        await StorageService.init();
        updateServiceStatus(status, true, 'Ready');
    } catch (e) {
        updateServiceStatus(status, false, 'Error');
    }
}

async function checkAIServer() {
    const status = document.getElementById('aiServerStatus');
    try {
        const response = await fetch(`${SERVER_URL}/health`);
        if (response.ok) {
            const data = await response.json();
            updateServiceStatus(status, true, data.version || 'Online');
        } else {
            updateServiceStatus(status, false, 'Error ' + response.status);
        }
    } catch (e) {
        updateServiceStatus(status, false, 'Offline');
    }
}

async function checkCTMAPI() {
    const status = document.getElementById('ctmStatus');
    try {
        const response = await fetch(`${SERVER_URL}/api/ctm/health`);
        if (response.ok) {
            const data = await response.json();
            updateServiceStatus(status, true, data.account_name || 'Connected');
        } else {
            updateServiceStatus(status, false, 'Error');
        }
    } catch (e) {
        updateServiceStatus(status, false, 'Offline');
    }
}

function updateServiceStatus(el, online, label = '') {
    if (!el) return;
    const indicator = el.querySelector('.status-indicator');
    const labelEl = el.querySelector('.service-label');
    
    if (indicator) {
        indicator.classList.remove('online', 'offline', 'checking');
        indicator.classList.add(online ? 'online' : 'offline');
    }
    if (labelEl) labelEl.textContent = label;
}

// ============ Stats ============

function updateStatsDisplay() {
    document.getElementById('callsCount').textContent = stats.calls;
    document.getElementById('analyzedCount').textContent = stats.analyzed;
    document.getElementById('hotCount').textContent = stats.hot;
}

async function saveStats() {
    await StorageService.set({
        stats_calls: stats.calls,
        stats_analyzed: stats.analyzed,
        stats_hot: stats.hot
    });
}

// ============ Collapsible Sections ============

async function initCollapsibleSections() {
    document.querySelectorAll('.section.collapsible .section-header').forEach(header => {
        header.addEventListener('click', function() {
            this.closest('.section').classList.toggle('collapsed');
        });
    });
}

// ============ Events ============

function bindEvents() {
    // Client select
    document.getElementById('clientSelect')?.addEventListener('change', saveSettings);
    
    // Config button
    document.getElementById('configBtn')?.addEventListener('click', () => {
        window.open(chrome.runtime.getURL('config/config.html'), '_blank');
    });
    
    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
        showToast('Refreshing...', 'info');
        await checkServices();
        await checkForCalls();
        showToast('Refreshed', 'success');
    });
    
    // Pin button
    const pinBtn = document.getElementById('pinBtn');
    pinBtn?.addEventListener('click', async function() {
        this.classList.toggle('pinned');
        const pinned = this.classList.contains('pinned');
        await StorageService.set({ popupFloatEnabled: pinned });
    });
}

// ============ Helpers ============

function getSelectedClient() {
    return document.getElementById('clientSelect')?.value || 'flyland';
}

function formatPhone(phone) {
    if (!phone) return 'Unknown';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits[0] === '1') {
        return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
    }
    return phone;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Storage Service (minimal implementation)
const StorageService = {
    data: {},
    
    async init() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['ats_config', 'ats_data'], (result) => {
                this.config = result.ats_config || {};
                this.data = result.ats_data || {};
                resolve();
            });
        });
    },
    
    async get(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, (result) => resolve(result));
        });
    },
    
    async set(items) {
        return new Promise((resolve) => {
            chrome.storage.local.set(items, resolve);
        });
    },
    
    async getConfig() {
        return this.config;
    },
    
    async setConfig(config) {
        this.config = { ...this.config, ...config };
        await this.set({ ats_config: this.config });
    }
};
