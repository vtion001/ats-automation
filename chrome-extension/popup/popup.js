/**
 * AGS Popup - Self-Contained Call Analysis
 * No external imports - all code inlined for Chrome Extension compatibility
 */

const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
const STORAGE_KEY = 'ats_latest_analysis';
const SCORE_HOT = 70;
const SCORE_WARM = 40;

let stats = { calls: 0, analyzed: 0, hot: 0 };
let lastAnalysis = null;
let detectedPhone = null;
let analysisInProgress = false;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Popup] Initializing...');
    
    await loadStats();
    await checkServer();
    startMonitoring();
    bindEvents();
    
    console.log('[Popup] Ready');
});

// ============ STORAGE ============

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

async function loadStats() {
    const result = await getStorage(['stats_calls', 'stats_analyzed', 'stats_hot']);
    stats = {
        calls: result.stats_calls || 0,
        analyzed: result.stats_analyzed || 0,
        hot: result.stats_hot || 0
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

// ============ API ============

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

async function fetchCalls(limit = 3) {
    try {
        const resp = await fetch(`${SERVER_URL}/api/ctm/calls?limit=${limit}&hours=24`);
        if (!resp.ok) return [];
        return await resp.json();
    } catch (e) {
        console.error('[API] Fetch calls error:', e);
        return [];
    }
}

async function fetchTranscript(callId) {
    try {
        const resp = await fetch(`${SERVER_URL}/api/ctm/calls/${callId}/transcript`);
        if (!resp.ok) return null;
        return await resp.json();
    } catch (e) {
        console.error('[API] Fetch transcript error:', e);
        return null;
    }
}

async function findCallByPhone(phone) {
    try {
        const resp = await fetch(`${SERVER_URL}/api/ctm/calls/by-phone/${encodeURIComponent(phone)}`);
        if (!resp.ok) return null;
        return await resp.json();
    } catch (e) {
        console.error('[API] Find call by phone error:', e);
        return null;
    }
}

async function analyzeCall(transcription, phone, client) {
    try {
        const resp = await fetch(`${SERVER_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcription, phone, client })
        });
        if (!resp.ok) return null;
        return await resp.json();
    } catch (e) {
        console.error('[API] Analyze error:', e);
        return null;
    }
}

// ============ PHONE UTILS ============

function formatPhone(phone) {
    if (!phone) return 'Unknown';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits[0] === '1') {
        return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getScoreClass(score) {
    if (score >= SCORE_HOT) return 'hot';
    if (score >= SCORE_WARM) return 'warm';
    return 'cold';
}

function getScoreLabel(score) {
    if (score >= SCORE_HOT) return 'Hot Lead';
    if (score >= SCORE_WARM) return 'Warm Lead';
    return 'Cold Lead';
}

// ============ OVERLAY ============

function toggleOverlay() {
    let overlay = document.getElementById('ats-automation-overlay');
    
    if (overlay) {
        overlay.remove();
    } else {
        showOverlay();
    }
}

function showOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'ats-automation-overlay';
    
    if (lastAnalysis) {
        overlay.innerHTML = generateAnalysisHTML(lastAnalysis);
        addOverlayStyles();
        document.body.appendChild(overlay);
        
        overlay.querySelector('[data-action="close"]')?.addEventListener('click', () => overlay.remove());
        overlay.querySelector('[data-action="copy"]')?.addEventListener('click', () => {
            navigator.clipboard.writeText(lastAnalysis.analysis?.summary || lastAnalysis.analysis || '');
            const btn = overlay.querySelector('[data-action="copy"]');
            if (btn) {
                btn.textContent = '✓ Copied!';
                setTimeout(() => btn.textContent = '📋 Copy Notes', 2000);
            }
        });
    } else {
        overlay.innerHTML = generateWaitingHTML();
        addOverlayStyles();
        document.body.appendChild(overlay);
        
        overlay.querySelector('[data-action="close"]')?.addEventListener('click', () => overlay.remove());
    }
}

function generateWaitingHTML() {
    return `
        <div class="ats-overlay-header">
            <span class="ats-title">📞 ATS Monitor</span>
            <button class="ats-close-btn" data-action="close">×</button>
        </div>
        <div class="ats-overlay-content">
            <div class="ats-waiting-state">
                <div class="ats-waiting-icon">📞</div>
                <div class="ats-waiting-text">Monitoring for calls...</div>
            </div>
        </div>
    `;
}

function generateAnalysisHTML(data) {
    const score = data.analysis?.score || data.analysis?.qualification_score || 0;
    const scoreClass = getScoreClass(score);
    const scoreLabel = getScoreLabel(score);
    const sentiment = data.analysis?.sentiment || 'neutral';
    const summary = data.analysis?.summary || 'No summary available';
    const tags = data.analysis?.tags || [];
    
    const tagsHtml = tags.length > 0 
        ? `<div class="tags">${tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` 
        : '';
    
    return `
        <div class="ats-overlay-header">
            <span class="ats-title">📊 Call Analysis</span>
            <button class="ats-close-btn" data-action="close">×</button>
        </div>
        <div class="ats-overlay-content">
            <div class="ats-header-section">
                <div class="ats-phone-icon">
                    <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path></svg>
                </div>
                <span class="ats-phone-number">${formatPhone(data.phone)}</span>
                <div class="ats-status-row">
                    <span class="ats-score-badge ${scoreClass}">${score}</span>
                    <span class="ats-status-label ${scoreClass}">${scoreLabel}</span>
                </div>
            </div>
            
            <div class="ats-info-list">
                <div class="ats-info-item">
                    <span class="ats-info-label">Sentiment:</span>
                    <span class="ats-info-value">${sentiment}</span>
                </div>
            </div>
            
            <div class="ats-summary">${summary}</div>
            ${tagsHtml}
            
            <button class="ats-copy-btn" data-action="copy">📋 Copy Notes</button>
        </div>
    `;
}

function addOverlayStyles() {
    if (document.getElementById('ats-overlay-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'ats-overlay-styles';
    styles.textContent = `
        #ats-automation-overlay {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 380px;
            max-height: 90vh;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
        }
        .ats-overlay-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .ats-title { font-weight: 600; font-size: 16px; }
        .ats-close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }
        .ats-overlay-content { padding: 16px; max-height: calc(90vh - 60px); overflow-y: auto; }
        .ats-header-section { text-align: center; margin-bottom: 16px; }
        .ats-phone-icon { width: 48px; height: 48px; margin: 0 auto 8px; }
        .ats-phone-icon svg { width: 100%; height: 100%; fill: #667eea; }
        .ats-phone-number { font-size: 20px; font-weight: 600; display: block; margin-top: 8px; }
        .ats-status-row { display: flex; justify-content: center; gap: 12px; margin-top: 12px; }
        .ats-score-badge {
            width: 50px; height: 50px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; font-weight: 700; color: white;
        }
        .ats-score-badge.hot { background: #e74c3c; }
        .ats-score-badge.warm { background: #f39c12; }
        .ats-score-badge.cold { background: #3498db; }
        .ats-status-label { font-size: 14px; padding-top: 15px; }
        .ats-status-label.hot { color: #e74c3c; }
        .ats-status-label.warm { color: #f39c12; }
        .ats-status-label.cold { color: #3498db; }
        .ats-info-list { margin-bottom: 16px; }
        .ats-info-item { display: flex; gap: 8px; font-size: 13px; margin-bottom: 8px; }
        .ats-info-label { font-weight: 500; color: #666; }
        .ats-info-value { color: #333; }
        .ats-summary { font-size: 14px; line-height: 1.5; color: #333; margin-bottom: 12px; }
        .ats-copy-btn {
            background: #f0f0f0; border: none; padding: 8px 16px;
            border-radius: 4px; cursor: pointer; font-size: 12px;
            width: 100%;
        }
        .ats-copy-btn:hover { background: #e0e0e0; }
        .ats-waiting-state { text-align: center; padding: 24px; }
        .ats-waiting-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.6; }
        .ats-waiting-text { color: #666; font-size: 14px; }
        .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .tag { 
            font-size: 11px; 
            padding: 3px 10px; 
            border-radius: 20px; 
            background: rgba(49, 130, 206, 0.08); 
            color: #3182ce;
            font-weight: 500;
        }
    `;
    document.head.appendChild(styles);
}

// ============ MONITORING ============

function startMonitoring() {
    checkStorageForAnalysis();
    setInterval(checkStorageForAnalysis, 5000);
    
    checkForCalls();
    setInterval(checkForCalls, 10000);
    
    // Update floating widget periodically
    setInterval(() => {
        if (floatingEnabled) {
            updateFloatingWidget();
        }
    }, 5000);
}

async function checkStorageForAnalysis() {
    try {
        const result = await getStorage(STORAGE_KEY);
        const analysis = result[STORAGE_KEY];
        
        if (analysis && analysis !== lastAnalysis) {
            lastAnalysis = analysis;
            console.log('[Popup] New analysis:', analysis.type);
            
            if (analysis.type === 'analysis_complete' || analysis.status === 'complete') {
                await handleAnalysisComplete(analysis);
            }
        }
    } catch (e) {
        // Not in extension context
    }
}

async function handleAnalysisComplete(data) {
    const score = data.analysis?.score || data.analysis?.qualification_score || 0;
    
    stats.calls++;
    stats.analyzed++;
    if (score >= SCORE_HOT) stats.hot++;
    
    await saveStats();
    updateStats();
    showAnalysis(data);
    
    // Update floating button tooltip
    const tooltip = document.querySelector('.ats-fab-tooltip');
    if (tooltip) {
        tooltip.textContent = `📞 ${formatPhone(data.phone)}`;
    }
}

async function checkForCalls() {
    // Only show calls that were detected by the DOM monitor (softphone)
    // If no call detected by DOM, show waiting state
    const storageResult = await getStorage(STORAGE_KEY);
    const latestFromDom = storageResult[STORAGE_KEY];
    
    // If DOM monitor detected a call, show it
    if (latestFromDom && latestFromDom.phone) {
        // Check if it's still fresh (within last 5 minutes)
        const age = Date.now() - (latestFromDom.timestamp || 0);
        if (age < 5 * 60 * 1000) {
            if (latestFromDom.type === 'analysis_complete' || latestFromDom.status === 'complete') {
                detectedPhone = null;
                analysisInProgress = false;
                showAnalysis(latestFromDom);
            } else if (latestFromDom.type === 'call_detected') {
                // Track the detected phone and trigger analysis
                if (!analysisInProgress && latestFromDom.phone !== detectedPhone) {
                    detectedPhone = latestFromDom.phone;
                    triggerCallAnalysis(latestFromDom.phone);
                }
                showCallDetected(latestFromDom.phone);
            } else if (latestFromDom.type === 'call_ended') {
                // Call ended but no analysis yet - trigger analysis
                if (!analysisInProgress && latestFromDom.phone !== detectedPhone) {
                    detectedPhone = latestFromDom.phone;
                    triggerCallAnalysis(latestFromDom.phone);
                }
                showEndedCall({ phone: latestFromDom.phone, duration: latestFromDom.duration });
            } else {
                showActiveCall({ phone: latestFromDom.phone, direction: 'inbound' });
            }
            return;
        }
    }
    
    // No recent call detected by DOM - show waiting
    detectedPhone = null;
    analysisInProgress = false;
    showWaiting();
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

async function analyzeCallData(call) {
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
        const transData = await fetchTranscript(call.call_id);
        if (!transData || !transData.available || !transData.transcript) {
            showEndedCall(call);
            return;
        }
        
        const client = document.getElementById('clientSelect')?.value || 'flyland';
        const analysis = await analyzeCall(transData.transcript, call.phone, client);
        
        if (!analysis) {
            showEndedCall(call);
            return;
        }
        
        const score = analysis.qualification_score || 0;
        stats.calls++;
        stats.analyzed++;
        if (score >= SCORE_HOT) stats.hot++;
        await saveStats();
        updateStats();
        
        showAnalysis({ phone: call.phone, analysis });
        
    } catch (e) {
        console.error('[Popup] Analysis error:', e);
        showEndedCall(call);
    }
}

async function triggerCallAnalysis(phone) {
    if (analysisInProgress) return;
    
    analysisInProgress = true;
    console.log('[Popup] Triggering analysis for:', phone);
    
    try {
        // Find the call by phone
        const call = await findCallByPhone(phone);
        
        if (!call) {
            console.log('[Popup] No ended call found for:', phone);
            analysisInProgress = false;
            return;
        }
        
        console.log('[Popup] Found ended call:', call.call_id, 'status:', call.status);
        
        // Check if transcript is available
        const transData = await fetchTranscript(call.call_id);
        if (!transData || !transData.available || !transData.transcript) {
            console.log('[Popup] No transcript available yet for:', call.call_id);
            // Keep polling - call this function again in 5 seconds
            setTimeout(() => triggerCallAnalysis(phone), 5000);
            return;
        }
        
        // Run analysis
        const client = document.getElementById('clientSelect')?.value || 'flyland';
        const analysis = await analyzeCall(transData.transcript, phone, client);
        
        if (!analysis) {
            console.log('[Popup] Analysis failed for:', phone);
            showEndedCall({ phone, duration: call.duration });
            analysisInProgress = false;
            return;
        }
        
        const score = analysis.qualification_score || 0;
        stats.calls++;
        stats.analyzed++;
        if (score >= SCORE_HOT) stats.hot++;
        await saveStats();
        updateStats();
        
        // Store result
        const result = {
            type: 'analysis_complete',
            phone: phone,
            call_id: call.call_id,
            duration: call.duration,
            timestamp: Date.now(),
            analysis: {
                score: analysis.qualification_score || 0,
                sentiment: analysis.sentiment || 'neutral',
                summary: analysis.summary || 'No summary',
                tags: analysis.tags || [],
                disposition: analysis.suggested_disposition || 'New',
                follow_up: analysis.follow_up_required || false
            },
            status: 'complete'
        };
        
        await setStorage({ [STORAGE_KEY]: result });
        
        // Show analysis
        showAnalysis(result);
        analysisInProgress = false;
        
    } catch (e) {
        console.error('[Popup] triggerCallAnalysis error:', e);
        analysisInProgress = false;
    }
}

function showAnalysis(data) {
    const score = data.analysis?.qualification_score || data.analysis?.score || 0;
    const scoreClass = getScoreClass(score);
    const scoreLabel = getScoreLabel(score);
    const sentiment = data.analysis?.sentiment || 'neutral';
    const summary = data.analysis?.summary || 'No summary available';
    const tags = data.analysis?.tags || [];
    
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

// ============ FLOATING WINDOW ============

let floatingEnabled = false;
let floatingWindowId = null;

async function enableFloatingWindow() {
    const popupUrl = chrome.runtime.getURL('popup/popup.html');
    
    try {
        const win = await chrome.windows.create({
            url: popupUrl + '?floating=true',
            type: 'popup',
            width: 400,
            height: 650,
            left: 100,
            top: 100
        });
        floatingWindowId = win.id;
        await setStorage({ floatingEnabled: true, floatingWindowId: win.id });
        
        window.close();
    } catch (e) {
        console.error('[Float] Failed to create window:', e);
    }
}

async function disableFloatingWindow() {
    if (floatingWindowId) {
        try {
            await chrome.windows.remove(floatingWindowId);
        } catch (e) {
        }
        floatingWindowId = null;
    }
    await setStorage({ floatingEnabled: false, floatingWindowId: null });
}

async function checkExistingFloatingWindow() {
    if (!window.location.search.includes('floating=true')) {
        const result = await getStorage(['floatingWindowId']);
        if (result.floatingWindowId) {
            try {
                await chrome.windows.remove(result.floatingWindowId);
            } catch (e) {
            }
            await setStorage({ floatingWindowId: null, floatingEnabled: false });
        }
        return;
    }
    
    document.body.classList.add('is-floating');
    addFloatingStyles();
    
    const result = await getStorage(['floatingWindowId']);
    if (result.floatingWindowId) {
        floatingWindowId = result.floatingWindowId;
        
        chrome.windows.onRemoved.addListener((windowId) => {
            if (windowId === floatingWindowId) {
                floatingWindowId = null;
                setStorage({ floatingEnabled: false, floatingWindowId: null });
                window.close();
            }
        });
    }
}

function addFloatingStyles() {
    if (document.getElementById('ats-floating-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'ats-floating-styles';
    styles.textContent = `
        body.is-floating {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: auto !important;
            bottom: auto !important;
            width: 400px !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: 100vh;
            box-shadow: 0 12px 48px rgba(0,0,0,0.3);
            border-radius: 0;
            z-index: 999999;
            overflow-y: auto !important;
            overflow-x: hidden;
        }
        body.is-floating .header {
            cursor: default;
            padding: 12px 16px;
        }
        body.is-floating .logo {
            width: 36px;
            height: 36px;
        }
        body.is-floating .header h1 {
            font-size: 15px;
        }
        body.is-floating .header .tagline {
            font-size: 10px;
        }
        body.is-floating .floating-toggle {
            background: rgba(39, 174, 96, 0.3) !important;
            border-color: rgba(39, 174, 96, 0.5) !important;
            padding: 6px 10px;
        }
        body.is-floating .floating-toggle span {
            color: #48bb78 !important;
        }
        body.is-floating .status-bar,
        body.is-floating .section:not(#callSection) {
            display: none !important;
        }
        body.is-floating .section {
            padding: 12px 16px;
        }
        body.is-floating .section-title {
            font-size: 9px;
            margin-bottom: 8px;
        }
        body.is-floating .call-card {
            padding: 12px;
        }
        body.is-floating .waiting-state {
            padding: 16px 12px;
        }
        body.is-floating .waiting-icon {
            font-size: 28px;
            margin-bottom: 8px;
        }
        body.is-floating .analysis-card {
            padding: 10px;
            margin-top: 8px;
        }
        body.is-floating .score-circle {
            width: 36px;
            height: 36px;
            font-size: 13px;
        }
        body.is-floating .actions {
            margin-top: 10px;
        }
        body.is-floating .footer {
            display: none !important;
        }
    `;
    document.head.appendChild(styles);
}

// ============ EVENTS ============

function bindEvents() {
    checkExistingFloatingWindow();
    
    // Client select
    document.getElementById('clientSelect')?.addEventListener('change', async (e) => {
        await setStorage({ client: e.target.value });
    });
    
    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('refreshBtn');
        if (btn) {
            btn.textContent = '⏳...';
            lastAnalysis = null;
            await checkServer();
            await checkStorageForAnalysis();
            await checkForCalls();
            btn.textContent = '↻ Refresh';
        }
    });
    
    // Config button
    document.getElementById('configBtn')?.addEventListener('click', () => {
        window.open(chrome.runtime.getURL('config/config.html'), '_blank');
    });
    
    // Floating toggle
    const floatingToggle = document.getElementById('floatingToggle');
    if (floatingToggle) {
        floatingToggle.addEventListener('click', async () => {
            if (window.location.search.includes('floating=true')) {
                if (floatingWindowId) {
                    try {
                        await chrome.windows.remove(floatingWindowId);
                        floatingWindowId = null;
                    } catch (e) {
                    }
                    await setStorage({ floatingEnabled: false, floatingWindowId: null });
                }
                window.close();
            } else {
                await enableFloatingWindow();
            }
        });
    }
    
    // Load floating state on startup (for popup mode)
    if (!window.location.search.includes('floating=true')) {
        getStorage({ floatingEnabled: false }).then(result => {
            if (result.floatingEnabled && result.floatingWindowId) {
                floatingWindowId = result.floatingWindowId;
                const floatingToggle = document.getElementById('floatingToggle');
                if (floatingToggle) floatingToggle.classList.add('active');
            }
        });
    }
}
