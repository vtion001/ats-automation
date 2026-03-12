// CTM Monitor - Detects call events and extracts caller information
(function() {
    'use strict';

    const CTM_MONITOR = {
        config: null,
        pollInterval: 500,
        lastCallId: null,

        init: function(config) {
            this.config = config;
            this.startMonitoring();
            console.log('[ATS] CTM Monitor initialized');
        },

        startMonitoring: function() {
            setInterval(() => this.checkForCalls(), this.pollInterval);
        },

        checkForCalls: function() {
            const callData = this.extractCallData();
            if (callData && callData.callId !== this.lastCallId) {
                this.lastCallId = callData.callId;
                this.onNewCall(callData);
            }
        },

        extractCallData: function() {
            const selectors = this.config?.selectors || {};
            
            const phoneElement = document.querySelector(selectors.phone || '.caller-phone, [class*="phone"]');
            const callerElement = document.querySelector(selectors.caller || '.caller-name, [class*="caller"]');
            const dispositionElement = document.querySelector(selectors.disposition || '#disposition');

            if (!phoneElement) return null;

            return {
                callId: this.generateCallId(),
                phone: phoneElement.textContent?.trim() || phoneElement.value,
                callerName: callerElement?.textContent?.trim(),
                disposition: dispositionElement?.value,
                timestamp: new Date().toISOString()
            };
        },

        generateCallId: function() {
            return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },

        onNewCall: function(callData) {
            console.log('[ATS] New call detected:', callData);

            this.showOverlay(callData);

            // Notify background script
            chrome.runtime.sendMessage({
                action: 'newCall',
                data: callData
            });
        },

        showOverlay: function(callData) {
            const existing = document.getElementById('ats-overlay');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = 'ats-overlay';
            overlay.innerHTML = `
                <div class="ats-overlay-header">
                    <span>ATS Automation</span>
                    <button class="ats-close">&times;</button>
                </div>
                <div class="ats-overlay-content">
                    <div class="ats-call-info">
                        <strong>Incoming Call</strong>
                        <p>Phone: ${callData.phone}</p>
                        ${callData.callerName ? `<p>Caller: ${callData.callerName}</p>` : ''}
                    </div>
                    <div class="ats-actions">
                        <button class="ats-btn-primary" id="ats-lookup-sf">Look up in SF</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Event listeners
            overlay.querySelector('.ats-close').addEventListener('click', () => overlay.remove());
            overlay.querySelector('#ats-lookup-sf').addEventListener('click', () => {
                chrome.runtime.sendMessage({
                    action: 'lookupSF',
                    data: { phone: callData.phone }
                });
            });
        }
    };

    // Load config from storage and initialize
    chrome.storage.sync.get(['ctmConfig'], (result) => {
        if (result.ctmConfig) {
            CTM_MONITOR.init(result.ctmConfig);
        } else {
            CTM_MONITOR.init({});
        }
    });

    // Listen for config updates
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'updateConfig') {
            CTM_MONITOR.init(message.config);
        }
    });
})();
