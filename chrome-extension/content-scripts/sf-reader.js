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
        if (url.includes('/lightning/r/Contact/')) return 'contact';
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
        // Match patterns like /lightning/r/Lead/0XXXXXXXXXXXX/...
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

    // Populate Log Call form fields
    function populateLogCallForm(data) {
        ATS.logger.info('Populating Log Call form with:', data);
        
        // Try to find subject field
        const subjectField = document.querySelector('[name="Subject"], input[title="Subject"], input.slds-input[placeholder*="Subject"]');
        if (subjectField && data.subject) {
            subjectField.value = data.subject;
            subjectField.dispatchEvent(new Event('input', { bubbles: true }));
            subjectField.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Try to find description/comments field
        const descField = document.querySelector('[name="Description"], textarea[title="Description"], textarea.slds-textarea');
        if (descField && data.description) {
            descField.value = data.description;
            descField.dispatchEvent(new Event('input', { bubbles: true }));
            descField.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Try to find call type dropdown
        const callTypeField = document.querySelector('[name="CallType"], select[title="Call Type"]');
        if (callTypeField) {
            // Set to Inbound
            for (let option of callTypeField.options) {
                if (option.text.includes('Inbound')) {
                    callTypeField.value = option.value;
                    callTypeField.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                }
            }
        }
    }

    // Populate New Task form fields
    function populateTaskForm(data) {
        ATS.logger.info('Populating Task form with:', data);
        
        // Try to find subject field
        const subjectField = document.querySelector('[name="Subject"], input[title="Subject"], input.slds-input[placeholder*="Subject"]');
        if (subjectField && data.subject) {
            subjectField.value = data.subject;
            subjectField.dispatchEvent(new Event('input', { bubbles: true }));
            subjectField.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Try to find due date field
        const dueDateField = document.querySelector('[name="DueDate"], input[title="Due Date"], input.slds-input[placeholder*="Date"]');
        if (dueDateField && data.dueDate) {
            dueDateField.value = data.dueDate;
            dueDateField.dispatchEvent(new Event('input', { bubbles: true }));
            dueDateField.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Try to find priority dropdown
        const priorityField = document.querySelector('[name="Priority"], select[title="Priority"]');
        if (priorityField && data.priority) {
            for (let option of priorityField.options) {
                if (option.text.includes(data.priority)) {
                    priorityField.value = option.value;
                    priorityField.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                }
            }
        }
        
        // Try to find description field
        const descField = document.querySelector('[name="Description"], textarea[title="Description"], textarea.slds-textarea');
        if (descField && data.description) {
            descField.value = data.description;
            descField.dispatchEvent(new Event('input', { bubbles: true }));
            descField.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // Listen for messages from background/popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.type) {
            case 'GET_CURRENT_RECORD':
                const recordData = getRecordData();
                sendResponse(recordData);
                break;
                
            case 'POPULATE_LOG_CALL':
                populateLogCallForm(message.payload);
                sendResponse({ success: true });
                break;
                
            case 'POPULATE_TASK':
                populateTaskForm(message.payload);
                sendResponse({ success: true });
                break;
                
            default:
                // Continue with other handlers
                break;
        }
        return true;
    });

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
