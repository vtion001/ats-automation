/**
 * ATS Popup - Main extension popup
 */

document.addEventListener('DOMContentLoaded', async () => {
    const clientSelect = document.getElementById('clientSelect');
    const automationToggle = document.getElementById('automationToggle');
    const testBtn = document.getElementById('testBtn');
    const configBtn = document.getElementById('configBtn');
    const statusEl = document.querySelector('.status');

    // Load config
    await ATS.init();
    loadConfig();

    // Client selection
    clientSelect.addEventListener('change', async (e) => {
        const client = e.target.value;
        await ATS.saveConfig({ activeClient: client });
        updateStatus(`Switched to ${client}`);
    });

    // Automation toggle
    automationToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        await ATS.saveConfig({ automationEnabled: enabled });
        updateStatus(enabled ? 'Automations enabled' : 'Automations disabled');
    });

    // Test connection
    testBtn.addEventListener('click', async () => {
        updateStatus('Testing connection...');
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            chrome.tabs.sendMessage(tab.id, { type: 'PING' }, (response) => {
                if (chrome.runtime.lastError) {
                    updateStatus('Extension active (content script may not be loaded)');
                } else {
                    updateStatus('Connection OK');
                }
            });
        } catch (error) {
            updateStatus('Error testing connection');
        }
    });

    // Open config - using the correct URL method
    configBtn.addEventListener('click', () => {
        const configUrl = chrome.runtime.getURL('config/config.html');
        window.open(configUrl, '_blank');
    });

    async function loadConfig() {
        const config = ATS.config;
        
        if (config.activeClient) {
            clientSelect.value = config.activeClient;
        }
        
        if (config.automationEnabled !== undefined) {
            automationToggle.checked = config.automationEnabled;
        }
    }

    function updateStatus(message) {
        statusEl.textContent = message;
        statusEl.classList.remove('active');
        
        setTimeout(() => {
            statusEl.textContent = 'Ready';
            statusEl.classList.add('active');
        }, 2000);
    }
});
