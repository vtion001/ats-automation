/**
 * ATS Automation - Main Content Script Entry Point
 * 
 * This is the main entry point for the CTM page content script.
 * It initializes all services and modules.
 */

(async function() {
    'use strict';

    console.log('[ATS] Initializing...');

    // Initialize core FIRST
    await ATS.init();

    // Create instances
    const callMonitor = new CallMonitor();
    const overlay = new OverlayUI();

    // Set up message listener FIRST (before init that might fail)
    // This ensures PING handler is always available
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            // Support both message.type and message.action
            const messageType = message.type || message.action;
            console.log('[ATS] Message received:', messageType);
            
            // Handle PING synchronously to avoid async response issues
            if (messageType === 'PING') {
                sendResponse({ pong: true, status: 'ok' });
                return false;
            }
            
            // Handle other messages
            switch (messageType) {
                case 'SHOW_NOTIFICATION':
                    if (overlay && overlay.showNotification) {
                        overlay.showNotification(message.payload.message);
                    }
                    break;
                    
                case 'SHOW_OVERLAY':
                case 'SHOW_CALL_SUMMARY':
                case 'AI_ANALYSIS_RESULT':
                    if (overlay && overlay.showData) {
                        overlay.showData(message.payload);
                    }
                    break;
                    
                default:
                    console.log('[ATS] Unknown message:', messageType);
            }
            
            return false;
        });
    }

    // Expose for debugging early (before init)
    window.ATSDebug = {
        callMonitor,
        overlay,
        ATS
    };

    // Now initialize call monitor (with error handling)
    try {
        await callMonitor.init();
    } catch (error) {
        console.error('[ATS] CallMonitor init failed:', error);
    }

    // Check if automations are enabled
    // Default to true if not set
    const automationEnabled = ATS.config.automationEnabled !== false;
    if (!automationEnabled) {
        console.log('[ATS] Automations disabled - config:', ATS.config);
        return;
    }

    // Start monitoring
    if (callMonitor && callMonitor.start) {
        callMonitor.start();
    }

    console.log('[ATS] ATS Automation ready');

})();
