/**
 * ATS Automation - Background Service Worker
 * Handles tab audio capture, background recording, and analysis
 */

const AUDIO_STORAGE_KEY = 'ats_captured_audio';
const RECORDING_STATE_KEY = 'ats_recording_state';
const ANALYSIS_RESULT_KEY = 'ats_analysis_result';
const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
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
            sendResponse({ success: true });
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

        case 'CTM_MONITOR_STATE':
            console.log('[BG] CTM Monitor state:', message.payload);
            sendResponse({ success: true });
            return true;

        case 'GET_CTM_MONITOR_STATE':
            sendResponse({ state: 'unknown' });
            return true;
        
        default:
            sendResponse({ error: 'Unknown message type' });
            return true;
    }
});

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
        
        console.log('[BG] Injecting capture script into tab', tabId);
        
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content-scripts/tab-audio-capture.js']
        });
        
        if (!results || results.length === 0) {
            sendResponse({ error: 'Failed to inject content script' });
            return;
        }
        
        currentCapture.injected = true;
        currentCapture.startTime = Date.now();
        currentCapture.recording = true;
        
        updateRecordingState(true);
        setBadge('#ef4440', 'REC');
        console.log('[BG] Content script injected, recording started for tab', tabId);
        
        sendResponse({ success: true, tabId: tabId, startTime: currentCapture.startTime });
        
    } catch (e) {
        console.error('[BG] Start capture error:', e);
        const errMsg = e.message || String(e);
        const notInvoked = errMsg.includes('not allowed') || errMsg.includes('Cannot access');
        sendResponse({ error: errMsg, notInvoked });
    }
}

async function handleStopCaptureTab(sendResponse) {
    try {
        if (!currentCapture.recording && currentCapture.audioChunks.length === 0) {
            sendResponse({ success: true, chunks: [], error: 'Not recording' });
            return;
        }
        
        const tabId = currentCapture.tabId;
        
        if (tabId && currentCapture.injected) {
            try {
                await chrome.tabs.sendMessage(tabId, { type: 'STOP_RECORDING' });
            } catch (e) {
                console.log('[BG] Could not send stop to content script:', e.message);
            }
        }
        
        await stopCaptureInternal();
        
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
