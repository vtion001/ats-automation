/**
 * Tab Selector Popup Script
 * Records audio from selected tab using injected content-script approach.
 * Content script runs in target tab → tabCapture.capture() works automatically.
 */

const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
const DEFAULT_CLIENT = 'flyland';

let selectedTabId = null;
let selectedTabTitle = null;
let isRecording = false;
let recordingStartTime = null;
let timerInterval = null;
let recordedChunks = [];
let recordingStoppedPromise = null;
let recordingStoppedResolve = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadTabs();
    document.getElementById('refreshBtn').addEventListener('click', loadTabs);
    document.getElementById('startBtn').addEventListener('click', startRecording);
    document.getElementById('stopBtn').addEventListener('click', stopRecording);
    document.getElementById('transcribeBtn')?.addEventListener('click', showManualTranscribe);
    checkRecordingStatus();
}

async function loadTabs() {
    const tabList = document.getElementById('tabList');
    tabList.innerHTML = '<p style="text-align:center;"><span class="loading-spinner"></span> Loading...</p>';
    
    try {
        const tabs = await chrome.tabs.query({ audible: true, currentWindow: false });
        const ctmTabs = await chrome.tabs.query({ url: '*://*.calltrackingmetrics.com/*' });

        const allTabs = [...tabs];
        const existingIds = new Set(tabs.map(t => t.id));
        for (const tab of ctmTabs) {
            if (!existingIds.has(tab.id)) allTabs.push(tab);
        }

        if (allTabs.length === 0) {
            tabList.innerHTML = '<p style="opacity:0.7;text-align:center;padding:20px;">No active tabs found</p>';
            return;
        }

        tabList.innerHTML = allTabs.map(tab => `
            <div class="tab-item" data-id="${tab.id}">
                <img class="tab-icon" src="${tab.favIconUrl || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%231e3a5f%22 width=%2216%22 height=%2216%22 rx=%223%22/></svg>'}" />
                <div class="tab-info">
                    <div class="tab-title">${tab.title || 'Untitled'}</div>
                    <div class="tab-url">${tab.url || ''}</div>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.tab-item').forEach(item => {
            item.addEventListener('click', () => selectTab(parseInt(item.dataset.id), allTabs));
        });
    } catch (e) {
        tabList.innerHTML = `<p style="color:#ef4444;text-align:center;">Error: ${e.message}</p>`;
    }
}

function selectTab(tabId, allTabs) {
    selectedTabId = tabId;
    const tab = allTabs.find(t => t.id === tabId);
    selectedTabTitle = tab ? tab.title : 'Unknown';
    
    document.querySelectorAll('.tab-item').forEach(item => {
        item.classList.toggle('active', parseInt(item.dataset.id) === tabId);
    });
    
    clearResults();
    document.getElementById('startBtn').classList.remove('hidden');
    updateStatus('Selected: ' + (selectedTabTitle || 'Unknown').substring(0, 35), 'stopped');
}

function clearResults() {
    const results = document.getElementById('analysisResults');
    if (results) results.remove();
    const manual = document.getElementById('manualTranscribeForm');
    if (manual) manual.remove();
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function startTimer() {
    stopTimer();
    recordingStartTime = Date.now();
    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    recordingStartTime = null;
}

function updateTimerDisplay() {
    if (!recordingStartTime) return;
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const timerEl = document.getElementById('recordingTimer');
    if (timerEl) timerEl.textContent = formatDuration(elapsed);
}

function setRecordingUI(recording) {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const status = document.getElementById('status');
    const notice = document.getElementById('captureNotice');
    
    if (recording) {
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        status.classList.add('recording');
        status.classList.remove('stopped');
        if (notice) notice.classList.add('hidden');
    } else {
        stopTimer();
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        status.classList.remove('recording');
        status.classList.add('stopped');
        if (notice) notice.classList.remove('hidden');
    }
}

function setWorkingUI(working) {
    const dot = document.querySelector('.status-dot');
    const status = document.getElementById('status');
    if (dot) {
        if (working) {
            dot.classList.remove('recording');
            dot.classList.add('working');
        } else {
            dot.classList.remove('working');
        }
    }
}

async function startRecording() {
    if (!selectedTabId) {
        updateStatus('Please select a tab first', 'stopped');
        return;
    }
    
    clearResults();
    updateStatus('Starting...', 'stopped');
    
    try {
        if (!chrome.scripting) {
            updateStatus('Scripting API not available - update Chrome', 'stopped');
            return;
        }
        
        recordedChunks = [];
        
        const response = await chrome.runtime.sendMessage({
            type: 'START_CAPTURE_TAB',
            tabId: selectedTabId
        });
        
        if (response && response.error) {
            if (response.notInvoked) {
                updateStatus('Open the CTM tab first, then try again', 'stopped');
            } else {
                updateStatus('Error: ' + response.error, 'stopped');
            }
            return;
        }
        
        isRecording = true;
        setRecordingUI(true);
        recordingStartTime = Date.now();
        document.getElementById('recordingTimer')?.classList.remove('hidden');
        updateTimerDisplay();
        timerInterval = setInterval(updateTimerDisplay, 1000);
        updateStatus('Recording', 'recording');
        
        chrome.runtime.sendMessage({ type: 'SET_BADGE', color: '#ef4444', text: 'REC' });
        
    } catch (e) {
        console.error('[TabCapture] Start error:', e);
        updateStatus('Error: ' + e.message, 'stopped');
        setRecordingUI(false);
    }
}

async function stopRecording() {
    updateStatus('Stopping...', 'stopped');
    setWorkingUI(true);
    
    try {
        // Set up promise to wait for chunks from RECORDING_STOPPED message
        recordingStoppedPromise = new Promise(resolve => { recordingStoppedResolve = resolve; });
        const timeoutId = setTimeout(() => {
            if (recordingStoppedResolve) {
                recordingStoppedResolve(recordedChunks);
                recordingStoppedResolve = null;
                recordingStoppedPromise = null;
            }
        }, 5000);
        
        await chrome.runtime.sendMessage({ type: 'STOP_CAPTURE_TAB' });
        
        // Wait for chunks to arrive from content script
        recordedChunks = await recordingStoppedPromise;
        clearTimeout(timeoutId);
        
        isRecording = false;
        setRecordingUI(false);
        document.getElementById('recordingTimer')?.classList.add('hidden');
        
        if (recordedChunks.length > 0) {
            updateStatus('Processing audio...', 'stopped');
            await processAndAnalyze();
        } else {
            updateStatus('No audio captured - try again', 'stopped');
            showManualTranscribe();
        }
    } catch (e) {
        console.error('[TabCapture] Stop error:', e);
        updateStatus('Error: ' + e.message, 'stopped');
        setWorkingUI(false);
    }
}

async function processAndAnalyze() {
    updateStatus('Processing audio...', 'stopped');
    
    try {
        if (recordedChunks.length === 0) {
            updateStatus('No audio data captured', 'stopped');
            setWorkingUI(false);
            showManualTranscribe();
            return;
        }
        
        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        
        const audioBase64 = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        
        const base64Data = audioBase64.split(',')[1];
        const duration = recordingStartTime ? Math.floor((Date.now() - recordingStartTime) / 1000) : null;
        
        updateStatus('Transcribing...', 'stopped');
        
        const response = await fetch(`${SERVER_URL}/api/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                audio: base64Data,
                phone: null,
                client: DEFAULT_CLIENT,
                format: 'webm',
                duration: duration
            })
        });
        
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Server error' }));
            throw new Error(err.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            updateStatus('Transcription unavailable', 'stopped');
            showManualTranscribe(result.transcription || '');
            return;
        }
        
        displayResults(result);
        
        chrome.runtime.sendMessage({ type: 'SET_BADGE', color: '#22c55e', text: 'OK' });
        
    } catch (e) {
        console.error('[TabCapture] Error:', e);
        updateStatus('Transcription failed: ' + e.message, 'stopped');
        setWorkingUI(false);
        showManualTranscribe();
    }
}

function showManualTranscribe(existingText = '') {
    const existing = document.getElementById('manualTranscribeForm');
    if (existing) existing.remove();
    
    const container = document.createElement('div');
    container.id = 'manualTranscribeForm';
    container.style.cssText = 'margin-top:12px;padding:12px;background:var(--bg-light);border-radius:8px;border:1px solid var(--border);';
    container.innerHTML = `
        <p style="font-size:12px;margin-bottom:8px;color:var(--text-secondary);">Transcript:</p>
        <textarea id="manualTranscriptText" placeholder="Transcript will appear here after auto-analysis, or paste manually..." rows="5" style="width:100%;border-radius:6px;border:1px solid var(--border);padding:8px;font-size:13px;box-sizing:border-box;resize:vertical;background:var(--bg-white);color:var(--text-primary);">${existingText}</textarea>
        <button id="manualAnalyzeBtn" class="btn btn-primary" style="margin-top:8px;font-size:13px;padding:10px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            Analyze Manually
        </button>
    `;
    
    const btn = document.getElementById('startBtn');
    btn.parentNode.insertBefore(container, btn);
    
    document.getElementById('manualAnalyzeBtn').addEventListener('click', handleManualTranscribe);
}

async function handleManualTranscribe() {
    const textarea = document.getElementById('manualTranscriptText');
    if (!textarea) return;
    
    const transcript = textarea.value.trim();
    if (!transcript) {
        alert('Please enter a transcript');
        return;
    }
    
    updateStatus('Analyzing...', 'stopped');
    setWorkingUI(true);
    
    try {
        const response = await fetch(`${SERVER_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcription: transcript,
                phone: null,
                client: DEFAULT_CLIENT
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const analysis = await response.json();
        displayResults({ transcription: transcript, analysis });
        
    } catch (e) {
        updateStatus('Analysis failed: ' + e.message, 'stopped');
        setWorkingUI(false);
    }
}

function getScoreClass(score) {
    if (score === null || score === undefined) return 'warm';
    if (score >= 70) return 'hot';
    if (score >= 40) return 'warm';
    return 'cold';
}

function displayResults(result) {
    clearResults();
    setWorkingUI(false);
    
    const analysis = result.analysis || result;
    const transcription = result.transcription || '';
    const score = result.qualificationScore ?? analysis.qualification_score ?? analysis.qualification?.score ?? 0;
    const scoreClass = getScoreClass(score);
    const sentiment = result.sentiment || analysis.sentiment || analysis.qualification?.sentiment || 'neutral';
    const summary = result.summary || analysis.summary || analysis.qualification?.summary || '';
    const tags = result.tags || analysis.tags || analysis.qualification?.tags || [];
    const disposition = result.suggestedDisposition || analysis.suggested_disposition || analysis.qualification?.suggested_disposition || 'New';
    const notes = result.salesforceNotes || analysis.salesforce_notes || analysis.qualification?.salesforce_notes || '';
    const state = result.detectedState || analysis.detected_state || '';
    const insurance = result.detectedInsurance || analysis.detected_insurance || '';
    const soberDays = result.detectedSoberDays || analysis.detected_sober_days || null;
    const qaScore = result.qaScore ?? result.qa?.overall_qa_score ?? null;
    const qaData = result.qaData || result.qa || null;
    const source = result.source || 'tab_record';
    const callType = result.callType || analysis.call_type || '';
    const phone = result.phone || '';
    const timestamp = result.timestamp ? new Date(result.timestamp).toLocaleString() : new Date().toLocaleString();
    const client = result.client || DEFAULT_CLIENT;
    
    updateStatus('Analysis complete', 'stopped');
    
    const container = document.createElement('div');
    container.id = 'analysisResults';
    container.style.cssText = 'margin-top:12px;padding:0;background:var(--bg-light);border-radius:8px;overflow:hidden;border:1px solid var(--border);';
    
    const sourceLabel = source === 'dom_monitoring' ? 'Auto-Record' : 'Tab Record';
    
    container.innerHTML = `
        <div style="padding:12px 16px;background:var(--bg-hover);border-bottom:1px solid var(--border);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <span style="font-size:10px;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;">${sourceLabel}</span>
                <span style="font-size:11px;color:var(--text-muted);">${timestamp}</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span class="ats-score-badge ${scoreClass}" style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:20px;font-weight:700;${scoreClass === 'hot' ? 'background:#ef4444;' : scoreClass === 'warm' ? 'background:#f59e0b;' : 'background:#6b7280;'}color:white;min-width:48px;text-align:center;">${score}</span>
                    <div>
                        <div style="font-weight:600;font-size:14px;color:var(--text-primary);">${scoreClass === 'hot' ? 'Hot Lead' : scoreClass === 'warm' ? 'Warm Lead' : 'Cold Lead'}</div>
                        <div style="font-size:12px;color:var(--text-muted);">${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} sentiment</div>
                    </div>
                </div>
                ${qaScore !== null ? `<div style="text-align:right;">
                    <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">QA Score</div>
                    <div style="font-size:18px;font-weight:700;color:var(--accent);">${qaScore}</div>
                    ${qaData ? `<div style="font-size:10px;color:var(--text-muted);">${qaData.quality_grade || ''}</div>` : ''}
                </div>` : ''}
            </div>
        </div>
        
        <div style="padding:12px 16px;">
            ${phone ? `<div style="margin-bottom:10px;font-size:13px;color:var(--text-primary);">
                <span style="opacity:0.6;">Phone:</span> ${phone}
                ${callType ? `<span style="margin-left:12px;padding:2px 8px;background:rgba(49,130,206,0.12);border-radius:10px;font-size:11px;color:var(--accent);">${callType}</span>` : ''}
            </div>` : ''}
            
            ${tags.length ? `<div style="margin-bottom:10px;">
                <div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;">Tags</div>
                <div style="display:flex;flex-wrap:wrap;gap:4px;">
                    ${tags.map(tag => `<span style="padding:3px 8px;background:rgba(49,130,206,0.15);border-radius:12px;font-size:11px;color:var(--primary);">${tag}</span>`).join('')}
                </div>
            </div>` : ''}
            
            ${state || insurance || soberDays ? `<div style="margin-bottom:10px;">
                <div style="display:flex;gap:12px;font-size:13px;color:var(--text-secondary);">
                    ${state ? `<div><span style="opacity:0.6;">State:</span> ${state}</div>` : ''}
                    ${insurance ? `<div><span style="opacity:0.6;">Insurance:</span> ${insurance}</div>` : ''}
                    ${soberDays ? `<div><span style="opacity:0.6;">Sober:</span> ${soberDays} days</div>` : ''}
                </div>
            </div>` : ''}
            
            ${summary ? `<div style="margin-bottom:10px;">
                <div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;">Summary</div>
                <div style="font-size:13px;line-height:1.4;color:var(--text-primary);">${summary}</div>
            </div>` : ''}
            
            ${transcription ? `<div style="margin-bottom:10px;">
                <div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;">Transcript</div>
                <div style="font-size:12px;background:var(--bg-hover);padding:8px;border-radius:6px;max-height:120px;overflow-y:auto;line-height:1.4;white-space:pre-wrap;color:var(--text-primary);border:1px solid var(--border);">${transcription}</div>
            </div>` : ''}
            
            ${notes ? `<div style="margin-bottom:10px;">
                <div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;">Salesforce Notes</div>
                <div style="font-size:12px;background:rgba(49,130,206,0.08);padding:8px;border-radius:6px;line-height:1.4;color:var(--text-primary);border:1px solid rgba(49,130,206,0.2);">${notes}</div>
                <button class="btn-copy-notes" style="margin-top:6px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copy Notes
                </button>
            </div>` : ''}
            
            ${qaData ? `<div style="margin-bottom:10px;">
                <div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;">Call Quality</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
                    ${qaData.word_count != null ? `<div style="background:var(--bg-hover);padding:6px;border-radius:4px;"><span style="opacity:0.6;">Words:</span> ${qaData.word_count}</div>` : ''}
                    ${qaData.speech_rate_wpm != null ? `<div style="background:var(--bg-hover);padding:6px;border-radius:4px;"><span style="opacity:0.6;">Speech Rate:</span> ${qaData.speech_rate_wpm} wpm</div>` : ''}
                    ${qaData.silence_ratio != null ? `<div style="background:var(--bg-hover);padding:6px;border-radius:4px;"><span style="opacity:0.6;">Silence:</span> ${(qaData.silence_ratio * 100).toFixed(1)}%</div>` : ''}
                    ${qaData.completeness_score != null ? `<div style="background:var(--bg-hover);padding:6px;border-radius:4px;"><span style="opacity:0.6;">Completeness:</span> ${qaData.completeness_score}/5</div>` : ''}
                </div>
            </div>` : ''}
            
            <div style="display:flex;gap:6px;margin-top:8px;padding-top:10px;border-top:1px solid var(--border);">
                ${notes ? `<button class="btn-copy-notes" style="flex:1;background:var(--bg-light);border:1px solid var(--border);color:var(--primary);padding:7px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-family:inherit;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copy Notes
                </button>` : ''}
                <button class="btn-save-md" style="flex:1;background:var(--primary);color:white;border:none;padding:7px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-family:inherit;font-weight:600;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Save as Markdown
                </button>
            </div>
            
            <div style="font-size:12px;color:var(--text-muted);text-align:center;padding-top:8px;margin-top:4px;border-top:1px solid var(--border);">
                Disposition: ${disposition} | Client: ${client}
            </div>
        </div>
    `;
    
    const btnArea = document.getElementById('startBtn');
    btnArea.parentNode.insertBefore(container, btnArea);
    
    container.querySelector('.btn-copy-notes')?.addEventListener('click', () => {
        navigator.clipboard.writeText(notes).then(() => {
            const copyBtn = container.querySelector('.btn-copy-notes');
            if (copyBtn) {
                const orig = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = orig; }, 1500);
            }
        });
    });
    
    container.querySelector('.btn-save-md')?.addEventListener('click', () => {
        const markdown = generateMarkdown({
            phone, timestamp, score, scoreClass, sentiment, summary, tags, disposition,
            notes, state, insurance, soberDays, transcription, qaScore, qaData,
            source, callType, client
        });
        downloadMarkdown(markdown, phone, timestamp);
    });
    
    const transcriptBox = container.querySelector('[style*="white-space:pre-wrap"]');
    if (transcriptBox) {
        transcriptBox.scrollTop = 0;
    }
}

function generateMarkdown(data) {
    const {
        phone, timestamp, score, scoreClass, sentiment, summary, tags, disposition,
        notes, state, insurance, soberDays, transcription, qaScore, qaData,
        source, callType, client
    } = data;
    
    const leadLabel = scoreClass === 'hot' ? 'Hot Lead' : scoreClass === 'warm' ? 'Warm Lead' : 'Cold Lead';
    
    let md = `# Call Analysis Report\n\n`;
    md += `**Date:** ${timestamp}\n`;
    md += `**Source:** ${source === 'dom_monitoring' ? 'Auto-Record (CTM DOM)' : 'Tab Record'}\n`;
    md += `**Client:** ${client}\n\n`;
    
    md += `## Lead Qualification\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Score | **${score}** (${leadLabel}) |\n`;
    md += `| Sentiment | ${sentiment} |\n`;
    md += `| Disposition | ${disposition} |\n`;
    if (phone) md += `| Phone | ${phone} |\n`;
    if (callType) md += `| Call Type | ${callType} |\n`;
    if (state) md += `| State | ${state} |\n`;
    if (insurance) md += `| Insurance | ${insurance} |\n`;
    if (soberDays) md += `| Sober Days | ${soberDays} |\n`;
    md += `\n`;
    
    if (tags.length) {
        md += `## Tags\n\n`;
        md += tags.map(t => `- ${t}`).join('\n') + '\n\n';
    }
    
    if (summary) {
        md += `## Summary\n\n${summary}\n\n`;
    }
    
    if (transcription) {
        md += `## Transcript\n\n${transcription}\n\n`;
    }
    
    if (notes) {
        md += `## Salesforce Notes\n\n${notes}\n\n`;
    }
    
    if (qaData) {
        md += `## Call Quality Analysis\n\n`;
        md += `| Metric | Value |\n`;
        md += `|--------|-------|\n`;
        if (qaScore !== null) md += `| Overall QA Score | **${qaScore}**/100 |\n`;
        if (qaData.quality_grade) md += `| Quality Grade | ${qaData.quality_grade} |\n`;
        if (qaData.word_count != null) md += `| Word Count | ${qaData.word_count} |\n`;
        if (qaData.speech_rate_wpm != null) md += `| Speech Rate | ${qaData.speech_rate_wpm} wpm |\n`;
        if (qaData.silence_ratio != null) md += `| Silence Ratio | ${(qaData.silence_ratio * 100).toFixed(1)}% |\n`;
        if (qaData.completeness_score != null) md += `| Completeness | ${qaData.completeness_score}/5 |\n`;
        if (qaData.clarity_issues != null) md += `| Clarity Issues | ${qaData.clarity_issues} |\n`;
        md += `\n`;
    }
    
    md += `---\n*Generated by ATS Automation*\n`;
    return md;
}

function downloadMarkdown(markdown, phone, timestamp) {
    const date = new Date(timestamp).toISOString().slice(0, 10);
    const phoneSlug = phone ? `_${phone.replace(/[^0-9]/g, '')}` : '';
    const filename = `call_analysis_${date}${phoneSlug}.md`;
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    const saveBtn = document.querySelector('.btn-save-md');
    if (saveBtn) {
        const orig = saveBtn.textContent;
        saveBtn.textContent = 'Downloaded!';
        setTimeout(() => { saveBtn.textContent = orig; }, 2000);
    }
}

function updateStatus(message, type = 'stopped') {
    const statusEl = document.getElementById('status');
    const statusText = document.getElementById('statusText');
    const dot = statusEl?.querySelector('.status-dot');
    
    if (statusText) statusText.textContent = message;
    if (statusEl) statusEl.className = 'status ' + type;
    if (dot) {
        dot.classList.remove('working');
    }
}

async function checkRecordingStatus() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_CAPTURE_STATUS' });
        
        if (response && response.recording) {
            selectedTabId = response.tabId;
            isRecording = true;
            setRecordingUI(true);
            document.getElementById('recordingTimer')?.classList.remove('hidden');
            
            if (response.startTime) {
                recordingStartTime = response.startTime;
                updateTimerDisplay();
                timerInterval = setInterval(updateTimerDisplay, 1000);
            }
            
            updateStatus('Recording', 'recording');
        }
    } catch (e) {
        // Ignore
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const type = message.type || message.action;
    
    if (type === 'AUDIO_CHUNK') {
        if (message.chunk) {
            recordedChunks.push(message.chunk);
        }
        return false;
    }
    
    if (type === 'RECORDING_READY') {
        return false;
    }
    
    if (type === 'RECORDING_ERROR') {
        console.error('[TabCapture] Recording error:', message.error);
        isRecording = false;
        setRecordingUI(false);
        updateStatus('Recording failed: ' + message.error, 'stopped');
        chrome.runtime.sendMessage({ type: 'SET_BADGE', color: '#ef4444', text: 'ERR' });
        return false;
    }
    
    if (type === 'RECORDING_STOPPED') {
        recordedChunks = message.chunks || recordedChunks;
        if (recordingStoppedResolve) {
            recordingStoppedResolve(recordedChunks);
            recordingStoppedResolve = null;
            recordingStoppedPromise = null;
        }
        return false;
    }
    
    if (type === 'ANALYSIS_READY' || type === 'DOM_ANALYSIS_READY') {
        const result = message.result || message.payload || message;
        clearResults();
        setWorkingUI(false);
        displayResults(result);
        updateStatus('Analysis complete', 'stopped');
        chrome.runtime.sendMessage({ type: 'SET_BADGE', color: '#22c55e', text: 'OK' });
        return false;
    }
    
    return false;
});
