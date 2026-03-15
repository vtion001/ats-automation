/**
 * AGS Configuration Page Script
 * Uses shared StorageService and config constants
 */

document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    setupEventListeners();
});

async function loadConfig() {
    const defaults = StorageService.getDefaults();
    const keys = Object.keys(defaults);
    const result = await StorageService.get(keys);
    
    document.getElementById('clientSelect').value = result.activeClient || defaults.activeClient;
    document.getElementById('automationEnabled').checked = result.automationEnabled !== false;
    document.getElementById('autoSearchSF').checked = result.autoSearchSF !== false;
    document.getElementById('transcriptionEnabled').checked = result.transcriptionEnabled !== false;
    document.getElementById('aiAnalysisEnabled').checked = result.aiAnalysisEnabled !== false;
    document.getElementById('saveMarkdown').checked = result.saveMarkdown !== false;
    document.getElementById('salesforceUrl').value = result.salesforceUrl || defaults.salesforceUrl;
    document.getElementById('aiServerUrl').value = result.aiServerUrl || defaults.aiServerUrl;
    document.getElementById('ctmUrl').value = result.ctmUrl || defaults.ctmUrl;
    document.getElementById('ctmSelectors').value = result.ctmSelectors || defaults.ctmSelectors || '.call-status, .incoming-call, .phone-number';
}

function setupEventListeners() {
    const defaults = StorageService.getDefaults();
    
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
            ctmUrl: document.getElementById('ctmUrl').value,
            ctmSelectors: document.getElementById('ctmSelectors').value
        };

        try {
            await StorageService.set(config);
            showStatus('Configuration saved successfully!', 'success');
        } catch (e) {
            showStatus('Error saving configuration', 'error');
        }
    });

    document.getElementById('resetBtn').addEventListener('click', async () => {
        await StorageService.set(defaults);
        await loadConfig();
        showStatus('Configuration reset to defaults', 'info');
    });

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
    
    requestAnimationFrame(() => {
        status.classList.add('visible');
    });
    
    if (window._statusTimeout) clearTimeout(window._statusTimeout);
    window._statusTimeout = setTimeout(() => {
        status.classList.remove('visible');
    }, 3000);
}
