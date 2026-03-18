/**
 * CTM Service - Simplified Call Detection
 * Detects CTM calls and captures phone numbers
 */

class CTMService {
    constructor() {
        this.monitorInterval = null;
        this.callActive = false;
        this.lastPhoneNumber = null;
        this.currentCallData = null;
        
        // CTM page selectors for call detection
        this.callSelectors = [
            // Phone number displays
            '[class*="caller"]',
            '[class*="phone"]',
            '[class*="number"]',
            '[data-phone]',
            '[data-call-phone]',
            // Call status indicators
            '.call-active',
            '.incall',
            '.incoming-call',
            '.outgoing-call',
            '.active-call',
            // Generic CTM elements
            '#call-display',
            '.call-info',
            '.phone-display'
        ];
        
        // Name selectors
        this.nameSelectors = [
            '[class*="caller-name"]',
            '[class*="contact-name"]',
            '[data-caller-name]',
            '.contact-info h2',
            '.caller-info h2'
        ];
    }

    // Start monitoring for calls
    startMonitoring(onCallDetected) {
        ATS.logger.info('[CTM] Starting call monitoring...');
        
        this.onCallDetected = onCallDetected;
        
        // Check every second
        this.monitorInterval = setInterval(() => {
            this.checkForCall();
        }, 1000);
        
        // Also check immediately
        this.checkForCall();
    }

    // Stop monitoring
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        ATS.logger.info('[CTM] Stopped monitoring');
    }

    // Check for active call
    checkForCall() {
        try {
            // Method 1: Look for phone number in common CTM locations
            const phoneNumber = this.findPhoneNumber();
            
            if (phoneNumber && phoneNumber !== this.lastPhoneNumber) {
                this.lastPhoneNumber = phoneNumber;
                this.callActive = true;
                
                // Get caller name if available
                const callerName = this.findCallerName();
                
                const callData = {
                    phoneNumber: phoneNumber,
                    callerName: callerName,
                    timestamp: new Date().toISOString(),
                    status: 'active'
                };
                
                ATS.logger.info('[CTM] Call detected:', callData);
                
                if (this.onCallDetected) {
                    this.onCallDetected(callData);
                }
                
                return callData;
            }
            
            // Check if call ended
            if (!phoneNumber && this.callActive) {
                ATS.logger.info('[CTM] Call ended');
                this.callActive = false;
                this.currentCallData = null;
            }
            
        } catch (e) {
            ATS.logger.error('[CTM] Error checking for call:', e.message);
        }
        
        return null;
    }

    // Find phone number on page
    findPhoneNumber() {
        // Common CTM phone number patterns
        const phonePatterns = [
            // Direct phone number elements
            '.caller-phone',
            '.phone-number', 
            '.call-phone',
            '.phone-display',
            '#caller-phone',
            '#phone-number',
            // Data attributes
            '[data-phone]',
            '[data-call-phone]',
            '[data-caller-phone]',
            // Class contains
            '[class*="caller-number"]',
            '[class*="phone-number"]',
            '[class*="phoneDisplay"]'
        ];
        
        for (const selector of phonePatterns) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                const text = el.textContent?.trim();
                if (text && this.isPhoneNumber(text)) {
                    return this.cleanPhoneNumber(text);
                }
                // Check data attribute
                const dataPhone = el.getAttribute('data-phone') || el.getAttribute('data-call-phone');
                if (dataPhone && this.isPhoneNumber(dataPhone)) {
                    return this.cleanPhoneNumber(dataPhone);
                }
            }
        }
        
        // Fallback: search entire page for phone numbers
        const pageText = document.body.innerText;
        const phoneMatch = pageText.match(/(\+?1?\d{10}|\(\d{3}\)\s*\d{3}[-\s]?\d{4})/);
        if (phoneMatch) {
            return this.cleanPhoneNumber(phoneMatch[0]);
        }
        
        return null;
    }

    // Find caller name
    findCallerName() {
        const selectors = [
            '.caller-name',
            '.contact-name',
            '[class*="caller-name"]',
            '[data-caller-name]',
            '.call-caller-name'
        ];
        
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) {
                const name = el.textContent?.trim();
                if (name && name.length > 1 && name.length < 50) {
                    return name;
                }
            }
        }
        
        return null;
    }

    // Check if text is a phone number
    isPhoneNumber(text) {
        if (!text) return false;
        // Remove common prefixes
        const cleaned = text.replace(/^[+\s#*]+/, '').replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 15;
    }

    // Clean phone number
    cleanPhoneNumber(phone) {
        if (!phone) return null;
        // Keep only digits and +
        return phone.replace(/[^\d+]/g, '');
    }

    // Get current call status
    getCallStatus() {
        return {
            active: this.callActive,
            phoneNumber: this.lastPhoneNumber,
            callData: this.currentCallData
        };
    }
}

window.CTMService = CTMService;
