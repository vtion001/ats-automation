/**
 * CTM Service - Monitors CTM phone embed (not the call log dashboard)
 * Only runs on the phone embed page (#calls-phone) and listens for CTM softphone events.
 * No DOM polling - uses CTM's native event system.
 */

class CTMService {
    constructor() {
        this.isMonitoring = false;
        this.activeCallInfo = null;
        this.listeners = [];
    }

    /**
     * Start monitoring CTM phone embed for active calls
     */
    startMonitoring(onCallDetected) {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        
        console.log('[CTM] Starting phone embed monitoring');
        
        this.setupCTMEventListeners();
        
        if (onCallDetected) {
            this.addListener(onCallDetected);
        }
    }

    /**
     * Setup CTM custom event listeners for softphone
     * These events fire on the phone embed page (#calls-phone)
     */
    setupCTMEventListeners() {
        // Listen for station check events
        document.addEventListener('ctm:stationCheck', (e) => {
            console.log('[CTM] Station check:', e.detail);
        });

        // Listen for live activity (incoming/outgoing call) - this is the primary signal
        document.addEventListener('ctm:live-activity', (e) => {
            console.log('[CTM] Live activity:', e.detail);
            const activity = e.detail?.activity;
            if (!activity) return;

            const phoneNumber = this.extractPhoneFromActivity(activity);
            if (phoneNumber) {
                this.activeCallInfo = {
                    phoneNumber: phoneNumber,
                    direction: activity.direction || 'inbound',
                    source: 'softphone',
                    activityId: activity.id,
                    callerName: activity.caller_name || activity.from_name || null
                };
                this.notifyListeners(this.activeCallInfo);
            }
        });

        // Listen for screen pops
        document.addEventListener('ctm:screen-pop', (e) => {
            console.log('[CTM] Screen pop:', e.detail);
        });
    }

    /**
     * Extract phone number from CTM activity object
     */
    extractPhoneFromActivity(activity) {
        if (!activity) return null;
        
        const phoneFields = [
            'from', 'to', 'caller_id', 'phoneNumber', 'phone', 'number',
            'caller_number', 'from_number', 'to_number'
        ];
        
        for (const field of phoneFields) {
            const val = activity[field];
            if (val && typeof val === 'string') {
                const cleaned = val.replace(/[^0-9+]/g, '');
                if (cleaned.length >= 10) {
                    return cleaned;
                }
            }
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
        this.listeners = [];
        console.log('[CTM] Stopped monitoring');
    }
}

// Export for use in other modules
window.CTMService = CTMService;
