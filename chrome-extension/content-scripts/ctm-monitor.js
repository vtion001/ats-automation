/**
 * CTM Call Monitor
 * Detects incoming/outgoing calls on CallTrackingMetrics
 */

(function() {
    'use strict';

    const CONFIG = {
        pollInterval: 500,
        callEventSelectors: [
            '.call-status',
            '.incoming-call',
            '.outgoing-call',
            '.call-notification',
            '[data-call-status]',
            '.call-details'
        ],
        phoneNumberSelectors: [
            '.caller-number',
            '.phone-number',
            '.call-from',
            '[data-phone]',
            '.phone-display'
        ]
    };

    let lastCallState = null;
    let monitorInterval = null;

    function detectCallEvent() {
        for (const selector of CONFIG.callEventSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const status = element.textContent?.trim() || element.getAttribute('data-call-status');
                if (status && status !== lastCallState) {
                    lastCallState = status;
                    return { status, element };
                }
            }
        }
        return null;
    }

    function extractPhoneNumber() {
        for (const selector of CONFIG.phoneNumberSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const phone = element.textContent?.trim() || element.getAttribute('data-phone');
                if (phone) {
                    return cleanPhoneNumber(phone);
                }
            }
        }
        return null;
    }

    function cleanPhoneNumber(phone) {
        return phone.replace(/[^\d+]/g, '');
    }

    function broadcastCallEvent(data) {
        chrome.runtime.sendMessage({
            type: 'CTM_CALL_EVENT',
            payload: data
        });
    }

    function startMonitoring() {
        console.log('[ATS] CTM Monitor started');
        
        monitorInterval = setInterval(() => {
            const callEvent = detectCallEvent();
            if (callEvent) {
                const phoneNumber = extractPhoneNumber();
                broadcastCallEvent({
                    status: callEvent.status,
                    phoneNumber,
                    timestamp: Date.now(),
                    url: window.location.href
                });
            }
        }, CONFIG.pollInterval);
    }

    function stopMonitoring() {
        if (monitorInterval) {
            clearInterval(monitorInterval);
            monitorInterval = null;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startMonitoring);
    } else {
        startMonitoring();
    }

    window.addEventListener('unload', stopMonitoring);
})();
