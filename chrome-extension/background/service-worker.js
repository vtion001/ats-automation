/**
 * ATS Automation - Background Service Worker
 * Handles tab audio capture, background recording, and analysis
 */

const AUDIO_STORAGE_KEY = 'ats_captured_audio';
const RECORDING_STATE_KEY = 'ats_recording_state';
const ANALYSIS_RESULT_KEY = 'ats_analysis_result';
const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
const LOCAL_LOG_URL = 'http://localhost:8765';
const DEFAULT_CLIENT = 'flyland';

let currentCapture = {
    tabId: null,
    mediaRecorder: null,
    stream: null,
    audioChunks: [],
    recording: false,
    startTime: null,
    injected: false,
    mimeType: null
};

let ctmMonitorState = {
    state: 'unknown',
    phone: null,
    initialized: false,
    lastUpdate: null
};

function getMessageType(message) {
    return message.type || message.action;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const msgType = getMessageType(message);
    console.log('[BG] Message received:', msgType, 'from tab:', sender.tab?.id);
    
    switch (msgType) {
        case 'START_TAB_CAPTURE':
            handleStartCaptureMessage(message, sendResponse);
            return true;
            
        case 'STOP_TAB_CAPTURE':
            handleStopCaptureMessage(message, sendResponse);
            return true;
            
        case 'GET_CAPTURE_STATUS':
            sendResponse({ recording: currentCapture.recording, tabId: currentCapture.tabId, startTime: currentCapture.startTime });
            return true;
            
        case 'GET_CAPTURED_AUDIO':
            getCapturedAudio(sendResponse);
            return true;
            
        case 'CLEAR_CAPTURED_AUDIO':
            clearCapturedAudio();
            sendResponse({ success: true });
            return true;
            
        case 'SET_BADGE':
            handleSetBadge(message.color, message.text);
            sendResponse({ success: true });
            return true;
            
        case 'CALL_DETECTED':
            chrome.runtime.sendMessage({
                type: 'CALL_DETECTED',
                payload: message.payload
            }).catch(() => {});
            // Log call event to markdown
            logCallEvent({
                phone: message.payload?.phone || null,
                direction: message.payload?.direction || 'inbound',
                client: DEFAULT_CLIENT,
                event: message.payload?.event || 'call_detected',
                callerName: message.payload?.callerName || null
            });
            sendResponse({ success: true });
            return true;

        case 'SHOW_CALL_ANALYSIS':
            if (sender.tab?.id) {
                chrome.tabs.sendMessage(sender.tab.id, {
                    type: 'SHOW_CALL_ANALYSIS',
                    payload: message.payload
                }).catch(err => {
                    console.error('[BG] Failed to forward SHOW_CALL_ANALYSIS to tab:', err);
                });
            }
            if (message.payload) {
                logToMarkdown({
                    ...message.payload,
                    client: message.payload.client || DEFAULT_CLIENT
                });
            }
            sendResponse({ success: true });
            return;
        
        case 'REQUEST_TAB_CAPTURE':
            handleRequestTabCapture(message.tabId, sendResponse);
            return true;
        
        case 'START_CAPTURE_TAB':
            handleStartCaptureTab(message.tabId, sendResponse);
            return true;
        
        case 'STOP_CAPTURE_TAB':
            handleStopCaptureTab(sendResponse);
            return true;
        
        case 'AUDIO_CHUNK':
            if (message.chunk) {
                currentCapture.audioChunks.push(message.chunk);
            }
            sendResponse({ received: true });
            return true;
        
        case 'RECORDING_READY':
            sendResponse({ success: true });
            return true;
        
        case 'RECORDING_ERROR':
            currentCapture.recording = false;
            updateRecordingState(false);
            console.error('[BG] Recording error from content script:', message.error);
            showNotification('Recording Failed', message.error || 'Unknown error');
            sendResponse({ success: true });
            return true;
        
        case 'RECORDING_STOPPED':
            handleRecordingStopped(message.chunks || []);
            sendResponse({ success: true });
            return true;
        
        case 'SHOW_CALL_IN_PROGRESS':
            forwardToOverlay({ type: 'SHOW_CALL_IN_PROGRESS', payload: message.payload }, sender, sendResponse);
            return true;
        
        case 'HIDE_CALL_OVERLAY':
            forwardToOverlay({ type: 'HIDE_CALL_OVERLAY' }, sender, sendResponse);
            return true;
        
        case 'CAPTURE_STARTED':
            currentCapture.recording = true;
            currentCapture.startTime = Date.now();
            currentCapture.mimeType = message.mimeType || 'audio/webm';
            updateRecordingState(true);
            setBadge('#ef4444', 'REC');
            console.log('[BG] Recording started (background)');
            sendResponse({ success: true });
            return true;
        
        case 'CAPTURE_STOPPED':
            console.log('[BG] Capture stopped from content script, chunks:', message.chunks?.length || 0);
            if (message.chunks?.length > 0) {
                currentCapture.audioChunks = message.chunks;
            }
            handleRecordingStopped(currentCapture.audioChunks);
            sendResponse({ success: true });
            return true;
        
        case 'GET_ANALYSIS_RESULT':
            getAnalysisResult(sendResponse);
            return true;
        
        case 'CLEAR_ANALYSIS_RESULT':
            clearAnalysisResult();
            sendResponse({ success: true });
            return true;

        case 'DOM_ANALYSIS_READY':
            storeAnalysisResult(message.payload || message);
            try {
                chrome.runtime.sendMessage({
                    type: 'ANALYSIS_READY',
                    result: message.payload || message
                });
            } catch(e) {}
            sendResponse({ success: true });
            return true;

        case 'CTM_MONITOR_STATE':
            ctmMonitorState = {
                state: message.payload?.state || 'unknown',
                phone: message.payload?.phone || null,
                initialized: true,
                lastUpdate: Date.now()
            };
            sendResponse({ success: true });
            return true;

        case 'GET_CTM_MONITOR_STATE':
            sendResponse({ 
                state: ctmMonitorState.state,
                phone: ctmMonitorState.phone,
                initialized: ctmMonitorState.initialized
            });
            return true;
        
        case 'PING':
            sendResponse({ pong: true });
            return true;
        
        case 'SAVE_CALL_FILES':
            handleSaveCallFiles(message.payload);
            sendResponse({ success: true });
            return true;
        
        default:
            sendResponse({ error: 'Unknown message type' });
            return true;
    }
});

async function handleRequestTabCapture(tabId, sendResponse) {
    // handleRequestTabCapture is no longer used for recording
    // ctm-monitor.js now calls getDisplayMedia directly
    // This function kept for backwards compatibility
    sendResponse({ success: true, message: 'Use getDisplayMedia in content script' });
}

async function handleStartCaptureTab(tabId, sendResponse) {
    try {
        if (currentCapture.recording) {
            await stopCaptureInternal();
        }
        
        if (!tabId) {
            sendResponse({ error: 'No tab ID provided' });
            return;
        }
        
        if (!chrome.scripting) {
            sendResponse({ error: 'Scripting API not available' });
            return;
        }
        
        currentCapture = {
            tabId: tabId,
            mediaRecorder: null,
            stream: null,
            audioChunks: [],
            recording: false,
            startTime: null,
            injected: false,
            mimeType: null
        };
        
        console.log('[BG] Starting getDisplayMedia capture for tab', tabId);
        
        // Inject a script that calls getDisplayMedia in the target tab
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            world: 'ISOLATED',
            func: (targetTabId) => {
                if (window.__atsRecorder) return { error: 'already_recording' };
                window.__atsRecorder = true;
                
                const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : 'audio/webm';
                
                navigator.mediaDevices.getDisplayMedia({
                    audio: true,
                    video: false
                }).then((stream) => {
                    const chunks = [];
                    const recorder = new MediaRecorder(stream, { mimeType });
                    
                    recorder.ondataavailable = (e) => {
                        if (e.data && e.data.size > 0) {
                            chunks.push(e.data);
                            chrome.runtime.sendMessage({ type: 'AUDIO_CHUNK', chunk: e.data }).catch(() => {});
                        }
                    };
                    
                    recorder.onerror = (e) => {
                        chrome.runtime.sendMessage({ type: 'RECORDING_ERROR', error: String(e.error) }).catch(() => {});
                    };
                    
                    recorder.start(1000);
                    window.__atsRecorderChunks = chunks;
                    window.__atsRecorderStream = stream;
                    window.__atsRecorder = recorder;
                    
                    // Show indicator
                    const el = document.createElement('div');
                    el.id = 'ats-recording-indicator';
                    el.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;background:#ef4444;color:white;padding:6px 12px;border-radius:20px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:12px;font-weight:600;box-shadow:0 2px 8px rgba(239,68,68,0.4);pointer-events:none;';
                    el.innerHTML = '<span style="width:8px;height:8px;background:white;border-radius:50%;display:inline-block;animation:pulse 1s infinite"></span> ATS Recording';
                    const st = document.createElement('style');
                    st.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}';
                    document.head.appendChild(st);
                    document.body.appendChild(el);
                    window.__atsRecorderEl = el;
                    
                    chrome.runtime.sendMessage({ type: 'CAPTURE_STARTED', mimeType }).catch(() => {});
                }).catch((err) => {
                    window.__atsRecorder = null;
                    chrome.runtime.sendMessage({ type: 'RECORDING_ERROR', error: err.message }).catch(() => {});
                });
                
                return { success: true };
            },
            args: [tabId]
        });
        
        if (!results || results.length === 0) {
            sendResponse({ error: 'Failed to inject capture script' });
            return;
        }
        
        if (results[0]?.error === 'already_recording') {
            sendResponse({ error: 'Already recording in this tab' });
            return;
        }
        
        currentCapture.recording = true;
        currentCapture.startTime = Date.now();
        
        updateRecordingState(true);
        setBadge('#ef4444', 'REC');
        console.log('[BG] Capture started for tab', tabId);
        
        sendResponse({ success: true, tabId: tabId, startTime: currentCapture.startTime });
        
    } catch (e) {
        console.error('[BG] Start capture error:', e);
        const errMsg = e.message || String(e);
        sendResponse({ error: errMsg });
    }
}

async function handleStopCaptureTab(sendResponse) {
    try {
        const tabId = currentCapture.tabId;
        
        // Stop the stream tracks from the service worker side
        if (currentCapture.stream) {
            currentCapture.stream.getTracks().forEach(t => t.stop());
            currentCapture.stream = null;
        }
        
        // Try to inject a stop function to clean up the tab's MediaRecorder and indicator
        if (tabId && currentCapture.injected) {
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    world: 'ISOLATED',
                    func: () => {
                        if (window.__atsRecorder && window.__atsRecorder.state !== 'inactive') {
                            window.__atsRecorder.stop();
                        }
                        if (window.__atsRecorderEl) {
                            window.__atsRecorderEl.remove();
                            window.__atsRecorderEl = null;
                        }
                        window.__atsRecorder = null;
                    }
                });
            } catch (e) {
                console.log('[BG] Could not inject stop script:', e.message);
            }
        }
        
        currentCapture.recording = false;
        updateRecordingState(false);
        
        setBadge('#22c55e', 'OK');
        console.log('[BG] Capture stopped, chunks:', currentCapture.audioChunks.length);
        
        const chunks = currentCapture.audioChunks;
        currentCapture.audioChunks = [];
        
        sendResponse({ success: true, chunks: chunks });
        
    } catch (e) {
        console.error('[BG] Stop capture error:', e);
        sendResponse({ error: e.message, chunks: [] });
    }
}

async function handleRecordingStopped(chunks) {
    if (chunks.length > 0) {
        currentCapture.audioChunks = chunks;
    }
    
    currentCapture.recording = false;
    updateRecordingState(false);
    setBadge('#22c55e', 'DONE');
    
    const allChunks = currentCapture.audioChunks;
    const startTime = currentCapture.startTime;
    
    currentCapture.audioChunks = [];
    currentCapture.startTime = null;
    
    if (allChunks.length === 0) {
        console.log('[BG] No chunks to process');
        showNotification('Recording Complete', 'No audio captured');
        return;
    }
    
    console.log('[BG] Processing', allChunks.length, 'chunks in background...');
    showNotification('Recording Complete', 'Processing audio...');
    
    try {
        const result = await processAudioInBackground(allChunks, startTime);
        
        if (result) {
            await storeAnalysisResult(result);
            
            // Log to markdown file on desktop (via local relay server)
            const analysisData = {
                ...result.analysis,
                phone: null,
                client: DEFAULT_CLIENT,
                direction: 'inbound',
                duration: result.duration,
                transcription: result.transcription
            };
            logToMarkdown(analysisData);
            
            showNotification('Analysis Ready', `Score: ${result.analysis?.qualification_score ?? 'N/A'}`);
            
            // Notify popup if open
            try {
                chrome.runtime.sendMessage({
                    type: 'ANALYSIS_READY',
                    result: result
                });
            } catch (e) {
                // Popup might be closed, that's fine
            }
        }
    } catch (e) {
        console.error('[BG] Background processing error:', e);
        showNotification('Analysis Failed', e.message);
    }
}

async function processAudioInBackground(chunks, startTime) {
    if (chunks.length === 0) return null;
    
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const reader = new FileReader();
    
    const audioBase64 = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
    
    const base64Data = audioBase64.split(',')[1];
    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : null;
    
    // Transcribe
    const transcribeRes = await fetch(`${SERVER_URL}/api/transcribe`, {
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
    
    if (!transcribeRes.ok) {
        const err = await transcribeRes.json().catch(() => ({ error: 'Server error' }));
        throw new Error(err.error || `HTTP ${transcribeRes.status}`);
    }
    
    const transcribeResult = await transcribeRes.json();
    
    if (transcribeResult.error) {
        throw new Error(transcribeResult.error);
    }
    
    return {
        transcription: transcribeResult.transcription || '',
        analysis: transcribeResult.analysis || transcribeResult,
        duration: duration,
        timestamp: Date.now()
    };
}

async function storeAnalysisResult(result) {
    await chrome.storage.local.set({
        [ANALYSIS_RESULT_KEY]: {
            ...result,
            storedAt: Date.now()
        }
    });
}

async function getAnalysisResult(sendResponse) {
    try {
        const result = await chrome.storage.local.get(ANALYSIS_RESULT_KEY);
        const data = result[ANALYSIS_RESULT_KEY];
        
        if (data) {
            sendResponse({ success: true, result: data });
        } else {
            sendResponse({ success: false, error: 'No analysis result' });
        }
    } catch (e) {
        sendResponse({ success: false, error: e.message });
    }
}

async function clearAnalysisResult() {
    await chrome.storage.local.remove(ANALYSIS_RESULT_KEY);
}

// ============ Local Log Server ============

async function logToMarkdown(data) {
    try {
        await fetch(`${LOCAL_LOG_URL}/api/analysis-result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(3000)
        });
    } catch (e) {
        console.log('[BG] Markdown log failed (server may not be running):', e.message);
    }
}

async function logCallEvent(data) {
    try {
        await fetch(`${LOCAL_LOG_URL}/api/call-event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(3000)
        });
    } catch (e) {
        console.log('[BG] Call event log failed:', e.message);
    }
}

async function updateRecordingState(isRecording) {
    await chrome.storage.local.set({
        [RECORDING_STATE_KEY]: {
            recording: isRecording,
            startTime: isRecording ? Date.now() : null,
            updatedAt: Date.now()
        }
    });
}

function showNotification(title, body) {
    try {
        chrome.notifications?.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'ATS Automation',
            message: `${title}\n${body}`
        });
    } catch (e) {
        console.log('[BG] Notification error:', e);
    }
}

async function stopCaptureInternal() {
    if (currentCapture.stream) {
        currentCapture.stream.getTracks().forEach(track => track.stop());
    }
    
    currentCapture.recording = false;
    currentCapture.stream = null;
    currentCapture.mediaRecorder = null;
    updateRecordingState(false);
}

async function handleStartCaptureMessage(message, sendResponse) {
    sendResponse({ error: 'Use START_CAPTURE_TAB instead' });
}

async function handleStopCaptureMessage(message, sendResponse) {
    sendResponse({ error: 'Use STOP_CAPTURE_TAB instead' });
}

async function getCapturedAudio(sendResponse) {
    try {
        const result = await chrome.storage.local.get(AUDIO_STORAGE_KEY);
        const audioData = result[AUDIO_STORAGE_KEY];
        
        if (audioData && audioData.data) {
            sendResponse({
                success: true,
                audio: audioData.data,
                mimeType: audioData.mimeType,
                tabId: audioData.tabId,
                startTime: audioData.startTime,
                duration: audioData.duration,
                timestamp: audioData.timestamp
            });
        } else {
            sendResponse({ success: false, error: 'No audio captured' });
        }
    } catch (e) {
        sendResponse({ success: false, error: e.message });
    }
}

async function clearCapturedAudio() {
    await chrome.storage.local.remove(AUDIO_STORAGE_KEY);
}

function setBadge(color, text) {
    try {
        chrome.action.setBadgeBackgroundColor({ color: color });
        chrome.action.setBadgeText({ text: text });
    } catch (e) {
        console.log('[BG] Badge error:', e);
    }
}

function handleSetBadge(color, text) {
    setBadge(color, text);
}

function updateStatus(msg) {
    console.log('[BG]', msg);
}

async function forwardToOverlay(message, sender, sendResponse) {
    try {
        if (sender.tab?.id) {
            await chrome.tabs.sendMessage(sender.tab.id, message);
        } else {
            const tabs = await chrome.tabs.query({ url: '*://*.calltrackingmetrics.com/*' });
            for (const tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, message);
                } catch (e) {
                    // Tab might not have overlay loaded
                }
            }
        }
    } catch (e) {
        console.log('[BG] Forward to overlay error:', e.message);
    }
    sendResponse({ success: true });
}

// Restore recording state on startup
async function handleSaveCallFiles(payload) {
    if (!payload) return;
    
    const { phone, callerName, audioBase64, transcription, analysis, duration, timestamp, client } = payload;
    
    const date = new Date(timestamp || Date.now());
    const dateStr = date.toISOString().slice(0, 10);
    const timeStr = date.toISOString().slice(11, 19).replace(/:/g, '-');
    const phoneSlug = phone ? `_${phone.replace(/[^0-9]/g, '')}` : '';
    const safeName = callerName ? `_${callerName.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    const prefix = `${dateStr}_${timeStr}${safeName}${phoneSlug}`;
    
    const analysis_ = analysis || {};
    
    // Save audio recording using data URL (blob URLs can become invalid in SW)
    if (audioBase64) {
        try {
            const dataUrl = `data:audio/webm;base64,${audioBase64}`;
            
            await new Promise((resolve, reject) => {
                chrome.downloads.download({
                    url: dataUrl,
                    filename: `ATS_Recordings/${prefix}.webm`,
                    saveAs: false
                }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(downloadId);
                    }
                });
            });
            console.log('[BG] Recording saved to Downloads/ATS_Recordings/');
        } catch(e) {
            console.log('[BG] Could not save audio:', e.message);
        }
    }
    
    // Save transcript + analysis as markdown
    try {
        const md = generateCallMarkdown({ phone, callerName, transcription, analysis: analysis_, duration, timestamp, client, prefix });
        const dataUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent(md)}`;
        
        await new Promise((resolve, reject) => {
            chrome.downloads.download({
                url: dataUrl,
                filename: `ATS_Recordings/${prefix}_analysis.md`,
                saveAs: false
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(downloadId);
                }
            });
        });
        console.log('[BG] Analysis saved to Downloads/ATS_Recordings/');
    } catch(e) {
        console.log('[BG] Could not save analysis:', e.message);
    }
}

function generateCallMarkdown({ phone, callerName, transcription, analysis, duration, timestamp, client, prefix }) {
    const date = timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString();
    const a = analysis || {};
    const score = a.qualification_score ?? 0;
    const scoreClass = score >= 70 ? 'Hot Lead' : score >= 40 ? 'Warm Lead' : 'Cold Lead';
    
    let md = `# Call Analysis — ${date}\n\n`;
    md += `| Field | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Phone | ${phone || 'N/A'} |\n`;
    md += `| Caller | ${callerName || 'Unknown'} |\n`;
    md += `| Client | ${client || 'N/A'} |\n`;
    md += `| Date | ${date} |\n`;
    md += `| Duration | ${duration ? `${duration}s` : 'N/A'} |\n\n`;
    
    md += `## Lead Qualification\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Score | **${score}** (${scoreClass}) |\n`;
    md += `| Sentiment | ${a.sentiment || 'N/A'} |\n`;
    md += `| Disposition | ${a.suggested_disposition || 'N/A'} |\n`;
    md += `| State | ${a.detected_state || 'N/A'} |\n`;
    md += `| Insurance | ${a.detected_insurance || 'N/A'} |\n`;
    md += `| Call Type | ${a.call_type || 'N/A'} |\n`;
    
    if (a.tags && a.tags.length > 0) {
        md += `\n## Tags\n\n`;
        md += a.tags.map(t => `- ${t}`).join('\n') + '\n';
    }
    
    if (a.summary) {
        md += `\n## Summary\n\n${a.summary}\n`;
    }
    
    if (transcription) {
        md += `\n## Transcript\n\n${transcription}\n`;
    }
    
    if (a.salesforce_notes) {
        md += `\n## Salesforce Notes\n\n${a.salesforce_notes}\n`;
    }
    
    if (a.scoring_breakdown) {
        md += `\n## Scoring Breakdown\n\n`;
        for (const [key, val] of Object.entries(a.scoring_breakdown)) {
            md += `- **${key}**: ${val}\n`;
        }
    }
    
    md += `\n---\n*Generated by ATS Automation*\n`;
    return md;
}

async function restoreState() {
    try {
        const state = await chrome.storage.local.get(RECORDING_STATE_KEY);
        if (state[RECORDING_STATE_KEY]?.recording) {
            // Previous session was recording but didn't clean up
            await chrome.storage.local.set({
                [RECORDING_STATE_KEY]: {
                    recording: false,
                    startTime: null,
                    updatedAt: Date.now()
                }
            });
        }
    } catch (e) {
        console.log('[BG] State restore:', e);
    }
}

restoreState();
console.log('[BG] ATS Background Service Worker loaded');
