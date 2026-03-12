/**
 * ATS Automation - Main Content Script Entry Point
 * 
 * This is the main entry point for the CTM page content script.
 * It initializes all services and modules.
 */

(async function() {
    'use strict';

    console.log('[ATS] Initializing...');

    // Initialize core
    await ATS.init();

    // Create instances
    const callMonitor = new CallMonitor();
    const overlay = new OverlayUI();

    // Initialize call monitor
    await callMonitor.init();

    // Check if automations are enabled
    if (!ATS.config.automationEnabled) {
        ATS.logger.info('Automations disabled');
        return;
    }

    // Start monitoring
    callMonitor.start();

    // Listen for messages from background
    ATS.onMessage((message, sender, sendResponse) => {
        ATS.logger.info('Message received:', message.type);
        
        switch (message.type) {
            case 'SHOW_NOTIFICATION':
                overlay.showNotification(message.payload.message);
                break;
                
            case 'SHOW_OVERLAY':
            case 'SHOW_CALL_SUMMARY':
            case 'AI_ANALYSIS_RESULT':
                overlay.showData(message.payload);
                break;
                
            case 'PING':
                sendResponse({ status: 'pong' });
                break;
                
            default:
                ATS.logger.warn('Unknown message:', message.type);
        }
    });

    // Expose for debugging
    window.ATSDebug = {
        callMonitor,
        overlay,
        ATS
    };

    ATS.logger.info('ATS Automation ready');

})();
