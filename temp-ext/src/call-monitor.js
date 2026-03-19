/**
 * Call Monitor - Auto-detects CTM calls from softphone OR webpage
 * Uses DOM-based detection for reliable call state monitoring
 */

class CallMonitor {
    constructor() {
        this.ctmService = new CTMService();
        this.isRunning = false;
        this.currentCallKey = null;
        this.callStartTime = null;
    }

    /**
     * Start monitoring for CTM calls
     */
    init() {
        if (this.isRunning) return;
        this.start();
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('[CallMonitor] Starting auto-detection...');

        this.ctmService.startMonitoring((callInfo) => {
            console.log('[CallMonitor] Call event:', callInfo);
            
            if (callInfo.ended) {
                this.onCallEnded();
            } else {
                this.onCallDetected(callInfo);
            }
        });
    }

    /**
     * Handle detected call
     */
    onCallDetected(callInfo) {
        const callKey = `${callInfo.phoneNumber}_${callInfo.direction}`;
        
        if (this.currentCallKey !== callKey) {
            this.currentCallKey = callKey;
            this.callStartTime = Date.now();
            console.log('[CallMonitor] New call:', callInfo);
        }

        this.showCallOverlay(callInfo);
    }

    /**
     * Handle call ended
     */
    onCallEnded() {
        this.currentCallKey = null;
        this.callStartTime = null;
        
        chrome.runtime.sendMessage({
            type: 'HIDE_CALL_OVERLAY'
        });
    }

    /**
     * Show call overlay popup with call details
     */
    showCallOverlay(callInfo) {
        const direction = callInfo.direction || 'inbound';
        const phoneNumber = callInfo.phoneNumber || 'Unknown';
        const callerName = callInfo.callerName || 'Unknown Caller';
        const callState = callInfo.callState || 'ringing';
        
        chrome.runtime.sendMessage({
            type: 'SHOW_CALL_IN_PROGRESS',
            payload: {
                phoneNumber,
                callerName,
                direction,
                callState,
                callStartTime: this.callStartTime
            }
        });
    }

    /**
     * Stop monitoring
     */
    stop() {
        this.isRunning = false;
        this.ctmService.stopMonitoring();
    }
}

// Auto-start when page loads (on CTM softphone pages)
document.addEventListener('DOMContentLoaded', () => {
    const monitor = new CallMonitor();
    monitor.start();
    
    if (window.CTM) {
        document.addEventListener('ctm:ready', () => {
            if (!monitor.isRunning) {
                monitor.start();
            }
        });
    }
});

window.CallMonitor = CallMonitor;
