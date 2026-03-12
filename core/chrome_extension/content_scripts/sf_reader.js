// Salesforce Reader - Extracts account data from SF pages
(function() {
    'use strict';

    const SF_READER = {
        config: null,

        init: function(config) {
            this.config = config;
            console.log('[ATS] SF Reader initialized');
        },

        extractAccountData: function() {
            const selectors = this.config?.selectors || {};
            
            const data = {
                accountName: this.getText(selectors.account_name || '.forceCommunityRecordName, .slds-truncate'),
                phone: this.getText(selectors.phone || '.phone-field, [data-field-name="Phone"]'),
                email: this.getText(selectors.email || '[data-field-name="Email"]'),
                status: this.getText(selectors.status || '.status-field'),
                lastContact: this.getText(selectors.last_contact || '[data-field-name="LastContactDate"]'),
                notes: this.getText(selectors.notes || '.note-field, .description'),
                owner: this.getText(selectors.owner || '[data-field-name="Owner"]'),
                recordType: this.getText(selectors.record_type || '.recordTypeBadge')
            };

            console.log('[ATS] Extracted SF data:', data);
            return data;
        },

        getText: function(selector) {
            try {
                const el = document.querySelector(selector);
                return el?.textContent?.trim() || null;
            } catch (e) {
                return null;
            }
        },

        searchAccount: function(phoneNumber) {
            const baseUrl = window.location.origin;
            const searchUrl = `${baseUrl}/lightning/setup/FindRecords?term=${encodeURIComponent(phoneNumber)}`;
            
            console.log('[ATS] Would search SF:', searchUrl);
            
            // Open in new tab for now
            window.open(searchUrl, '_blank');
        },

        createOverlay: function(data) {
            const existing = document.getElementById('ats-sf-overlay');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = 'ats-sf-overlay';
            overlay.innerHTML = `
                <div class="ats-overlay-header">
                    <span>SF Account Info</span>
                    <button class="ats-close">&times;</button>
                </div>
                <div class="ats-overlay-content">
                    ${Object.entries(data).map(([key, value]) => `
                        <div class="ats-field">
                            <span class="ats-label">${key.replace(/_/g, ' ')}:</span>
                            <span class="ats-value">${value || 'N/A'}</span>
                        </div>
                    `).join('')}
                </div>
            `;

            document.body.appendChild(overlay);
            
            overlay.querySelector('.ats-close').addEventListener('click', () => overlay.remove());
        }
    };

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'extractSFData') {
            const data = SF_READER.extractAccountData();
            sendResponse(data);
        } else if (message.action === 'showSFOverlay') {
            SF_READER.createOverlay(message.data);
        } else if (message.action === 'updateConfig') {
            SF_READER.init(message.config);
        }
    });

    // Load config
    chrome.storage.sync.get(['sfConfig'], (result) => {
        SF_READER.init(result.sfConfig || {});
    });
})();
