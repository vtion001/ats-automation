/**
 * CTM Service - Monitors CTM phone embed (not the call log dashboard)
 * Uses DOM-based detection via MutationObserver + periodic checks for reliability.
 * Supports both CTM event system and direct DOM observation.
 */

class CTMService {
    constructor() {
        this.isMonitoring = false;
        this.activeCallInfo = null;
        this.listeners = [];
        this.observer = null;
        this.checkInterval = null;
        this.lastInboundState = false;
        this.lastOutboundState = false;
    }

    isOnCTMPage() {
        const url = window.location.href;
        return url.includes('calltrackingmetrics.com/calls') || 
               url.includes('calltrackingmetrics.com/calls/phone');
    }

    /**
     * Start monitoring CTM phone embed for active calls
     */
    startMonitoring(onCallDetected) {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        
        console.log('[CTM] Starting phone embed monitoring');
        
        this.setupCTMEventListeners();
        this.startDOMObserver();
        this.startPeriodicCheck();
        
        if (onCallDetected) {
            this.addListener(onCallDetected);
        }
    }

    /**
     * Setup CTM custom event listeners for softphone
     */
    setupCTMEventListeners() {
        document.addEventListener('ctm:stationCheck', (e) => {
            console.log('[CTM] Station check:', e.detail);
        });

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

        document.addEventListener('ctm:screen-pop', (e) => {
            console.log('[CTM] Screen pop:', e.detail);
        });
    }

    /**
     * DOM-based call detection using MutationObserver
     */
    startDOMObserver() {
        const observer = new MutationObserver((mutations) => {
            this.checkDOMState();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'data-status']
        });

        this.observer = observer;
    }

    /**
     * Periodic check as backup for MutationObserver
     */
    startPeriodicCheck() {
        this.checkInterval = setInterval(() => {
            this.checkDOMState();
        }, 1000);
    }

    /**
     * Check DOM state for call indicators
     */
    checkDOMState() {
        if (!this.isOnCTMPage()) return;

        const inboundEl = document.querySelector('.agent-status-inbound');
        const outboundEl = document.querySelector('.agent-status-outbound');
        const mainStatus = document.querySelector('main[data-status]');
        
        const inboundVisible = inboundEl && this.isElementVisible(inboundEl);
        const outboundVisible = outboundEl && this.isElementVisible(outboundEl);
        const mainStatusValue = mainStatus?.getAttribute('data-status');

        let callType = null;
        let phoneNumber = null;
        let callerName = null;
        let callState = mainStatusValue || 'unknown';

        if (inboundVisible && !this.lastInboundState) {
            callType = 'inbound';
            console.log('[CTM DOM] Inbound call detected');
        } else if (outboundVisible && !this.lastOutboundState) {
            callType = 'outbound';
            console.log('[CTM DOM] Outbound call detected');
        }

        if (inboundVisible || outboundVisible) {
            phoneNumber = this.getCallerPhone();
            callerName = this.getCallerName();
            
            const newCallInfo = {
                phoneNumber: phoneNumber,
                direction: callType || (inboundVisible ? 'inbound' : 'outbound'),
                source: 'dom',
                callState: callState,
                callerName: callerName,
                callStartTime: this.activeCallInfo?.callStartTime || Date.now()
            };

            if (!this.activeCallInfo || 
                this.activeCallInfo.phoneNumber !== phoneNumber ||
                this.activeCallInfo.direction !== newCallInfo.direction) {
                newCallInfo.callStartTime = Date.now();
                this.activeCallInfo = newCallInfo;
                this.notifyListeners(newCallInfo);
            } else {
                this.activeCallInfo = { ...this.activeCallInfo, ...newCallInfo };
            }
        } else if (!inboundVisible && !outboundVisible && this.activeCallInfo) {
            if (mainStatusValue === 'ready' || mainStatusValue === 'offline') {
                console.log('[CTM DOM] Call ended');
                this.activeCallInfo = null;
                this.notifyListeners({ ended: true });
            }
        }

        this.lastInboundState = inboundVisible;
        this.lastOutboundState = outboundVisible;
    }

    /**
     * Check if element is visible
     */
    isElementVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               el.offsetParent !== null;
    }

    /**
     * Get caller phone number from DOM
     */
    getCallerPhone() {
        const incomingPhone = document.querySelector('#incoming-call-info .info-body');
        if (incomingPhone && this.isElementVisible(incomingPhone)) {
            return this.cleanPhoneNumber(incomingPhone.textContent);
        }

        const activePhone = document.querySelector('.calling_number .phone_number');
        if (activePhone && this.isElementVisible(activePhone)) {
            return this.cleanPhoneNumber(activePhone.textContent);
        }

        return null;
    }

    /**
     * Get caller name from DOM
     */
    getCallerName() {
        const incomingName = document.querySelector('#incoming-call-info .info-title');
        if (incomingName && this.isElementVisible(incomingName)) {
            return incomingName.textContent.trim();
        }

        const activeName = document.querySelector('.calling_number .full_name');
        if (activeName && this.isElementVisible(activeName)) {
            return activeName.textContent.trim();
        }

        return null;
    }

    /**
     * Clean phone number
     */
    cleanPhoneNumber(phone) {
        if (!phone) return null;
        return phone.replace(/[^0-9+]/g, '');
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
                const cleaned = this.cleanPhoneNumber(val);
                if (cleaned && cleaned.length >= 10) {
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
        return this.activeCallInfo !== null && !this.activeCallInfo.ended;
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
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.listeners = [];
        console.log('[CTM] Stopped monitoring');
    }
}

// Export for use in other modules
window.CTMService = CTMService;
