document.addEventListener('DOMContentLoaded', () => {
    const clientSelect = document.getElementById('clientSelect');
    const automationToggle = document.getElementById('automationToggle');
    const testBtn = document.getElementById('testBtn');
    const configBtn = document.getElementById('configBtn');
    const statusEl = document.querySelector('.status');

    loadConfig();

    clientSelect.addEventListener('change', async (e) => {
        const client = e.target.value;
        await chrome.runtime.sendMessage({ type: 'SET_CLIENT', client });
        updateStatus(`Switched to ${client}`);
    });

    automationToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        await chrome.storage.local.set({ automationEnabled: enabled });
        updateStatus(enabled ? 'Automations enabled' : 'Automations disabled');
    });

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

    configBtn.addEventListener('click', () => {
        window.open('config/config.html', '_blank');
    });

    async function loadConfig() {
        try {
            const result = await chrome.storage.local.get(['atsConfig', 'automationEnabled']);
            
            if (result.atsConfig?.activeClient) {
                clientSelect.value = result.atsConfig.activeClient;
            }
            
            if (result.automationEnabled !== undefined) {
                automationToggle.checked = result.automationEnabled;
            }
        } catch (error) {
            console.error('Error loading config:', error);
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
