/**
 * AGS Popup - Simplified API-Based Call Monitor
 */

const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';

let stats = { calls: 0, analyzed: 0, hot: 0 };
let currentCall = null;
let processedCallIds = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Popup] Initializing...');
    
    await loadStats();
    await checkServer();
    startMonitoring();
    bindEvents();
    
    console.log('[Popup] Ready');
});

async function loadStats() {
    const saved = await getStorage(['stats_calls', 'stats_analyzed', 'stats_hot']);
    stats = {
        calls: saved.stats_calls || 0,
        analyzed: saved.stats_analyzed || 0,
        hot: saved.stats_hot || 0
    };
    updateStats();
}

async function saveStats() {
    await setStorage({
        stats_calls: stats.calls,
        stats_analyzed: stats.analyzed,
        stats_hot: stats.hot
    });
}

function updateStats() {
    document.getElementById('callsCount').textContent = stats.calls;
    document.getElementById('analyzedCount').textContent = stats.analyzed;
    document.getElementById('hotCount').textContent = stats.hot;
}

async function checkServer() {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    
    try {
        const resp = await fetch(`${SERVER_URL}/health`);
        if (resp.ok) {
            dot.className = 'status-dot ok';
            text.textContent = 'Connected';
        } else {
            dot.className = 'status-dot error';
            text.textContent = 'Server error';
        }
    } catch (e) {
        dot.className = 'status-dot error';
        text.textContent = 'Offline';
    }
}

function startMonitoring() {
    checkForCalls();
    setInterval(checkForCalls, 10000);
}

async function checkForCalls() {
    try {
        const resp = await fetch(`${SERVER_URL}/api/ctm/calls?limit=3`);
        if (!resp.ok) return;
        
        const calls = await resp.json();
        if (calls.length === 0) {
            showWaiting();
            return;
        }
        
        const call = calls[0];
        const isActive = call.status === 'in progress' || call.status === 'in-progress';
        
        if (isActive) {
            showActiveCall(call);
        } else {
            const alreadyDone = processedCallIds.has(call.call_id);
            if (alreadyDone) {
                showEndedCall(call);
            } else {
                showEndedCall(call);
                processedCallIds.add(call.call_id);
                await analyzeCall(call);
            }
        }
        
    } catch (e) {
        console.error('[Popup] Monitor error:', e);
    }
}

function showWaiting() {
    document.getElementById('callContent').innerHTML = `
        <div class="waiting-state">
            <div class="waiting-icon">📞</div>
            <div class="waiting-text">Monitoring for calls...</div>
        </div>
    `;
}

function showActiveCall(call) {
    document.getElementById('callContent').innerHTML = `
        <div class="call-card">
            <div class="call-header">
                <span class="call-badge active">● Active</span>
            </div>
            <div class="call-phone">${formatPhone(call.phone)}</div>
            <div class="call-meta">${call.direction} · ${call.timestamp || ''}</div>
        </div>
    `;
}

function showEndedCall(call) {
    document.getElementById('callContent').innerHTML = `
        <div class="call-card">
            <div class="call-header">
                <span class="call-badge ended">Call Ended</span>
            </div>
            <div class="call-phone">${formatPhone(call.phone)}</div>
            <div class="call-meta">Duration: ${call.duration || 0}s</div>
        </div>
    `;
}

async function analyzeCall(call) {
    // Update UI to show analyzing
    const content = document.getElementById('callContent');
    content.innerHTML = `
        <div class="call-card">
            <div class="call-header">
                <span class="call-badge analyzing">Analyzing...</span>
            </div>
            <div class="call-phone">${formatPhone(call.phone)}</div>
            <div class="call-meta">Fetching transcript...</div>
        </div>
    `;
    
    try {
        // Get transcript
        const transResp = await fetch(`${SERVER_URL}/api/ctm/calls/${call.call_id}/transcript`);
        if (!transResp.ok) throw new Error('No transcript');
        
        const transData = await transResp.json();
        if (!transData.available || !transData.transcript) {
            showWaiting();
            return;
        }
        
        // Run analysis
        const client = document.getElementById('clientSelect')?.value || 'flyland';
        const analyzeResp = await fetch(`${SERVER_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcription: transData.transcript,
                phone: call.phone,
                client: client
            })
        });
        
        if (!analyzeResp.ok) throw new Error('Analysis failed');
        
        const analysis = await analyzeResp.json();
        
        // Update stats
        stats.calls++;
        stats.analyzed++;
        if (analysis.qualification_score >= 70) stats.hot++;
        await saveStats();
        updateStats();
        
        // Show analysis
        showAnalysis(call, analysis);
        
    } catch (e) {
        console.error('[Popup] Analysis error:', e);
        showEndedCall(call);
    }
}

function showAnalysis(call, analysis) {
    const score = analysis.qualification_score || 0;
    const sentiment = analysis.sentiment || 'neutral';
    const summary = analysis.summary || 'No summary available';
    const tags = analysis.tags || [];
    
    let scoreClass = 'cold';
    let scoreLabel = 'Cold';
    if (score >= 70) { scoreClass = 'hot'; scoreLabel = 'Hot'; }
    else if (score >= 40) { scoreClass = 'warm'; scoreLabel = 'Warm'; }
    
    document.getElementById('callContent').innerHTML = `
        <div class="call-card">
            <div class="call-header">
                <span class="call-badge ended">Analyzed</span>
            </div>
            <div class="call-phone">${formatPhone(call.phone)}</div>
            <div class="call-meta">${call.duration || 0}s · ${sentiment}</div>
            
            <div class="analysis-section">
                <div class="analysis-header">
                    <div class="score-circle ${scoreClass}">${score}</div>
                    <div class="score-info">
                        <div class="score-label">${scoreLabel} Lead</div>
                        <div class="score-sublabel">${sentiment} sentiment</div>
                    </div>
                </div>
                <div class="summary">${summary}</div>
                <div class="tags">
                    ${tags.map(t => `<span class="tag">${t}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
}

function bindEvents() {
    document.getElementById('clientSelect')?.addEventListener('change', async (e) => {
        await setStorage({ client: e.target.value });
    });
    
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
        await checkServer();
        await checkForCalls();
    });
    
    document.getElementById('configBtn')?.addEventListener('click', () => {
        window.open(chrome.runtime.getURL('config/config.html'), '_blank');
    });
}

// Storage helpers
function getStorage(keys) {
    return new Promise(resolve => {
        chrome.storage.local.get(keys, resolve);
    });
}

function setStorage(items) {
    return new Promise(resolve => {
        chrome.storage.local.set(items, resolve);
    });
}

function formatPhone(phone) {
    if (!phone) return 'Unknown';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits[0] === '1') {
        return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
    }
    return phone;
}
