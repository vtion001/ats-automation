/**
 * ATS Automation - Background Service Worker
 * Handles tab audio capture, messages, and badge updates
 */

// Tab capture state
let currentCapture = {
    tabId: null,
    stream: null,
    mediaRecorder: null,
    audioChunks: [],
    recording: false
};

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[BG] Message received:', message.type);
    
    switch (message.type) {
        case 'START_TAB_CAPTURE':
            handleStartCapture(message.tabId, sendResponse);
            return true;
            
        case 'STOP_TAB_CAPTURE':
            handleStopCapture(sendResponse);
            return true;
            
        case 'GET_CAPTURE_STATUS':
            sendResponse({
                recording: currentCapture.recording,
                tabId: currentCapture.tabId
            });
            return true;
            
        case 'SET_BADGE':
            handleSetBadge(message.color, message.text);
            sendResponse({ success: true });
            return true;
            
        case 'CALL_DETECTED':
            // Forward to popup if open
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

// Start capturing audio from tab
async function handleStartCapture(tabId, sendResponse) {
    try {
        // Stop any existing capture
        if (currentCapture.recording) {
            await stopCapture();
        }
        
        // Get tab stream
        const stream = await chrome.tabCapture.capture({
            tabId: tabId,
            audio: true,
            video: false
        });
        
        if (!stream) {
            sendResponse({ error: 'Could not capture tab' });
            return;
        }
        
        // Set up media recorder
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        currentCapture = {
            tabId: tabId,
            stream: stream,
            mediaRecorder: mediaRecorder,
            audioChunks: [],
            recording: true
        };
        
        // Collect audio data
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                currentCapture.audioChunks.push(event.data);
            }
        };
        
        // Start recording
        mediaRecorder.start(1000);
        
        // Set badge
        setBadge('#ef4444', 'REC');
        
        console.log('[BG] Started capturing tab', tabId);
        
        sendResponse({ success: true, tabId: tabId });
        
    } catch (e) {
        console.error('[BG] Capture error:', e);
        sendResponse({ error: e.message });
    }
}

// Stop capturing
async function handleStopCapture(sendResponse) {
    try {
        await stopCapture();
        setBadge('#22c55e', 'OK');
        sendResponse({ success: true });
    } catch (e) {
        sendResponse({ error: e.message });
    }
}

async function stopCapture() {
    if (currentCapture.mediaRecorder && currentCapture.recording) {
        currentCapture.mediaRecorder.stop();
    }
    
    if (currentCapture.stream) {
        currentCapture.stream.getTracks().forEach(track => track.stop());
    }
    
    currentCapture = {
        tabId: null,
        stream: null,
        mediaRecorder: null,
        audioChunks: [],
        recording: false
    };
    
    console.log('[BG] Stopped capturing');
}

// Set badge
function setBadge(color, text) {
    try {
        chrome.action.setBadgeBackgroundColor({ color: color });
        chrome.action.setBadgeText({ text: text });
    } catch (e) {
        console.log('[BG] Badge error:', e);
    }
}

// Handle badge setting from content scripts
function handleSetBadge(color, text) {
    setBadge(color, text);
}

console.log('[BG] ATS Background Service Worker loaded');
