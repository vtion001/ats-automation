/**
 * ATS Configuration Page Script
 */

const DEFAULT_CONFIG = {
    activeClient: 'flyland',
    automationEnabled: true,
    autoSearchSF: true,
    transcriptionEnabled: true,
    aiAnalysisEnabled: true,
    saveMarkdown: true,
    salesforceUrl: '',  // User must configure this
    aiServerUrl: 'http://localhost:8000',
    ctmSelectors: '.call-status, .incoming-call, .phone-number, .call-info, .caller-id'
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    setupEventListeners();
});

async function loadConfig() {
    const keys = Object.keys(DEFAULT_CONFIG);
    const result = await chrome.storage.local.get(keys);
    
    document.getElementById('clientSelect').value = result.activeClient || DEFAULT_CONFIG.activeClient;
    document.getElementById('automationEnabled').checked = result.automationEnabled !== false;
    document.getElementById('autoSearchSF').checked = result.autoSearchSF !== false;
    document.getElementById('transcriptionEnabled').checked = result.transcriptionEnabled !== false;
    document.getElementById('aiAnalysisEnabled').checked = result.aiAnalysisEnabled !== false;
    document.getElementById('saveMarkdown').checked = result.saveMarkdown !== false;
    document.getElementById('salesforceUrl').value = result.salesforceUrl || DEFAULT_CONFIG.salesforceUrl;
    document.getElementById('aiServerUrl').value = result.aiServerUrl || DEFAULT_CONFIG.aiServerUrl;
    document.getElementById('ctmSelectors').value = result.ctmSelectors || DEFAULT_CONFIG.ctmSelectors;
    document.getElementById('apiKey').value = result.apiKey || '';
}

function setupEventListeners() {
    // Save button
    document.getElementById('saveBtn').addEventListener('click', async () => {
        const config = {
            activeClient: document.getElementById('clientSelect').value,
            automationEnabled: document.getElementById('automationEnabled').checked,
            autoSearchSF: document.getElementById('autoSearchSF').checked,
            transcriptionEnabled: document.getElementById('transcriptionEnabled').checked,
            aiAnalysisEnabled: document.getElementById('aiAnalysisEnabled').checked,
            saveMarkdown: document.getElementById('saveMarkdown').checked,
            salesforceUrl: document.getElementById('salesforceUrl').value,
            aiServerUrl: document.getElementById('aiServerUrl').value,
            ctmSelectors: document.getElementById('ctmSelectors').value,
            apiKey: document.getElementById('apiKey').value
        };

        await chrome.storage.local.set(config);
        showStatus('Configuration saved successfully!');
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', async () => {
        await chrome.storage.local.set(DEFAULT_CONFIG);
        await loadConfig();
        showStatus('Configuration reset to defaults');
    });

    // Clear button
    document.getElementById('clearBtn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            await chrome.storage.local.clear();
            await loadConfig();
            showStatus('All data cleared', 'error');
        }
    });
}

function showStatus(message, type = 'success') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = 'status ' + type;
    setTimeout(() => status.className = 'status', 3000);
}
