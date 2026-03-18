/**
 * ATS Automation - Background Service Worker
 * Handles tab audio capture, messages, and badge updates
 */

const AUDIO_STORAGE_KEY = 'ats_captured_audio';

let currentCapture = {
    tabId: null,
    stream: null,
    mediaRecorder: null,
    audioChunks: [],
    recording: false,
    startTime: null
};

function getMessageType(message) {
    return message.type || message.action;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const msgType = getMessageType(message);
    console.log('[BG] Message received:', msgType);
    
    switch (msgType) {
        case 'START_TAB_CAPTURE':
            sendResponse({ error: 'Capture now runs in popup, not service worker' });
            return true;
            
        case 'STOP_TAB_CAPTURE':
            sendResponse({ success: false, error: 'Capture now runs in popup' });
            return true;
            
        case 'GET_CAPTURE_STATUS':
            sendResponse({ recording: false, tabId: null, startTime: null });
            return true;
            
        case 'GET_CAPTURED_AUDIO':
            sendResponse({ success: false, error: 'No audio captured via service worker' });
            return true;
            
        case 'CLEAR_CAPTURED_AUDIO':
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
            
        default:
            sendResponse({ error: 'Unknown message type' });
            return true;
    }
});

async function handleStartCapture(tabId, sendResponse) {
    try {
        if (currentCapture.recording) {
            await stopCapture();
        }
        
        // tabCapture.capture() only works on current active tab
        // Switch to target tab first
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const previousTabId = currentTab?.id;
        
        await chrome.tabs.update(tabId, { active: true });
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const stream = await new Promise((resolve, reject) => {
            chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(stream);
                }
            });
        });
        
        // Restore previous tab
        if (previousTabId) {
            chrome.tabs.update(previousTabId, { active: true });
        }
        
        if (!stream) {
            sendResponse({ error: 'Could not capture tab' });
            return;
        }
        
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';
        
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        
        currentCapture = {
            tabId: tabId,
            stream: stream,
            mediaRecorder: mediaRecorder,
            audioChunks: [],
            recording: true,
            startTime: Date.now()
        };
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                currentCapture.audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.start(1000);
        setBadge('#ef4444', 'REC');
        console.log('[BG] Started capturing tab', tabId);
        
        sendResponse({ success: true, tabId: tabId, startTime: currentCapture.startTime });
        
    } catch (e) {
        console.error('[BG] Capture error:', e);
        sendResponse({ error: e.message });
    }
}

async function handleStopCapture(sendResponse) {
    try {
        const result = await stopCapture();
        setBadge('#22c55e', 'OK');
        sendResponse({ success: true, ...result });
    } catch (e) {
        sendResponse({ error: e.message });
    }
}

async function stopCapture() {
    return new Promise((resolve) => {
        if (!currentCapture.mediaRecorder) {
            resolve({ hasAudio: false });
            return;
        }
        
        currentCapture.mediaRecorder.onstop = async () => {
            let hasAudio = false;
            
            if (currentCapture.audioChunks.length > 0) {
                const blob = new Blob(currentCapture.audioChunks, { type: 'audio/webm' });
                
                if (blob.size > 0) {
                    hasAudio = true;
                    
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const base64 = reader.result.split(',')[1];
                        
                        await chrome.storage.local.set({
                            [AUDIO_STORAGE_KEY]: {
                                data: base64,
                                mimeType: 'audio/webm',
                                tabId: currentCapture.tabId,
                                startTime: currentCapture.startTime,
                                duration: currentCapture.startTime ? Math.round((Date.now() - currentCapture.startTime) / 1000) : 0,
                                timestamp: Date.now()
                            }
                        });
                        
                        console.log('[BG] Audio stored, size:', blob.size, 'bytes');
                    };
                    reader.readAsDataURL(blob);
                }
            }
            
            if (currentCapture.stream) {
                currentCapture.stream.getTracks().forEach(track => track.stop());
            }
            
            currentCapture = {
                tabId: null,
                stream: null,
                mediaRecorder: null,
                audioChunks: [],
                recording: false,
                startTime: null
            };
            
            console.log('[BG] Stopped capturing, hasAudio:', hasAudio);
            resolve({ hasAudio });
        };
        
        if (currentCapture.recording) {
            currentCapture.mediaRecorder.stop();
        } else {
            if (currentCapture.stream) {
                currentCapture.stream.getTracks().forEach(track => track.stop());
            }
            currentCapture = {
                tabId: null,
                stream: null,
                mediaRecorder: null,
                audioChunks: [],
                recording: false,
                startTime: null
            };
            resolve({ hasAudio: false });
        }
    });
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

console.log('[BG] ATS Background Service Worker loaded');
