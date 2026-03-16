/**
 * CTM Service
 * Handles CallTrackingMetrics interactions
 * Uses multiple detection methods for reliable call monitoring
 */

class CTMService {
    constructor() {
        this.config = {
            pollInterval: 2000,
            selectors: {
                // Call status indicators
                callStatus: [
                    '.call-active',
                    '.incall',
                    '.incoming-call',
                    '.outgoing-call',
                    '.active-call',
                    '.ringing',
                    '.call-status',
                    '[data-call-status]',
                    '[data-call-state="active"]',
                    '[class*="call-active"]',
                    '[class*="in-call"]',
                    '[class*="ringing"]',
                    '.phone-embed-active',
                    'ctm-phone-embed[style*="visible"]'
                ],
                phoneNumber: [
                    '.caller-number',
                    '.phone-number', 
                    '.call-from',
                    '.phone-display',
                    '.tel-number',
                    '.call-phone',
                    '.phone-info',
                    '[data-phone]',
                    '[data-caller-phone]',
                    '[class*="caller-number"]',
                    '[class*="phone-number"]'
                ],
                callerName: [
                    '.caller-name',
                    '.contact-name',
                    '.name-display',
                    '.call-name',
                    '[data-caller-name]',
                    '[data-contact-name]',
                    '[class*="caller-name"]'
                ]
            }
        };
        
        this.lastCallState = null;
        this.lastPhoneNumber = null;
        this.monitorInterval = null;
        this.callActive = false;
        this.eventListeners = [];
        this.observer = null;
    }

    // Debug: Log all events on window
    setupDebugListeners() {
        console.log('[CTM Service] Setting up debug listeners...');
        
        // Log all custom events
        const events = ['ctm:live-activity', 'ctm:screen-pop', 'ctm.phone.startCall', 'ctm.phone.endCall'];
        events.forEach(eventName => {
            window.addEventListener(eventName, (e) => {
                console.log(`[CTM Service] Event captured: ${eventName}`, e.detail);
            }, true);
        });
        
        // Log all jQuery events
        if (typeof $ !== 'undefined') {
            ['ctm.phone.startCall', 'ctm.phone.answer', 'ctm.phone.end'].forEach(event => {
                $(window).on(event, (e, params) => {
                    console.log(`[CTM Service] jQuery event: ${event}`, params);
                });
            });
        }
        
        console.log('[CTM Service] Debug listeners ready');
    }

    // Extract phone number from CTM page
    extractPhoneNumber() {
        // Try selectors
        for (const selector of this.config.selectors.phoneNumber) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const phone = element.textContent?.trim() || element.getAttribute('data-phone') || element.getAttribute('data-caller-phone');
                if (phone && phone.length >= 7 && phone.length <= 25) {
                    const cleaned = ATS.utils.cleanPhoneNumber(phone);
                    if (cleaned && cleaned.length >= 10) {
                        return cleaned;
                    }
                }
            }
        }
        
        // Try to find phone in any element with phone-like content
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
            const text = el.textContent?.trim();
            if (text && text.match(/^[\d\+\-\(\)\s]{10,25}$/)) {
                const cleaned = ATS.utils.cleanPhoneNumber(text);
                if (cleaned && cleaned.length >= 10) {
                    console.log('[CTM Service] Found phone in:', el);
                    return cleaned;
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
                if (name && name.length > 0 && name.length < 100 && !name.match(/^\d+$/)) {
                    return name;
                }
            }
        }
        return null;
    }

    // Check if there's an active call (multiple methods)
    detectActiveCall() {
        // Method 1: Check call status selectors
        for (const selector of this.config.selectors.callStatus) {
            const element = document.querySelector(selector);
            if (element) {
                return { status: 'active', element, method: 'selector' };
            }
        }
        
        // Method 2: Check body classes
        const body = document.body;
        if (body) {
            const bodyClass = body.className || '';
            if (bodyClass.includes('call-active') || bodyClass.includes('incall') || bodyClass.includes('ringing')) {
                return { status: 'active', element: body, method: 'body-class' };
            }
        }
        
        // Method 3: Check CTM phone embed visibility
        const phoneEmbed = document.querySelector('ctm-phone-embed');
        if (phoneEmbed) {
            const style = phoneEmbed.getAttribute('style') || '';
            if (style.includes('visible') || style.includes('display: block')) {
                return { status: 'active', element: phoneEmbed, method: 'embed' };
            }
        }
        
        // Method 4: Check if URL contains call-related info
        if (window.location.href.includes('/call/') || window.location.href.includes('activity=')) {
            return { status: 'active', element: document.body, method: 'url' };
        }
        
        return null;
    }

    // Setup MutationObserver for DOM changes
    setupMutationObserver(callback) {
        const self = this;
        
        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    // Something changed, check for call
                    const callInfo = self.detectActiveCall();
                    if (callInfo && !self.callActive) {
                        console.log('[CTM Service] MutationObserver detected call:', callInfo);
                        callback(callInfo);
                    }
                }
            }
        });
        
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'data-call-status']
        });
        
        console.log('[CTM Service] MutationObserver ready');
    }

    // Add event listener
    addEventListener(eventName, handler) {
        window.addEventListener(eventName, handler);
        this.eventListeners.push({ eventName, handler });
    }

    // Start monitoring for calls
    startMonitoring(callback) {
        const self = this;
        
        // Setup debug listeners first
        this.setupDebugListeners();
        
        console.log('[CTM Service] Starting CTM monitoring...');
        
        // Method 1: Listen for CTM custom events
        this.addEventListener('ctm:live-activity', function(e) {
            console.log('[CTM Service] ★ ctm:live-activity received:', e.detail);
            
            const activity = e.detail?.activity;
            let phoneNumber = activity?.from_number || activity?.to_number || activity?.phone_number;
            let callerName = activity?.caller_name || activity?.name;
            
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
                console.log('[CTM Service] ★ Call started via event:', phoneNumber);
            }
        });

        // Method 2: Listen for ctm.phone.startCall
        this.addEventListener('ctm.phone.startCall', function(e, params) {
            console.log('[CTM Service] ★ ctm.phone.startCall received:', params);
            
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

        // Method 3: jQuery events
        if (typeof $ !== 'undefined') {
            $(window).on('ctm.phone.startCall', function(e, params) {
                console.log('[CTM Service] ★ jQuery ctm.phone.startCall:', params);
                
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

        // Method 4: MutationObserver for DOM changes
        if (document.body) {
            this.setupMutationObserver((callInfo) => {
                const phoneNumber = self.extractPhoneNumber();
                const callerName = self.extractCallerName();
                
                if (phoneNumber && !self.callActive) {
                    self.callActive = true;
                    callback({
                        type: 'call_started',
                        status: 'detected',
                        phoneNumber: phoneNumber,
                        callerName: callerName,
                        timestamp: Date.now(),
                        method: callInfo.method
                    });
                    console.log('[CTM Service] ★ Call started via MutationObserver:', phoneNumber);
                }
            });
        }

        // Method 5: Polling fallback
        this.monitorInterval = setInterval(() => {
            const callInfo = self.detectActiveCall();
            const phoneNumber = self.extractPhoneNumber();
            
            if (callInfo && !self.callActive) {
                // Call started detected
                if (phoneNumber) {
                    self.callActive = true;
                    callback({
                        type: 'call_started',
                        status: callInfo.status,
                        phoneNumber: phoneNumber,
                        callerName: self.extractCallerName(),
                        timestamp: Date.now(),
                        method: callInfo.method
                    });
                    console.log('[CTM Service] ★ Call started via polling:', phoneNumber, callInfo.method);
                }
            } else if (!callInfo && self.callActive) {
                // Call ended detected
                self.callActive = false;
                callback({
                    type: 'call_ended',
                    timestamp: Date.now()
                });
                console.log('[CTM Service] ★ Call ended via polling');
            }
        }, this.config.pollInterval);
        
        console.log('[CTM Service] CTM monitoring started (multi-method detection)');
    }

    // Stop monitoring
    stopMonitoring() {
        // Remove event listeners
        for (const listener of this.eventListeners) {
            window.removeEventListener(listener.eventName, listener.handler);
        }
        this.eventListeners = [];
        
        // Stop MutationObserver
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        // Stop polling
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        
        this.callActive = false;
        console.log('[CTM Service] CTM monitoring stopped');
    }
}

window.CTMService = CTMService;
