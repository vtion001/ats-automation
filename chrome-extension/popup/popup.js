/**
 * AGS Popup - Modular Call Analysis
 * 
 * Handles popup UI, stats, and floating button toggle.
 */

import { ApiService } from '../src/services/api-service.js';
import { StorageService } from '../src/services/storage-service.js';
import { formatPhone } from '../src/utils/phone-utils.js';
import { SCORE_THRESHOLDS } from '../src/utils/constants.js';

const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
const STORAGE_KEY = 'ats_latest_analysis';

let stats = { calls: 0, analyzed: 0, hot: 0 };
let lastAnalysis = null;
let floatingEnabled = false;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Popup] Initializing...');
    
    await loadStats();
    await checkServer();
    loadFloatingState();
    startMonitoring();
    bindEvents();
    
    console.log('[Popup] Ready');
});

async function loadStats() {
    stats = await StorageService.getStats();
    updateStats();
}

function updateStats() {
    document.getElementById('callsCount').textContent = stats.calls;
    document.getElementById('analyzedCount').textContent = stats.analyzed;
    document.getElementById('hotCount').textContent = stats.hot;
}

async function checkServer() {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    
    const isOk = await ApiService.checkHealth();
    if (isOk) {
        dot.className = 'status-dot ok';
        text.textContent = 'Connected to server';
    } else {
        dot.className = 'status-dot error';
        text.textContent = 'Server offline';
    }
}

function loadFloatingState() {
    StorageService.get('floatingEnabled').then(result => {
        floatingEnabled = result.floatingEnabled || false;
        updateFloatingToggle();
        if (floatingEnabled) {
            createFloatingButton();
        }
    });
}

function updateFloatingToggle() {
    const btn = document.getElementById('floatingToggle');
    if (floatingEnabled) {
        btn.classList.add('active');
        btn.querySelector('span').textContent = 'On';
    } else {
        btn.classList.remove('active');
        btn.querySelector('span').textContent = 'Float';
    }
}

function createFloatingButton() {
    // Check if already exists
    if (document.getElementById('ats-floating-btn')) return;
    
    const btn = document.createElement('div');
    btn.id = 'ats-floating-btn';
    btn.innerHTML = `
        <button class="ats-fab">
            <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path></svg>
        </button>
        <div class="ats-fab-tooltip">📞 ATS Monitor</div>
    `;
    
    addFloatingStyles();
    document.body.appendChild(btn);
    
    btn.querySelector('.ats-fab').addEventListener('click', toggleOverlay);
}

function addFloatingStyles() {
    if (document.getElementById('ats-fab-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'ats-fab-styles';
    styles.textContent = `
        #ats-floating-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999998;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .ats-fab {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .ats-fab:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 24px rgba(102, 126, 234, 0.5);
        }
        .ats-fab svg { width: 28px; height: 28px; fill: white; }
        .ats-fab-tooltip {
            position: absolute;
            bottom: 70px;
            right: 0;
            background: #333;
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s;
        }
        #ats-floating-btn:hover .ats-fab-tooltip { opacity: 1; }
    `;
    document.head.appendChild(styles);
}

function toggleOverlay() {
    let overlay = document.getElementById('ats-automation-overlay');
    
    if (overlay) {
        overlay.remove();
    } else {
        showOverlay();
    }
}

function showOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'ats-automation-overlay';
    
    if (lastAnalysis) {
        overlay.innerHTML = generateAnalysisHTML(lastAnalysis);
    } else {
        overlay.innerHTML = generateWaitingHTML();
    }
    
    addOverlayStyles();
    document.body.appendChild(overlay);
    
    overlay.querySelector('[data-action="close"]')?.addEventListener('click', () => overlay.remove());
    overlay.querySelector('[data-action="copy"]')?.addEventListener('click', () => {
        if (lastAnalysis) {
            navigator.clipboard.writeText(lastAnalysis.analysis.summary);
            const btn = overlay.querySelector('[data-action="copy"]');
            btn.textContent = '✓ Copied!';
            setTimeout(() => btn.textContent = '📋 Copy Notes', 2000);
        }
    });
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
        <style>
            .ats-overlay-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;
            }
            .ats-title { font-weight: 600; font-size: 16px; }
            .ats-close-btn { background: none; border: none; color: white; font-size: 24px; cursor: pointer; }
            .ats-overlay-content { padding: 16px; }
            .ats-waiting-state { text-align: center; padding: 24px; }
            .ats-waiting-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.6; }
            .ats-waiting-text { color: #666; font-size: 14px; }
        </style>
    `;
}

function generateAnalysisHTML(data) {
    const score = data.analysis.score || 0;
    const scoreClass = score >= SCORE_THRESHOLDS.HOT ? 'hot' : score >= SCORE_THRESHOLDS.WARM ? 'warm' : 'cold';
    const scoreLabel = score >= SCORE_THRESHOLDS.HOT ? 'Hot Lead' : score >= SCORE_THRESHOLDS.WARM ? 'Warm Lead' : 'Cold Lead';
    
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
            <div class="ats-summary">${data.analysis.summary}</div>
            <button class="ats-copy-btn" data-action="copy">📋 Copy Notes</button>
        </div>
        <style>
            .ats-overlay-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;
            }
            .ats-title { font-weight: 600; font-size: 16px; }
            .ats-close-btn, .ats-copy-btn { background: none; border: none; color: white; font-size: 24px; cursor: pointer; }
            .ats-overlay-content { padding: 16px; }
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
            .ats-summary { font-size: 14px; line-height: 1.5; color: #333; margin-bottom: 12px; }
            .ats-copy-btn {
                background: #f0f0f0; border: none; padding: 8px 16px;
                border-radius: 4px; cursor: pointer; font-size: 12px;
            }
        </style>
    `;
}

function addOverlayStyles() {
    // Styles are inline now
}

function startMonitoring() {
    checkStorageForAnalysis();
    setInterval(checkStorageForAnalysis, 5000);
    
    checkForCalls();
    setInterval(checkForCalls, 10000);
}

async function checkStorageForAnalysis() {
    try {
        const result = await StorageService.get(STORAGE_KEY);
        const analysis = result[STORAGE_KEY];
        
        if (analysis && analysis !== lastAnalysis) {
            lastAnalysis = analysis;
            console.log('[Popup] New analysis:', analysis.type);
            
            if (analysis.type === 'analysis_complete') {
                await handleAnalysisComplete(analysis);
            }
        }
    } catch (e) {
        // Not in extension context
    }
}

async function handleAnalysisComplete(data) {
    stats.calls++;
    stats.analyzed++;
    if (data.analysis.score >= 70) stats.hot++;
    
    await StorageService.setStats(stats);
    updateStats();
    showAnalysis(data);
    
    // Update floating button tooltip if visible
    const tooltip = document.querySelector('.ats-fab-tooltip');
    if (tooltip) {
        tooltip.textContent = `📞 ${formatPhone(data.phone)}`;
    }
}

async function checkForCalls() {
    try {
        const calls = await ApiService.getCalls(3);
        
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
        const transData = await ApiService.getTranscript(call.call_id);
        if (!transData || !transData.available || !transData.transcript) {
            showEndedCall(call);
            return;
        }
        
        const client = document.getElementById('clientSelect')?.value || 'flyland';
        const analysis = await ApiService.analyze(transData.transcript, call.phone, client, call.call_id);
        
        if (!analysis) {
            showEndedCall(call);
            return;
        }
        
        stats.calls++;
        stats.analyzed++;
        if (analysis.qualification_score >= 70) stats.hot++;
        await StorageService.setStats(stats);
        updateStats();
        
        showAnalysis({ phone: call.phone, analysis });
        
    } catch (e) {
        console.error('[Popup] Analysis error:', e);
        showEndedCall(call);
    }
}

function showAnalysis(data) {
    const score = data.analysis.qualification_score || data.analysis.score || 0;
    const scoreClass = score >= SCORE_THRESHOLDS.HOT ? 'hot' : score >= SCORE_THRESHOLDS.WARM ? 'warm' : 'cold';
    const scoreLabel = score >= SCORE_THRESHOLDS.HOT ? 'Hot Lead' : score >= SCORE_THRESHOLDS.WARM ? 'Warm Lead' : 'Cold Lead';
    const sentiment = data.analysis.sentiment || 'neutral';
    const summary = data.analysis.summary || 'No summary available';
    const tags = data.analysis.tags || [];
    
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
    // Client select
    document.getElementById('clientSelect')?.addEventListener('change', async (e) => {
        await StorageService.setClient(e.target.value);
    });
    
    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('refreshBtn');
        btn.textContent = '⏳...';
        lastAnalysis = null;
        await checkServer();
        await checkStorageForAnalysis();
        await checkForCalls();
        btn.textContent = '↻ Refresh';
    });
    
    // Config button
    document.getElementById('configBtn')?.addEventListener('click', () => {
        window.open(chrome.runtime.getURL('config/config.html'), '_blank');
    });
    
    // Floating toggle
    document.getElementById('floatingToggle')?.addEventListener('click', async () => {
        floatingEnabled = !floatingEnabled;
        await StorageService.set({ floatingEnabled });
        updateFloatingToggle();
        
        if (floatingEnabled) {
            createFloatingButton();
        } else {
            const fab = document.getElementById('ats-floating-btn');
            if (fab) fab.remove();
            const overlay = document.getElementById('ats-automation-overlay');
            if (overlay) overlay.remove();
        }
    });
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}
