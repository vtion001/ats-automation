/**
 * CTM Service - Auto-detects calls from both Softphone and Webpage
 * Monitors both the softphone embed and the call log table
 */

class CTMService {
    constructor() {
        this.isMonitoring = false;
        this.lastPhoneNumber = null;
        this.activeCallInfo = null;
        this.listeners = [];
        this.pollInterval = null;
    }

    /**
     * Start monitoring CTM for active calls
     * Auto-detects from both softphone AND webpage
     */
    startMonitoring(onCallDetected) {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        
        console.log('[CTM] Starting auto-detection for softphone + webpage');
        
        // Method 1: Listen to CTM softphone events (for /calls/phone)
        this.setupCTMEventListeners();
        
        // Method 2: Poll the page for active calls (for /calls page)
        this.pollForActiveCalls(onCallDetected);
    }

    /**
     * Setup CTM custom event listeners for softphone
     */
    setupCTMEventListeners() {
        // Listen for station check events
        document.addEventListener('ctm:stationCheck', (e) => {
            console.log('[CTM] Station check:', e.detail);
            if (e.detail?.mode === 'on') {
                console.log('[CTM] Softphone mode activated');
            }
        });

        // Listen for live activity (incoming/outgoing call)
        document.addEventListener('ctm:live-activity', async (e) => {
            console.log('[CTM] Live activity:', e.detail);
            const activity = e.detail?.activity;
            if (activity) {
                const phoneNumber = activity.from || activity.to || this.extractPhoneFromActivity(activity);
                if (phoneNumber) {
                    this.activeCallInfo = {
                        phone: phoneNumber,
                        direction: activity.direction || 'inbound',
                        source: 'softphone',
                        activityId: activity.id
                    };
                    this.notifyListeners(this.activeCallInfo);
                }
            }
        });

        // Listen for screen pops (call starting)
        document.addEventListener('ctm:screen-pop', (e) => {
            console.log('[CTM] Screen pop:', e.detail);
        });

        // Check if CTM object exists and listen to its events
        if (window.CTM) {
            const originalPhoneReady = CTM.phonemode;
            CTM.phonemode = true;
        }
    }

    /**
     * Extract phone number from activity object
     */
    extractPhoneFromActivity(activity) {
        if (!activity) return null;
        
        // Try various properties where phone might be
        const phoneFields = ['from', 'to', 'caller_id', 'phoneNumber', 'phone', 'number'];
        for (const field of phoneFields) {
            if (activity[field]) {
                const phone = activity[field];
                // Clean the phone number
                return phone.replace(/[^0-9+]/g, '');
            }
        }
        return null;
    }

    /**
     * Poll page for active calls (works for /calls webpage)
     */
    pollForActiveCalls(onCallDetected) {
        this.pollInterval = setInterval(() => {
            // Check for active call rows in the call log table
            const activeRows = document.querySelectorAll('tr.call[data-active="1"]');
            
            if (activeRows.length > 0) {
                // Get the first active call
                const callRow = activeRows[0];
                const phoneNumber = callRow.dataset.number || this.extractPhoneFromRow(callRow);
                
                if (phoneNumber && phoneNumber !== this.lastPhoneNumber) {
                    this.lastPhoneNumber = phoneNumber;
                    
                    const direction = callRow.querySelector('.direction.inbound') ? 'inbound' : 'outbound';
                    
                    this.activeCallInfo = {
                        phone: phoneNumber,
                        direction: direction,
                        source: 'webpage',
                        callId: callRow.dataset.id
                    };
                    
                    console.log('[CTM] Active call detected from webpage:', this.activeCallInfo);
                    this.notifyListeners(this.activeCallInfo);
                    
                    if (onCallDetected) {
                        onCallDetected(this.activeCallInfo);
                    }
                }
            } else {
                // No active calls
                if (this.lastPhoneNumber) {
                    this.lastPhoneNumber = null;
                    this.activeCallInfo = null;
                }
            }
        }, 1000); // Check every second
    }

    /**
     * Extract phone number from call row
     */
    extractPhoneFromRow(row) {
        // Try data-number attribute first
        if (row.dataset.number) {
            return row.dataset.number;
        }
        
        // Try finding phone number in the row
        const phoneElement = row.querySelector('[data-field="caller_number"], .call_caller_number');
        if (phoneElement) {
            return phoneElement.textContent?.replace(/[^0-9+]/g, '') || 
                   phoneElement.dataset?.search ||
                   phoneElement.dataset?.digits;
        }
        
        return null;
    }

    /**
     * Get current active call info
     */
    getActiveCall() {
        return this.activeCallInfo;
    }

    /**
     * Check if there's an active call
     */
    hasActiveCall() {
        return this.activeCallInfo !== null;
    }

    /**
     * Add listener for call events
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notify all listeners
     */
    notifyListeners(callInfo) {
        this.listeners.forEach(cb => {
            try {
                cb(callInfo);
            } catch (e) {
                console.error('[CTM] Listener error:', e);
            }
        });
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        this.isMonitoring = false;
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        console.log('[CTM] Stopped monitoring');
    }
}

// Export for use in other modules
window.CTMService = CTMService;
