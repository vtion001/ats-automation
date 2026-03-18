/**
 * Tab Audio Capture Content Script
 * Injected into the target tab to handle audio capture.
 * Runs in the target tab's context → tabCapture.capture() works automatically.
 */

(function() {
    'use strict';
    
    if (window.__atsAudioCapture) return;
    window.__atsAudioCapture = true;
    
    let mediaRecorder = null;
    let stream = null;
    let recording = false;
    const CHUNK_INTERVAL_MS = 1000;
    
    function showIndicator() {
        removeIndicator();
        const el = document.createElement('div');
        el.id = 'ats-recording-indicator';
        el.style.cssText = [
            'position: fixed',
            'top: 12px',
            'right: 12px',
            'z-index: 2147483647',
            'background: #ef4444',
            'color: white',
            'padding: 6px 12px',
            'border-radius: 20px',
            'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            'font-size: 12px',
            'font-weight: 600',
            'box-shadow: 0 2px 8px rgba(239,68,68,0.4)',
            'display: flex',
            'align-items: center',
            'gap: 6px',
            'pointer-events: none',
            'user-select: none'
        ].join(';');
        el.innerHTML = '<span style="width:8px;height:8px;background:white;border-radius:50%;display:inline-block;animation:pulse 1s infinite"></span> ATS Recording';
        
        const style = document.createElement('style');
        style.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}';
        document.head.appendChild(style);
        document.body.appendChild(el);
    }
    
    function removeIndicator() {
        const el = document.getElementById('ats-recording-indicator');
        if (el) el.remove();
    }
    
    function sendChunk(chunk) {
        if (!chunk || chunk.size === 0) return;
        chrome.runtime.sendMessage({
            type: 'AUDIO_CHUNK',
            chunk: chunk
        }).catch(() => {});
    }
    
    function sendReady() {
        chrome.runtime.sendMessage({ type: 'RECORDING_READY' }).catch(() => {});
    }
    
    function sendError(msg) {
        chrome.runtime.sendMessage({ type: 'RECORDING_ERROR', error: msg }).catch(() => {});
    }
    
    function sendStopped(chunks) {
        chrome.runtime.sendMessage({ type: 'RECORDING_STOPPED', chunks: chunks }).catch(() => {});
    }
    
    async function startRecording() {
        if (recording) return;
        
        try {
            console.log('[TabCapture-CS] Requesting tab capture...');
            
            stream = await new Promise((resolve, reject) => {
                chrome.tabCapture.capture(
                    { audio: {
                        mandatory: {
                            chromeMediaSource: 'tab',
                            chromeMediaSourceId: 'tab'
                        }
                    }, video: false },
                    (s) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else if (!s) {
                            reject(new Error('No stream returned'));
                        } else {
                            resolve(s);
                        }
                    }
                );
            });
            
            if (!stream || !stream.getAudioTracks().length) {
                sendError('No audio track in stream');
                return;
            }
            
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';
            
            mediaRecorder = new MediaRecorder(stream, { mimeType });
            const chunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunks.push(event.data);
                    // Send chunk directly to service worker (works even if popup is closed)
                    sendChunk(event.data);
                }
            };
            
            mediaRecorder.onerror = (event) => {
                console.error('[TabCapture-CS] MediaRecorder error:', event.error);
                sendError(String(event.error));
                stopRecording();
            };
            
            mediaRecorder.start(CHUNK_INTERVAL_MS);
            recording = true;
            showIndicator();
            
            // Store chunks locally so service worker can retrieve on stop
            window.__atsChunks = chunks;
            
            // Notify service worker that recording started
            chrome.runtime.sendMessage({
                type: 'CAPTURE_STARTED',
                mimeType: mimeType,
                tabId: null
            }).catch(() => {});
            
            sendReady();
            
            console.log('[TabCapture-CS] Recording started, mime:', mimeType);
            
        } catch (e) {
            console.error('[TabCapture-CS] Start error:', e);
            sendError(e.message || String(e));
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
                stream = null;
            }
        }
    }
    
    function stopRecording() {
        if (!recording) return;
        recording = false;
        
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            stream = null;
        }
        
        // Get all accumulated chunks from local storage
        const chunks = window.__atsChunks || [];
        
        mediaRecorder = null;
        removeIndicator();
        
        // Notify service worker with all chunks (works even if popup is closed)
        chrome.runtime.sendMessage({
            type: 'CAPTURE_STOPPED',
            chunks: chunks,
            mimeType: null
        }).catch(() => {});
        
        console.log('[TabCapture-CS] Recording stopped, chunks:', chunks.length);
    }
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'START_RECORDING') {
            startRecording();
            sendResponse({ success: true });
            return false;
        }
        
        if (message.type === 'STOP_RECORDING') {
            stopRecording();
            sendResponse({ success: true });
            return false;
        }
        
        return false;
    });
    
    console.log('[TabCapture-CS] Content script loaded, waiting for START_RECORDING...');
    
    startRecording();
    
})();
