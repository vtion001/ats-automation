/**
 * Call Monitor - Auto-detects CTM calls from softphone OR webpage
 * No manual selection needed!
 */

class CallMonitor {
    constructor() {
        this.ctmService = new CTMService();
        this.isRunning = false;
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

        // Start CTM service - automatically detects softphone + webpage
        this.ctmService.startMonitoring((callInfo) => {
            console.log('[CallMonitor] Call detected:', callInfo);
            this.onCallDetected(callInfo);
        });
    }

    /**
     * Handle detected call
     */
    onCallDetected(callInfo) {
        // Show the overlay with caller info
        this.showCallOverlay(callInfo);
    }

    /**
     * Show call overlay popup
     */
    showCallOverlay(callInfo) {
        // Create overlay if not exists
        let overlay = document.getElementById('ats-call-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ats-call-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                width: 350px;
                background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: white;
                padding: 16px;
                animation: slideIn 0.3s ease;
            `;
            
            // Add animation keyframes
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(overlay);
        }

        // Update content
        const direction = callInfo.direction === 'inbound' ? '📥 Incoming' : '📤 Outgoing';
        const source = callInfo.source === 'softphone' ? '☎️ Softphone' : '🌐 Webpage';
        
        overlay.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 14px; opacity: 0.8;">${direction} Call</span>
                <span style="font-size: 12px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 10px;">${source}</span>
            </div>
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">
                ${callInfo.phone}
            </div>
            <div style="font-size: 12px; opacity: 0.7;">
                Auto-detected - No action needed
            </div>
            <button onclick="this.parentElement.remove()" style="
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                opacity: 0.7;
            ">✕</button>
        `;

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (overlay && overlay.parentElement) {
                overlay.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => overlay.remove(), 300);
            }
        }, 10000);
    }

    /**
     * Stop monitoring
     */
    stop() {
        this.isRunning = false;
        this.ctmService.stopMonitoring();
    }
}

// Auto-start when page loads
document.addEventListener('DOMContentLoaded', () => {
    const monitor = new CallMonitor();
    monitor.start();
    
    // Also start on CTM ready
    if (window.CTM) {
        document.addEventListener('ctm:ready', () => {
            if (!monitor.isRunning) {
                monitor.start();
            }
        });
    }
});

window.CallMonitor = CallMonitor;
