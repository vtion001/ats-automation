/**
 * ATS Automation - Background Service Worker
 * Handles tab audio capture, background recording, analysis, and CTM call monitoring
 */

const AUDIO_STORAGE_KEY = 'ats_captured_audio';
const RECORDING_STATE_KEY = 'ats_recording_state';
const ANALYSIS_RESULT_KEY = 'ats_analysis_result';
const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
const LOCAL_LOG_URL = 'http://localhost:8765';
const DEFAULT_CLIENT = 'flyland';
const ACTIVE_CALL_POLL_INTERVAL = 3000;

// Background CTM Call Monitoring State
let bgCallMonitor = {
    active: false,
    polling: false,
    currentCallId: null,
    callPhone: null,
    auth: {
        loggedIn: false,
        agentId: null,
        agentName: null,
        email: null
    }
};

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
            return true;
        
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
        
        case 'STREAM_READY':
            if (message.hasAudio) {
                currentCapture.hasAudio = true;
            }
            sendResponse({ success: true });
            return true;

        case 'RECORDING_ERROR':
            currentCapture.recording = false;
            updateRecordingState(false);
            setBadge('#ef4444', 'ERR');
            console.error('[BG] Recording error from content script:', message.error);
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
        
        // ============ Background Call Monitoring ============
        
        case 'BG_LOGIN':
            handleBackgroundLogin(message.email, sendResponse);
            return true;
        
        case 'BG_LOGOUT':
            handleBackgroundLogout(sendResponse);
            return true;
        
        case 'BG_GET_STATUS':
            sendResponse({
                loggedIn: bgCallMonitor.auth.loggedIn,
                agentName: bgCallMonitor.auth.agentName,
                email: bgCallMonitor.auth.email,
                monitoring: bgCallMonitor.active
            });
            return true;
        
        case 'BG_CALL_ENDED':
            handleBackgroundCallEnded(message.callId, message.phone, message.client || DEFAULT_CLIENT, sendResponse);
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
                // Guard: prevent double-injection
                if (window.__atsRecorder === 'starting') return { error: 'startup_in_progress' };
                if (window.__atsRecorder && typeof window.__atsRecorder.stop === 'function') return { error: 'already_recording' };
                
                // Return a Promise so executeScript waits for getDisplayMedia to actually succeed or fail
                return new Promise((resolve) => {
                    window.__atsRecorder = 'starting';
                    
                    function cleanup() {
                        if (window.__atsStream) {
                            window.__atsStream.getTracks().forEach(t => { try { t.stop(); } catch(e) {} });
                            window.__atsStream = null;
                        }
                        window.__atsRecorder = null;
                    }
                    
                    function fail(msg) {
                        cleanup();
                        chrome.runtime.sendMessage({ type: 'RECORDING_ERROR', error: msg }).catch(() => {});
                        resolve({ error: msg });
                    }
                    
                    function startRecording(stream) {
                        const audioTracks = stream.getAudioTracks();
                        console.log('[INJECTED] Audio tracks:', audioTracks.length, 'readyState:', audioTracks[0]?.readyState);
                        console.log('[INJECTED] Track settings:', JSON.stringify(audioTracks[0]?.getSettings?.() || audioTracks[0]?.label || 'none'));
                        
                        if (audioTracks.length === 0) { fail('No audio track in stream'); return; }
                        if (audioTracks[0].readyState === 'ended') { fail('Audio track already ended'); return; }
                        
                        window.__atsStream = stream;
                        
                        const mimeTypes = [
                            'audio/webm;codecs=opus',
                            'audio/webm',
                            'audio/ogg;codecs=opus',
                            'audio/mp4'
                        ];
                        const supported = mimeTypes.filter(t => MediaRecorder.isTypeSupported(t));
                        console.log('[INJECTED] Supported:', supported.join(', ') || 'none');
                        
                        let recorder = null;
                        for (const mimeType of supported) {
                            try { recorder = new MediaRecorder(stream, { mimeType }); break; } catch(e) {}
                        }
                        if (!recorder) {
                            try { recorder = new MediaRecorder(stream); }
                            catch(e) { fail('MediaRecorder not supported'); return; }
                        }
                        
                        const chunks = [];
                        recorder.ondataavailable = (e) => {
                            if (e.data && e.data.size > 0) {
                                chunks.push(e.data);
                                chrome.runtime.sendMessage({ type: 'AUDIO_CHUNK', chunk: e.data }).catch(() => {});
                            }
                        };
                        recorder.onerror = (e) => fail('Recorder error: ' + e.error);
                        
                        try { recorder.start(1000); }
                        catch(e) { fail('start() failed: ' + e.message); return; }
                        
                        window.__atsRecorderChunks = chunks;
                        window.__atsRecorder = recorder;
                        
                        // Show indicator
                        try {
                            const el = document.createElement('div');
                            el.id = 'ats-recording-indicator';
                            el.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;background:#ef4444;color:white;padding:6px 12px;border-radius:20px;font-family:-apple-system,sans-serif;font-size:12px;font-weight:600;';
                            el.textContent = '● ATS Recording';
                            document.body.appendChild(el);
                            window.__atsRecorderEl = el;
                        } catch(e) {}
                        
                        chrome.runtime.sendMessage({ type: 'STREAM_READY', hasAudio: true }).catch(() => {});
                        chrome.runtime.sendMessage({ type: 'CAPTURE_STARTED', mimeType: recorder.mimeType }).catch(() => {});
                        resolve({ success: true, mimeType: recorder.mimeType });
                    }
                    
                    // Wait for CAPTURE_STARTED (success) or RECORDING_ERROR (failure), with timeout
                    let resolved = false;
                    const timeout = setTimeout(() => {
                        if (!resolved) { resolved = true; fail('Capture timeout'); }
                    }, 15000);
                    
                    const listener = (msg) => {
                        if (msg.type === 'CAPTURE_STARTED') {
                            if (resolved) return;
                            resolved = true;
                            clearTimeout(timeout);
                            chrome.runtime.onMessage.removeListener(listener);
                        }
                        if (msg.type === 'RECORDING_ERROR') {
                            if (resolved) return;
                            resolved = true;
                            clearTimeout(timeout);
                            chrome.runtime.onMessage.removeListener(listener);
                        }
                    };
                    chrome.runtime.onMessage.addListener(listener);
                    
                    navigator.mediaDevices.getDisplayMedia({
                        audio: true,
                        video: false,
                        selfBrowserSurface: 'include',
                        systemAudio: 'include'
                    }).then(startRecording).catch((err) => {
                        if (resolved) return;
                        navigator.mediaDevices.getDisplayMedia({
                            audio: true,
                            video: false,
                            selfBrowserSurface: 'include'
                        }).then(startRecording).catch((err2) => {
                            if (resolved) return;
                            resolved = true;
                            clearTimeout(timeout);
                            chrome.runtime.onMessage.removeListener(listener);
                            fail(err2.message || err.message || 'Capture not supported');
                        });
                    });
                });
            },
            args: [tabId]
        });
        
        if (!results || results.length === 0) {
            sendResponse({ error: 'Failed to inject capture script' });
            return;
        }
        
        const resultError = results[0]?.error;
        if (resultError === 'already_recording' || resultError === 'startup_in_progress') {
            sendResponse({ error: 'Already starting a recording in this tab' });
            return;
        }
        if (resultError) {
            sendResponse({ error: resultError });
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
        
        // Always inject cleanup script — stream lives in the tab's window, not in SW
        if (tabId) {
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    world: 'ISOLATED',
                    func: () => {
                        // Stop all stream tracks
                        if (window.__atsStream) {
                            window.__atsStream.getTracks().forEach(t => t.stop());
                            window.__atsStream = null;
                        }
                        // Stop MediaRecorder if still active
                        if (window.__atsRecorder) {
                            try {
                                if (window.__atsRecorder.state !== 'inactive') {
                                    window.__atsRecorder.stop();
                                }
                            } catch(e) {}
                            window.__atsRecorder = null;
                        }
                        // Remove indicator
                        if (window.__atsRecorderEl) {
                            window.__atsRecorderEl.remove();
                            window.__atsRecorderEl = null;
                        }
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
            iconUrl: chrome.runtime.getURL('icons/icon48.png'),
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

async function getActiveTabId() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        return tabs[0]?.id ?? null;
    } catch(e) { return null; }
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
    
    // Save audio recording
    if (audioBase64) {
        try {
            const approxBytes = (audioBase64.length * 3) / 4;
            
            // For large audio (>500KB base64 ≈ ~400KB actual), create blob URL in tab
            // Data URLs have size limits in downloads API
            if (approxBytes > 512 * 1024) {
                const tabId = await getActiveTabId();
                if (tabId) {
                    const [blobUrl] = await chrome.scripting.executeScript({
                        target: { tabId },
                        world: 'ISOLATED',
                        func: (b64) => {
                            try {
                                const binary = atob(b64);
                                const bytes = new Uint8Array(binary.length);
                                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                                const blob = new Blob([bytes], { type: 'audio/webm' });
                                return URL.createObjectURL(blob);
                            } catch(e) { return null; }
                        },
                        args: [audioBase64]
                    });
                    if (blobUrl) {
                        await new Promise(r => chrome.downloads.download(
                            { url: blobUrl, filename: `ATS_Recordings/${prefix}.webm`, saveAs: false }, r));
                        console.log('[BG] Recording saved (blob URL)');
                    }
                }
            } else {
                const dataUrl = `data:audio/webm;base64,${audioBase64}`;
                await new Promise((resolve, reject) => {
                    chrome.downloads.download(
                        { url: dataUrl, filename: `ATS_Recordings/${prefix}.webm`, saveAs: false },
                        (id) => resolve(id));
                });
                console.log('[BG] Recording saved (data URL)');
            }
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
        
        // Restore CTM monitoring state
        const authState = await chrome.storage.local.get(['auth_email', 'auth_agentId', 'auth_agentName', 'auth_loggedIn']);
        if (authState.auth_loggedIn && authState.auth_agentId) {
            bgCallMonitor.auth = {
                loggedIn: true,
                agentId: authState.auth_agentId,
                agentName: authState.auth_agentName || '',
                email: authState.auth_email || ''
            };
            startBackgroundCallMonitoring();
        }
    } catch (e) {
        console.log('[BG] State restore:', e);
    }
}

// ============ Background CTM Call Monitoring ============

async function handleBackgroundLogin(email, sendResponse) {
    try {
        // Look up user by email via server
        const resp = await fetch(`${SERVER_URL}/api/ctm/user/by-email/${encodeURIComponent(email)}`);
        if (!resp.ok) {
            sendResponse({ success: false, error: 'Failed to lookup user' });
            return;
        }
        
        const data = await resp.json();
        if (!data.found) {
            sendResponse({ success: false, error: 'User not found' });
            return;
        }
        
        bgCallMonitor.auth = {
            loggedIn: true,
            agentId: data.agent_id,
            agentName: data.name,
            email: data.email
        };
        
        // Save to storage for persistence
        await chrome.storage.local.set({
            auth_email: data.email,
            auth_agentId: data.agent_id,
            auth_agentName: data.name,
            auth_loggedIn: true
        });
        
        // Start monitoring
        startBackgroundCallMonitoring();
        
        console.log('[BG] Logged in as:', data.name, data.agent_id);
        sendResponse({ success: true, agentId: data.agent_id, agentName: data.name });
        
    } catch (e) {
        console.error('[BG] Login error:', e);
        sendResponse({ success: false, error: e.message });
    }
}

async function handleBackgroundLogout(sendResponse) {
    bgCallMonitor.active = false;
    bgCallMonitor.polling = false;
    bgCallMonitor.currentCallId = null;
    bgCallMonitor.callPhone = null;
    
    bgCallMonitor.auth = {
        loggedIn: false,
        agentId: null,
        agentName: null,
        email: null
    };
    
    await chrome.storage.local.set({
        auth_email: null,
        auth_agentId: null,
        auth_agentName: null,
        auth_loggedIn: false
    });
    
    console.log('[BG] Logged out, monitoring stopped');
    sendResponse({ success: true });
}

function startBackgroundCallMonitoring() {
    if (bgCallMonitor.polling) return;
    if (!bgCallMonitor.auth.loggedIn || !bgCallMonitor.auth.agentId) return;
    
    console.log('[BG] Starting background call monitoring for agent:', bgCallMonitor.auth.agentId);
    bgCallMonitor.active = true;
    bgCallMonitor.polling = true;
    
    pollForActiveCalls();
}

function stopBackgroundCallMonitoring() {
    console.log('[BG] Stopping background call monitoring');
    bgCallMonitor.active = false;
    bgCallMonitor.polling = false;
    bgCallMonitor.currentCallId = null;
    bgCallMonitor.callPhone = null;
}

async function pollForActiveCalls() {
    if (!bgCallMonitor.active || !bgCallMonitor.polling) return;
    if (!bgCallMonitor.auth.agentId) return;
    
    try {
        const resp = await fetch(`${SERVER_URL}/api/ctm/active-calls/by-agent/${encodeURIComponent(bgCallMonitor.auth.agentId)}`);
        const calls = resp.ok ? await resp.json() : [];
        
        if (calls && calls.length > 0) {
            const call = calls[0];
            
            if (call.call_id !== bgCallMonitor.currentCallId) {
                console.log('[BG] New active call detected:', call.call_id, call.phone);
                bgCallMonitor.currentCallId = call.call_id;
                bgCallMonitor.callPhone = call.phone;
                
                // Notify popup if open
                notifyPopup({ type: 'CALL_STARTED', phone: call.phone, callId: call.call_id });
            }
        } else {
            if (bgCallMonitor.currentCallId && bgCallMonitor.callPhone) {
                console.log('[BG] Call ended:', bgCallMonitor.currentCallId);
                const callId = bgCallMonitor.currentCallId;
                const phone = bgCallMonitor.callPhone;
                
                // Clear state first
                bgCallMonitor.currentCallId = null;
                bgCallMonitor.callPhone = null;
                
                // Handle call ended in background
                await handleBgCallEnded(callId, phone);
            }
        }
    } catch (e) {
        console.error('[BG] Poll error:', e);
    }
    
    if (bgCallMonitor.polling) {
        setTimeout(pollForActiveCalls, ACTIVE_CALL_POLL_INTERVAL);
    }
}

async function handleBgCallEnded(callId, phone) {
    console.log('[BG] Processing ended call:', callId, phone);
    
    try {
        // Wait for transcript to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch transcript
        const transResp = await fetch(`${SERVER_URL}/api/ctm/calls/${callId}/transcript`);
        const transData = transResp.ok ? await transResp.json() : null;
        
        if (!transData || !transData.available || !transData.transcript) {
            console.log('[BG] No transcript available for:', callId);
            notifyPopup({ type: 'CALL_ENDED_NO_TRANSCRIPT', phone: phone });
            return;
        }
        
        // Run analysis
        const analysisResp = await fetch(`${SERVER_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                transcription: transData.transcript, 
                phone: phone, 
                client: DEFAULT_CLIENT 
            })
        });
        
        if (!analysisResp.ok) {
            console.log('[BG] Analysis failed for:', callId);
            notifyPopup({ type: 'CALL_ENDED_NO_ANALYSIS', phone: phone });
            return;
        }
        
        const analysis = await analysisResp.json();
        
        const result = {
            type: 'analysis_complete',
            phone: phone,
            call_id: callId,
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
        
        // Store result
        await chrome.storage.local.set({ ats_latest_analysis: result });
        
        // Show notification
        const score = result.analysis.score;
        const scoreClass = score >= 70 ? 'Hot' : score >= 40 ? 'Warm' : 'Cold';
        showNotification(
            'Call Analysis Ready',
            `${phone} - ${scoreClass} Lead (${score})`
        );
        
        // Notify popup
        notifyPopup({ type: 'ANALYSIS_COMPLETE', ...result });
        
        console.log('[BG] Analysis complete for:', phone, 'Score:', score);
        
    } catch (e) {
        console.error('[BG] Call ended handling error:', e);
    }
}

async function handleBackgroundCallEnded(callId, phone, client, sendResponse) {
    try {
        // Fetch transcript
        const transResp = await fetch(`${SERVER_URL}/api/ctm/calls/${callId}/transcript`);
        const transData = transResp.ok ? await transResp.json() : null;
        
        if (!transData || !transData.available || !transData.transcript) {
            sendResponse({ success: false, error: 'No transcript available' });
            return;
        }
        
        // Run analysis
        const analysisResp = await fetch(`${SERVER_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcription: transData.transcript, phone, client })
        });
        
        if (!analysisResp.ok) {
            sendResponse({ success: false, error: 'Analysis failed' });
            return;
        }
        
        const analysis = await analysisResp.json();
        
        const result = {
            type: 'analysis_complete',
            phone,
            call_id: callId,
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
        
        await chrome.storage.local.set({ ats_latest_analysis: result });
        sendResponse({ success: true, result });
        
    } catch (e) {
        console.error('[BG] Handle call ended error:', e);
        sendResponse({ success: false, error: e.message });
    }
}

async function notifyPopup(message) {
    try {
        chrome.runtime.sendMessage(message);
    } catch (e) {
        // Popup might be closed, that's fine
    }
}

restoreState();
console.log('[BG] ATS Background Service Worker loaded');
