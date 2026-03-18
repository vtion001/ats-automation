/**
 * Tab Audio Capture Service
 * Captures audio from selected tab for transcription
 */

class TabAudioCaptureService {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.stream = null;
    }

    // Get all tabs for user to select
    async getTabs() {
        if (!chrome || !chrome.tabs) {
            return { error: 'Chrome API not available' };
        }
        
        const tabs = await chrome.tabs.query({
            audible: true,
            currentWindow: false
        });
        
        return tabs.map(tab => ({
            id: tab.id,
            title: tab.title,
            url: tab.url,
            favIconUrl: tab.favIconUrl
        }));
    }

    // Capture audio from specific tab
    async captureTabAudio(tabId) {
        try {
            // tabCapture.capture() only works on current active tab
            // We need to switch to the target tab first
            
            // Get current tab to restore later
            const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentTabId = currentTab?.id;
            
            // Switch to target tab
            await chrome.tabs.update(tabId, { active: true });
            
            // Small delay to ensure tab switch completes
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Now capture from the active tab
            const stream = await new Promise((resolve, reject) => {
                chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(stream);
                    }
                });
            });
            
            if (!stream) {
                // Restore previous tab on failure
                if (currentTabId) {
                    chrome.tabs.update(currentTabId, { active: true });
                }
                return { error: 'Could not capture tab audio' };
            }
            
            // Restore previous tab after successful capture
            if (currentTabId) {
                chrome.tabs.update(currentTabId, { active: true });
            }
            
            this.stream = stream;
            this.audioChunks = [];
            
            // Create media recorder
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.start(1000); // Collect data every second
            this.isRecording = true;
            
            return { success: true, tabId };
            
        } catch (e) {
            return { error: e.message };
        }
    }

    // Stop recording
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Stop all tracks
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
        }
    }

    // Get recorded audio as blob
    getAudioBlob() {
        return new Blob(this.audioChunks, { type: 'audio/webm' });
    }

    // Save audio to file (for debugging)
    async saveAudio() {
        const blob = this.getAudioBlob();
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `call_${Date.now()}.webm`;
        a.click();
        
        return url;
    }
}

window.TabAudioCaptureService = TabAudioCaptureService;
