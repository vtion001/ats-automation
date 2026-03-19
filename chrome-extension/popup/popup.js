/**
 * AGS Popup - Dynamic Call Display
 * 
 * Monitors for calls and displays analysis results.
 * Receives data from:
 * 1. API polling (/api/ctm/calls)
 * 2. DOM monitor (via chrome.storage)
 */

const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
const STORAGE_KEY = 'ats_latest_analysis';
const POLL_INTERVAL = 5000;

let stats = { calls: 0, analyzed: 0, hot: 0 };
let lastAnalysis = null;

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
    // Poll for storage updates from DOM monitor
    checkStorageForAnalysis();
    setInterval(checkStorageForAnalysis, POLL_INTERVAL);
    
    // Also poll API for calls
    checkForCalls();
    setInterval(checkForCalls, 10000);
}

async function checkStorageForAnalysis() {
    try {
        const result = await getStorage(STORAGE_KEY);
        const analysis = result[STORAGE_KEY];
        
        if (analysis && analysis !== lastAnalysis) {
            lastAnalysis = analysis;
            console.log('[Popup] New analysis from DOM monitor:', analysis.type);
            
            if (analysis.type === 'analysis_complete') {
                await handleAnalysisComplete(analysis);
            } else if (analysis.type === 'call_detected') {
                showCallDetected(analysis.phone);
            }
        }
    } catch (e) {
        console.log('[Popup] Storage check skipped (may not be extension)');
    }
}

async function handleAnalysisComplete(data) {
    // Update stats
    stats.calls++;
    stats.analyzed++;
    if (data.analysis.score >= 70) stats.hot++;
    await saveStats();
    updateStats();
    
    // Show analysis
    showAnalysis(data);
}

function showCallDetected(phone) {
    document.getElementById('callContent').innerHTML = `
        <div class="call-card">
            <div class="call-header">
                <span class="call-badge active">📞 Call Detected</span>
            </div>
            <div class="call-phone">${formatPhone(phone)}</div>
            <div class="call-meta">Waiting for call to end...</div>
        </div>
    `;
}

async function checkForCalls() {
    try {
        const resp = await fetch(`${SERVER_URL}/api/ctm/calls?limit=3`);
        if (!resp.ok) return;
        
        const calls = await resp.json();
        
        // Skip if we already showing analysis from DOM monitor
        if (lastAnalysis && lastAnalysis.type === 'analysis_complete') {
            return;
        }
        
        if (calls.length === 0) {
            showWaiting();
            return;
        }
        
        const call = calls[0];
        const isActive = call.status === 'in progress' || call.status === 'in-progress';
        
        if (isActive) {
            showActiveCall(call);
        } else {
            showEndedCall(call);
            // Auto-analyze
            await analyzeCall(call);
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
                <div class="waiting-subtext">Waiting for CTM activity</div>
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
            <div class="call-meta">${capitalize(call.direction || 'incoming')}</div>
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
        showAnalysis({ phone: call.phone, call_id: call.call_id, analysis });
        
    } catch (e) {
        console.error('[Popup] Analysis error:', e);
        showEndedCall(call);
    }
}

function showAnalysis(data) {
    const score = data.analysis.score || 0;
    const sentiment = data.analysis.sentiment || 'neutral';
    const summary = data.analysis.summary || 'No summary available';
    const tags = data.analysis.tags || [];
    
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
                <span class="call-badge ${scoreClass}">${scoreClass.toUpperCase()}</span>
            </div>
            <div class="call-phone">${formatPhone(data.phone)}</div>
            <div class="call-meta">${sentiment} sentiment</div>
            
            <div class="analysis-card">
                <div class="analysis-header">
                    <div class="score-badge">
                        <div class="score-circle ${scoreClass}">${score}</div>
                        <div class="score-info">
                            <div class="score-label">${scoreLabel}</div>
                            <div class="score-sublabel">${capitalize(sentiment)}</div>
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
        lastAnalysis = null; // Clear cache to force refresh
        await checkServer();
        await checkStorageForAnalysis();
        await checkForCalls();
        btn.textContent = '↻ Refresh';
    });
    
    document.getElementById('configBtn')?.addEventListener('click', () => {
        window.open(chrome.runtime.getURL('config/config.html'), '_blank');
    });
}

// Storage helpers
function getStorage(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, resolve);
    });
}

function setStorage(items) {
    return new Promise((resolve) => {
        chrome.storage.local.set(items, resolve);
    });
}

function formatPhone(phone) {
    if (!phone) return 'Unknown';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits[0] === '1') {
        return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
        return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
    }
    return phone;
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}
