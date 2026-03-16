/**
 * CTM Service
 * Handles CallTrackingMetrics interactions
 * Uses CTM custom events for real-time call detection
 */

class CTMService {
    constructor() {
        this.config = {
            pollInterval: 5000,
            selectors: {
                phoneNumber: [
                    '.caller-number',
                    '.phone-number',
                    '.call-from',
                    '.phone-display',
                    '[data-phone]',
                    '.tel-number',
                    '[class*="phone"]',
                    '[class*="caller"]'
                ],
                callerName: [
                    '.caller-name',
                    '.contact-name', 
                    '.name-display',
                    '[data-caller-name]',
                    '[class*="caller"]'
                ]
            }
        };
        
        this.lastCallState = null;
        this.monitorInterval = null;
        this.callActive = false;
        this.eventListeners = [];
    }

    // Extract phone number from CTM custom elements
    extractPhoneNumber() {
        for (const selector of this.config.selectors.phoneNumber) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const phone = element.textContent?.trim() || element.getAttribute('data-phone');
                if (phone && phone.length >= 7 && phone.length <= 20) {
                    return ATS.utils.cleanPhoneNumber(phone);
                }
            }
        }
        return null;
    }

    // Extract caller name
    extractCallerName() {
        for (const selector of this.config.selectors.callerName) {
            const element = document.querySelector(selector);
            if (element) {
                const name = element.textContent?.trim();
                if (name && name.length > 0 && name.length < 100) {
                    return name;
                }
            }
        }
        return null;
    }

    // Listen for CTM custom events
    addEventListener(eventName, handler) {
        window.addEventListener(eventName, handler);
        this.eventListeners.push({ eventName, handler });
    }

    // Start monitoring for calls using CTM custom events
    startMonitoring(callback) {
        const self = this;
        
        // Listen for ctm:live-activity event (incoming call)
        this.addEventListener('ctm:live-activity', function(e) {
            console.log('[CTM Service] Live activity detected:', e.detail);
            
            // Extract data from event detail
            const activity = e.detail?.activity;
            const settings = e.detail?.settings;
            
            let phoneNumber = null;
            let callerName = null;
            
            // Try to get phone from activity
            if (activity) {
                phoneNumber = activity.from_number || activity.to_number || activity.phone_number;
                callerName = activity.caller_name || activity.name;
            }
            
            // Fallback to DOM extraction
            if (!phoneNumber) {
                phoneNumber = self.extractPhoneNumber();
            }
            if (!callerName) {
                callerName = self.extractCallerName();
            }
            
            if (phoneNumber && !self.callActive) {
                self.callActive = true;
                callback({
                    type: 'call_started',
                    status: 'incoming',
                    phoneNumber: ATS.utils.cleanPhoneNumber(phoneNumber),
                    callerName: callerName,
                    timestamp: Date.now(),
                    activity: activity
                });
                console.log('[CTM Service] Call started:', phoneNumber, callerName);
            }
        });

        // Listen for ctm.phone.startCall event
        this.addEventListener('ctm.phone.startCall', function(e, params) {
            console.log('[CTM Service] Start call detected:', params);
            
            const phoneNumber = params?.from_number || params?.to_number;
            
            if (phoneNumber && !self.callActive) {
                self.callActive = true;
                callback({
                    type: 'call_started',
                    status: 'outgoing',
                    phoneNumber: ATS.utils.cleanPhoneNumber(phoneNumber),
                    callerName: null,
                    timestamp: Date.now()
                });
                console.log('[CTM Service] Outgoing call:', phoneNumber);
            }
        });

        // Listen for CTM global events (jQuery)
        if (typeof $ !== 'undefined') {
            $(window).on('ctm.phone.startCall', function(e, params) {
                console.log('[CTM Service] jQuery startCall:', params);
                
                const phoneNumber = params?.from_number || params?.to_number;
                
                if (phoneNumber && !self.callActive) {
                    self.callActive = true;
                    callback({
                        type: 'call_started',
                        status: 'outgoing',
                        phoneNumber: ATS.utils.cleanPhoneNumber(phoneNumber),
                        callerName: null,
                        timestamp: Date.now()
                    });
                }
            });
        }

        // Fallback: Also use polling as backup
        this.monitorInterval = setInterval(() => {
            const callActiveNow = document.querySelector('.call-active, .incall, [data-call-status]');
            
            if (callActiveNow && !self.callActive) {
                const phoneNumber = self.extractPhoneNumber();
                const callerName = self.extractCallerName();
                
                if (phoneNumber) {
                    self.callActive = true;
                    callback({
                        type: 'call_started',
                        status: 'detected',
                        phoneNumber: phoneNumber,
                        callerName: callerName,
                        timestamp: Date.now()
                    });
                }
            } else if (!callActiveNow && self.callActive) {
                self.callActive = false;
                callback({
                    type: 'call_ended',
                    timestamp: Date.now()
                });
            }
        }, this.config.pollInterval);
        
        ATS.logger.info('CTM monitoring started (event-based + fallback polling)');
    }

    // Stop monitoring
    stopMonitoring() {
        // Remove event listeners
        for (const listener of this.eventListeners) {
            window.removeEventListener(listener.eventName, listener.handler);
        }
        this.eventListeners = [];
        
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        
        this.callActive = false;
        ATS.logger.info('CTM monitoring stopped');
    }
}

window.CTMService = CTMService;
