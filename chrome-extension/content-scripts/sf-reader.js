/**
 * Salesforce DOM Reader
 * Extracts account/lead data from Salesforce pages
 */

(function() {
    'use strict';

    const CONFIG = {
        pollInterval: 1000,
        pageTypes: {
            account: {
                selectors: {
                    name: ['.forceRecordHeader .primaryName', '.slds-page-header__title', '[data-field-name="Name"]'],
                    phone: ['[data-field-name="Phone"]', '.phone-field', '.phone'],
                    email: ['[data-field-name="Email"]', '.email-field', '.email'],
                    status: ['[data-field-name="Status"]', '.status-field'],
                    owner: ['[data-field-name="Owner"]', '.owner-field'],
                    description: ['[data-field-name="Description"]', '.description-field']
                }
            },
            lead: {
                selectors: {
                    name: ['.forceRecordHeader .primaryName', '.slds-page-header__title'],
                    phone: ['[data-field-name="Phone"]', '.phone-field'],
                    email: ['[data-field-name="Email"]', '.email-field'],
                    company: ['[data-field-name="Company"]', '.company-field'],
                    status: ['[data-field-name="Status"]', '.status-field'],
                    leadSource: ['[data-field-name="LeadSource"]', '.lead-source']
                }
            },
            home: {
                selectors: {}
            }
        }
    };

    function detectPageType() {
        const url = window.location.href;
        
        if (url.includes('/lightning/r/Account/')) return 'account';
        if (url.includes('/lightning/r/Lead/')) return 'lead';
        if (url.includes('/lightning/page/home')) return 'home';
        
        return null;
    }

    function extractField(selectors) {
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element.textContent?.trim() || element.getAttribute('value') || null;
            }
        }
        return null;
    }

    function extractFields(fieldConfig) {
        const data = {};
        for (const [fieldName, selectors] of Object.entries(fieldConfig)) {
            const value = extractField(selectors);
            if (value) {
                data[fieldName] = value;
            }
        }
        return data;
    }

    function extractRecordId() {
        const urlMatch = window.location.href.match(/\/lightning\/r\/(\w+)\/(\w+)\//);
        if (urlMatch) {
            return {
                objectType: urlMatch[1],
                recordId: urlMatch[2]
            };
        }
        return null;
    }

    function getRecordData() {
        const pageType = detectPageType();
        if (!pageType || !CONFIG.pageTypes[pageType]) return null;

        const recordId = extractRecordId();
        const fields = extractFields(CONFIG.pageTypes[pageType].selectors);

        if (Object.keys(fields).length === 0) return null;

        return {
            pageType,
            recordId: recordId?.recordId,
            objectType: recordId?.objectType,
            fields,
            url: window.location.href,
            timestamp: Date.now()
        };
    }

    function broadcastRecordData(data) {
        chrome.runtime.sendMessage({
            type: 'SF_RECORD_DATA',
            payload: data
        });
    }

    let lastData = null;

    function startMonitoring() {
        console.log('[ATS] SF Reader started');
        
        setInterval(() => {
            const data = getRecordData();
            if (data && JSON.stringify(data) !== JSON.stringify(lastData)) {
                lastData = data;
                broadcastRecordData(data);
            }
        }, CONFIG.pollInterval);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startMonitoring);
    } else {
        startMonitoring();
    }
})();
