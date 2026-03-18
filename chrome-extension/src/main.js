/**
 * ATS Automation - Main Entry Point
 * Simplified version that just works
 */

(function() {
    'use strict';
    
    console.log('[ATS] Starting ATS Automation...');
    
    // Wait for page to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        console.log('[ATS] Initializing...');
        
        // Check if on CTM page
        if (!isCTMPage()) {
            console.log('[ATS] Not on CTM page, skipping');
            return;
        }
        
        console.log('[ATS] CTM page detected, starting services...');
        
        // Initialize call monitor
        startCallMonitoring();
        
        // Set up message listener
        setupMessageListener();
        
        console.log('[ATS] Started successfully!');
    }
    
    function isCTMPage() {
        const hostname = window.location.hostname;
        const pathname = new URL(window.location.href).pathname;
        
        // Must be on CTM AND be the live softphone page (/calls/phone)
        return (hostname.includes('calltrackingmetrics') || hostname.includes('ctm'))
            && (pathname === '/calls/phone' || pathname.endsWith('/calls/phone'));
    }
    
    function startCallMonitoring() {
        try {
            // Create call monitor
            const callMonitor = new CallMonitor();
            callMonitor.init();
            
            // Store globally for debugging
            window.ATS_CALL_MONITOR = callMonitor;
            
            console.log('[ATS] Call monitoring started');
            
            // Show status
            showStatus('ATS Active - Monitoring Calls');
            
        } catch (e) {
            console.error('[ATS] Error starting monitor:', e);
        }
    }
    
    function setupMessageListener() {
        // Listen for messages from background script
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                console.log('[ATS] Message received:', message);
                
                if (message.type === 'GET_STATUS') {
                    sendResponse({ status: 'ok', call: window.ATS_CALL_MONITOR?.currentCall });
                }
                
                return true;
            });
        }
    }
    
    function showStatus(message) {
        // Set page title to show status
        document.title = '📞 ' + message;
    }
    
    // Also export for global access
    window.ATS = {
        version: '2.2.0',
        callMonitor: null
    };
    
})();
