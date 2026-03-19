/**
 * AGS Popup - Call Analysis with Clean UI
 */

const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';

let stats = { calls: 0, analyzed: 0, hot: 0 };
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
            text.textContent = 'Connected to server';
        } else {
            dot.className = 'status-dot error';
            text.textContent = 'Server error';
        }
    } catch (e) {
        dot.className = 'status-dot error';
        text.textContent = 'Server offline';
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
        <div class="call-card">
            <div class="waiting-state">
                <div class="waiting-icon">📞</div>
                <div class="waiting-text">Monitoring for calls...</div>
            </div>
        </div>
    `;
}

function showActiveCall(call) {
    const time = call.timestamp ? new Date(call.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
    document.getElementById('callContent').innerHTML = `
        <div class="call-card">
            <div class="call-header">
                <span class="call-badge active">● Active Call</span>
                <span class="call-meta">${time}</span>
            </div>
            <div class="call-phone">${formatPhone(call.phone)}</div>
            <div class="call-meta">${capitalize(call.direction)}</div>
        </div>
    `;
}

function showEndedCall(call) {
    document.getElementById('callContent').innerHTML = `
        <div class="call-card">
            <div class="call-header">
                <span class="call-badge ended">✓ Call Ended</span>
            </div>
            <div class="call-phone">${formatPhone(call.phone)}</div>
            <div class="call-meta">Duration: ${call.duration || 0}s</div>
        </div>
    `;
}

async function analyzeCall(call) {
    // Show analyzing state
    document.getElementById('callContent').innerHTML = `
        <div class="call-card">
            <div class="call-header">
                <span class="call-badge analyzing">⚡ Analyzing...</span>
            </div>
            <div class="call-phone">${formatPhone(call.phone)}</div>
            <div class="call-meta">Fetching transcript & running AI analysis</div>
        </div>
    `;
    
    try {
        // Get transcript
        const transResp = await fetch(`${SERVER_URL}/api/ctm/calls/${call.call_id}/transcript`);
        if (!transResp.ok) throw new Error('No transcript available');
        
        const transData = await transResp.json();
        if (!transData.available || !transData.transcript) {
            showEndedCall(call);
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
    let scoreLabel = 'Cold Lead';
    if (score >= 70) { scoreClass = 'hot'; scoreLabel = 'Hot Lead'; }
    else if (score >= 40) { scoreClass = 'warm'; scoreLabel = 'Warm Lead'; }
    
    const tagsHtml = tags.length > 0 
        ? `<div class="tags">${tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` 
        : '';
    
    document.getElementById('callContent').innerHTML = `
        <div class="call-card">
            <div class="call-header">
                <span class="call-badge ended">✓ Analyzed</span>
            </div>
            <div class="call-phone">${formatPhone(call.phone)}</div>
            <div class="call-meta">${call.duration || 0}s · ${sentiment}</div>
            
            <div class="analysis-card">
                <div class="analysis-header">
                    <div class="score-badge">
                        <div class="score-circle ${scoreClass}">${score}</div>
                        <div class="score-info">
                            <div class="score-label">${scoreLabel}</div>
                            <div class="score-sublabel">${capitalize(sentiment)} sentiment</div>
                        </div>
                    </div>
                </div>
                <div class="divider"></div>
                <div class="summary">${summary}</div>
                ${tagsHtml}
            </div>
        </div>
    `;
}

function bindEvents() {
    document.getElementById('clientSelect')?.addEventListener('change', async (e) => {
        await setStorage({ client: e.target.value });
    });
    
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('refreshBtn');
        btn.textContent = '⏳...';
        await checkServer();
        await checkForCalls();
        btn.textContent = '↻ Refresh';
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

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}
