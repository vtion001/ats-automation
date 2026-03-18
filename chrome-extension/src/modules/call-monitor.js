/**
 * Call Monitor - Simplified Version
 * Detects calls, shows popup, handles transcription
 */

class CallMonitor {
    constructor() {
        this.ctmService = new CTMService();
        this.currentCall = null;
        this.isMonitoring = false;
    }

    // Initialize
    async init() {
        ATS.logger.info('[CallMonitor] Initializing...');
        
        // Start CTM monitoring
        this.startMonitoring();
        
        return true;
    }

    // Start monitoring for calls
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        
        // Start CTM service
        this.ctmService.startMonitoring((callData) => {
            this.handleNewCall(callData);
        });
        
        ATS.logger.info('[CallMonitor] Started monitoring');
    }

    // Handle new call detected
    handleNewCall(callData) {
        if (!callData || !callData.phoneNumber) return;
        
        ATS.logger.info('[CallMonitor] New call:', callData);
        
        this.currentCall = callData;
        
        // Show popup/overlay
        this.showCallPopup(callData);
        
        // Notify background script
        if (chrome && chrome.runtime) {
            chrome.runtime.sendMessage({
                type: 'CALL_DETECTED',
                payload: callData
            });
        }
    }

    // Show call popup
    showCallPopup(callData) {
        // Create or show overlay
        this.createOverlay(callData);
    }

    // Create call overlay
    createOverlay(callData) {
        // Remove existing overlay
        const existing = document.getElementById('ats-call-overlay');
        if (existing) existing.remove();
        
        // Create new overlay
        const overlay = document.createElement('div');
        overlay.id = 'ats-call-overlay';
        overlay.innerHTML = `
            <style>
                #ats-call-overlay {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 320px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    animation: slideIn 0.3s ease;
                }
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                #ats-call-overlay h3 { margin: 0 0 10px 0; font-size: 14px; opacity: 0.9; }
                #ats-call-overlay .phone { font-size: 24px; font-weight: bold; margin: 10px 0; }
                #ats-call-overlay .name { font-size: 16px; opacity: 0.9; }
                #ats-call-overlay .status { 
                    margin-top: 15px; 
                    padding: 8px 12px; 
                    background: rgba(255,255,255,0.2); 
                    border-radius: 6px;
                    font-size: 12px;
                }
                #ats-call-overlay .close {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 20px;
                }
            </style>
            <button class="close" onclick="this.parentElement.remove()">×</button>
            <h3>📞 Incoming Call</h3>
            <div class="phone">${callData.phoneNumber}</div>
            <div class="name">${callData.callerName || 'Unknown Caller'}</div>
            <div class="status">🔴 Monitoring Active</div>
        `;
        
        document.body.appendChild(overlay);
        
        ATS.logger.info('[CallMonitor] Overlay shown');
    }

    // Stop monitoring
    stopMonitoring() {
        this.ctmService.stopMonitoring();
        this.isMonitoring = false;
    }
}

// Auto-initialize
if (typeof window !== 'undefined') {
    window.CallMonitor = CallMonitor;
}
