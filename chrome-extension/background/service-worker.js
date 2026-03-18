/**
 * ATS Automation - Background Service Worker
 * Handles tab audio capture via injected content script, messages, and badge updates
 */

const AUDIO_STORAGE_KEY = 'ats_captured_audio';

let currentCapture = {
    tabId: null,
    mediaRecorder: null,
    stream: null,
    audioChunks: [],
    recording: false,
    startTime: null,
    injected: false
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
            console.error('[BG] Recording error from content script:', message.error);
            sendResponse({ success: true });
            return true;
        
        case 'RECORDING_STOPPED':
            handleRecordingStopped(message.chunks || []);
            sendResponse({ success: true });
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
            injected: false
        };
        
        console.log('[BG] Injecting capture script into tab', tabId);
        updateStatus('Injecting recorder...');
        
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
        
        setBadge('#ef4444', 'REC');
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
}

async function stopCaptureInternal() {
    if (currentCapture.stream) {
        currentCapture.stream.getTracks().forEach(track => track.stop());
    }
    
    currentCapture.recording = false;
    currentCapture.stream = null;
    currentCapture.mediaRecorder = null;
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

console.log('[BG] ATS Background Service Worker loaded');
