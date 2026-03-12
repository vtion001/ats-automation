/**
 * CTM Service
 * Handles CallTrackingMetrics interactions
 */

class CTMService {
    constructor() {
        this.config = {
            pollInterval: 1000,
            selectors: {
                callStatus: [
                    '.call-status',
                    '.incoming-call',
                    '.outgoing-call', 
                    '.call-notification',
                    '.active-call',
                    '.call-info',
                    '.caller-id',
                    '[data-call-status]',
                    '[class*="call-active"]',
                    '[class*="inbound"]',
                    '.ringing',
                    '.incall'
                ],
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
    }

    // Detect if there's an active call
    detectCall() {
        for (const selector of this.config.selectors.callStatus) {
            const element = document.querySelector(selector);
            if (element) {
                const status = element.textContent?.trim() || element.getAttribute('data-call-status');
                if (status && status !== this.lastCallState && status.length < 50) {
                    this.lastCallState = status;
                    return { status, element };
                }
            }
        }
        return null;
    }

    // Extract phone number from page
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

    // Start monitoring for calls
    startMonitoring(callback) {
        let callActive = false;
        
        this.monitorInterval = setInterval(() => {
            const callEvent = this.detectCall();
            
            if (callEvent && !callActive) {
                const phoneNumber = this.extractPhoneNumber();
                const callerName = this.extractCallerName();
                
                callback({
                    type: 'call_started',
                    status: callEvent.status,
                    phoneNumber,
                    callerName,
                    timestamp: Date.now()
                });
                callActive = true;
            } else if (!callEvent && callActive) {
                callback({
                    type: 'call_ended',
                    timestamp: Date.now()
                });
                callActive = false;
            }
        }, this.config.pollInterval);
        
        ATS.logger.info('CTM monitoring started');
    }

    // Stop monitoring
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        ATS.logger.info('CTM monitoring stopped');
    }
}

window.CTMService = CTMService;
