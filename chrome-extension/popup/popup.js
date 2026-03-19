/**
 * AGS Popup - Self-Contained Call Analysis
 * With Agent Login and Active Call Monitoring
 */

const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
const STORAGE_KEY = 'ats_latest_analysis';
const SCORE_HOT = 70;
const SCORE_WARM = 40;
const ACTIVE_CALL_POLL_INTERVAL = 3000;

let stats = { calls: 0, analyzed: 0, hot: 0 };
let lastAnalysis = null;
let analysisInProgress = false;

let authState = {
    loggedIn: false,
    agentId: null,
    agentName: null,
    email: null
};

let activeCallMonitor = {
    active: false,
    polling: false,
    currentCallId: null,
    callPhone: null,
    callStartTime: null
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Popup] Initializing...');
    
    await loadAuthState();
    await loadStats();
    await checkServer();
    bindEvents();
    
    if (authState.loggedIn && authState.agentId) {
        showLoggedInState();
        startActiveCallMonitoring();
    } else {
        showLoginState();
    }
    
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

async function loadAuthState() {
    const result = await getStorage(['auth_email', 'auth_agentId', 'auth_agentName', 'auth_loggedIn']);
    authState = {
        loggedIn: result.auth_loggedIn || false,
        agentId: result.auth_agentId || null,
        agentName: result.auth_agentName || null,
        email: result.auth_email || null
    };
}

async function saveAuthState() {
    await setStorage({
        auth_email: authState.email,
        auth_agentId: authState.agentId,
        auth_agentName: authState.agentName,
        auth_loggedIn: authState.loggedIn
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

async function loginAgent(email) {
    try {
        const resp = await fetch(`${SERVER_URL}/api/ctm/user/by-email/${encodeURIComponent(email)}`);
        if (!resp.ok) {
            return { success: false, error: 'Failed to lookup user' };
        }
        
        const data = await resp.json();
        
        if (!data.found) {
            return { success: false, error: 'Agent not found' };
        }
        
        return {
            success: true,
            agentId: data.agent_id,
            agentName: data.name,
            email: data.email,
            status: data.status
        };
    } catch (e) {
        console.error('[API] Login error:', e);
        return { success: false, error: e.message };
    }
}

async function fetchActiveCallsForAgent(agentId) {
    try {
        const resp = await fetch(`${SERVER_URL}/api/ctm/active-calls/by-agent/${encodeURIComponent(agentId)}`);
        if (!resp.ok) return [];
        return await resp.json();
    } catch (e) {
        console.error('[API] Fetch active calls error:', e);
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

// ============ UI STATE MANAGEMENT ============

function showLoginState() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('clientSection').style.display = 'none';
    document.getElementById('loginForm').style.display = 'flex';
    document.getElementById('loginSuccess').style.display = 'none';
    showWaitingForLogin();
}

function showLoggedInState() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('clientSection').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('loginSuccess').style.display = 'flex';
    document.getElementById('agentName').textContent = authState.agentName || authState.email;
}

function showWaitingForLogin() {
    document.getElementById('callContent').innerHTML = `
        <div class="call-card">
            <div class="waiting-state">
                <div class="waiting-icon">🔐</div>
                <div class="waiting-text">Please login to monitor calls</div>
                <div class="waiting-subtext">Enter your agent email</div>
            </div>
        </div>
    `;
}

function showMonitoringActive() {
    const monitoringHtml = `
        <div class="call-card">
            <div class="call-header">
                <span class="call-badge active">● Monitoring</span>
            </div>
            <div class="monitoring-indicator">
                <div class="pulse"></div>
                <span>Waiting for incoming calls...</span>
            </div>
        </div>
    `;
    document.getElementById('callContent').innerHTML = monitoringHtml;
}

function showActiveCallUI(call) {
    const time = call.timestamp ? new Date(call.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
    document.getElementById('callContent').innerHTML = `
        <div class="call-card">
            <div class="call-header">
                <span class="call-badge active">● Incoming Call</span>
                <span class="call-meta">${time}</span>
            </div>
            <div class="call-phone">${formatPhone(call.phone)}</div>
            <div class="call-meta">${capitalize(call.direction || 'inbound')}</div>
        </div>
    `;
}

function showAnalyzingUI(phone) {
    document.getElementById('callContent').innerHTML = `
        <div class="call-card">
            <div class="call-header">
                <span class="call-badge analyzing">⚡ Analyzing...</span>
            </div>
            <div class="call-phone">${formatPhone(phone)}</div>
            <div class="call-meta">Processing call analysis</div>
        </div>
    `;
}

function showEndedCallUI(call) {
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

// ============ AUTH ============

async function handleLogin() {
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email) {
        showLoginError('Please enter your email');
        return;
    }
    
    if (!email.includes('@')) {
        showLoginError('Please enter a valid email');
        return;
    }
    
    loginBtn.textContent = 'Logging in...';
    loginBtn.disabled = true;
    
    const result = await loginAgent(email);
    
    if (result.success) {
        authState = {
            loggedIn: true,
            agentId: result.agentId,
            agentName: result.agentName,
            email: result.email
        };
        await saveAuthState();
        
        loginBtn.textContent = 'Login';
        loginBtn.disabled = false;
        
        showLoggedInState();
        startActiveCallMonitoring();
    } else {
        loginBtn.textContent = 'Login';
        loginBtn.disabled = false;
        showLoginError(result.error || 'Login failed');
    }
}

async function handleLogout() {
    authState = {
        loggedIn: false,
        agentId: null,
        agentName: null,
        email: null
    };
    await saveAuthState();
    
    stopActiveCallMonitoring();
    showLoginState();
}

function showLoginError(message) {
    let errorEl = document.querySelector('.login-error');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'login-error';
        document.getElementById('loginForm').appendChild(errorEl);
    }
    errorEl.textContent = message;
    setTimeout(() => { errorEl.textContent = ''; }, 5000);
}

// ============ ACTIVE CALL MONITORING ============

function startActiveCallMonitoring() {
    if (activeCallMonitor.polling) return;
    
    console.log('[Monitor] Starting active call monitoring for agent:', authState.agentId);
    activeCallMonitor.active = true;
    activeCallMonitor.polling = true;
    
    showMonitoringActive();
    pollForActiveCalls();
}

function stopActiveCallMonitoring() {
    console.log('[Monitor] Stopping active call monitoring');
    activeCallMonitor.active = false;
    activeCallMonitor.polling = false;
    activeCallMonitor.currentCallId = null;
    activeCallMonitor.callPhone = null;
    activeCallMonitor.callStartTime = null;
}

async function pollForActiveCalls() {
    if (!activeCallMonitor.active || !activeCallMonitor.polling) return;
    
    try {
        const calls = await fetchActiveCallsForAgent(authState.agentId);
        
        if (calls && calls.length > 0) {
            const call = calls[0];
            
            if (call.call_id !== activeCallMonitor.currentCallId) {
                console.log('[Monitor] New active call detected:', call.call_id, call.phone);
                activeCallMonitor.currentCallId = call.call_id;
                activeCallMonitor.callPhone = call.phone;
                activeCallMonitor.callStartTime = Date.now();
                
                showActiveCallUI(call);
            }
        } else {
            if (activeCallMonitor.currentCallId && activeCallMonitor.callPhone) {
                console.log('[Monitor] Call ended:', activeCallMonitor.currentCallId);
                await handleCallEnded(activeCallMonitor.currentCallId, activeCallMonitor.callPhone);
            }
            
            if (!activeCallMonitor.currentCallId) {
                showMonitoringActive();
            }
        }
    } catch (e) {
        console.error('[Monitor] Poll error:', e);
    }
    
    if (activeCallMonitor.polling) {
        setTimeout(pollForActiveCalls, ACTIVE_CALL_POLL_INTERVAL);
    }
}

async function handleCallEnded(callId, phone) {
    if (analysisInProgress) {
        console.log('[Monitor] Analysis already in progress, skipping');
        return;
    }
    
    analysisInProgress = true;
    showAnalyzingUI(phone);
    
    try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const transData = await fetchTranscript(callId);
        
        if (!transData || !transData.available || !transData.transcript) {
            console.log('[Monitor] No transcript available for:', callId);
            showEndedCallUI({ phone, duration: 0 });
            analysisInProgress = false;
            resetCallState();
            return;
        }
        
        const client = document.getElementById('clientSelect')?.value || 'flyland';
        const analysis = await analyzeCall(transData.transcript, phone, client);
        
        if (!analysis) {
            console.log('[Monitor] Analysis failed for:', callId);
            showEndedCallUI({ phone, duration: 0 });
            analysisInProgress = false;
            resetCallState();
            return;
        }
        
        const score = analysis.qualification_score || 0;
        stats.calls++;
        stats.analyzed++;
        if (score >= SCORE_HOT) stats.hot++;
        await saveStats();
        updateStats();
        
        const result = {
            type: 'analysis_complete',
            phone: phone,
            call_id: callId,
            timestamp: Date.now(),
            analysis: {
                score: score,
                sentiment: analysis.sentiment || 'neutral',
                summary: analysis.summary || 'No summary',
                tags: analysis.tags || [],
                disposition: analysis.suggested_disposition || 'New',
                follow_up: analysis.follow_up_required || false
            },
            status: 'complete'
        };
        
        await setStorage({ [STORAGE_KEY]: result });
        lastAnalysis = result;
        showAnalysis(result);
        
    } catch (e) {
        console.error('[Monitor] Analysis error:', e);
        showEndedCallUI({ phone, duration: 0 });
    }
    
    analysisInProgress = false;
    resetCallState();
}

function resetCallState() {
    activeCallMonitor.currentCallId = null;
    activeCallMonitor.callPhone = null;
    activeCallMonitor.callStartTime = null;
}

// ============ ANALYSIS DISPLAY ============

function showAnalysis(data) {
    const score = data.analysis?.score || data.analysis?.qualification_score || 0;
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

// ============ UTILS ============

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

// ============ EVENTS ============

function bindEvents() {
    document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('passwordInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('refreshBtn');
        if (btn) {
            btn.textContent = '⏳...';
            await checkServer();
            btn.textContent = '↻ Refresh';
        }
    });
    
    document.getElementById('configBtn')?.addEventListener('click', () => {
        window.open(chrome.runtime.getURL('config/config.html'), '_blank');
    });
}
