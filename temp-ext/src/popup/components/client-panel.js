/**
 * Client Panel Component
 * Handles client selection and configuration
 */

class ClientPanel {
    constructor() {
        this.currentClient = 'flyland';
    }

    /**
     * Initialize client panel
     */
    async init() {
        await this.loadCurrentClient();
        this.bindEvents();
    }

    /**
     * Load current client from storage
     */
    async loadCurrentClient() {
        if (window.StorageService) {
            const config = await window.StorageService.getConfig();
            this.currentClient = config.activeClient || 'flyland';
            
            const clientSelect = document.getElementById('clientSelect');
            if (clientSelect) {
                clientSelect.value = this.currentClient;
            }
        }
    }

    /**
     * Bind client-related events
     */
    bindEvents() {
        const clientSelect = document.getElementById('clientSelect');
        
        if (clientSelect) {
            clientSelect.addEventListener('change', async (e) => {
                const newClient = e.target.value;
                await this.switchClient(newClient);
            });
        }
    }

    /**
     * Switch to a different client
     */
    async switchClient(clientId) {
        if (clientId === this.currentClient) return;
        
        this.currentClient = clientId;
        
        // Save to storage
        if (window.StorageService) {
            await window.StorageService.saveConfig({ activeClient: clientId });
        }
        
        // Reload managers for new client
        if (window.NotesManager) {
            await window.NotesManager.load(clientId);
        }
        
        if (window.QualificationManager) {
            await window.QualificationManager.loadKnowledgeBase(clientId);
        }
        
        // Notify background
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({
                type: 'CLIENT_CHANGED',
                client: clientId
            });
        }
        
        console.log('[ClientPanel] Switched to client:', clientId);
    }

    /**
     * Get available clients
     */
    getAvailableClients() {
        return [
            { id: 'flyland', name: 'Flyland Recovery' },
            { id: 'legacy', name: 'Legacy Services' },
            { id: 'tbt', name: 'TBT Communications' },
            { id: 'banyan', name: 'Banyan Health' },
            { id: 'takami', name: 'Takahami Medical' },
            { id: 'element', name: 'Element Medical' }
        ];
    }

    /**
     * Get current client ID
     */
    getCurrentClient() {
        return this.currentClient;
    }
}

// Export
if (typeof window !== 'undefined') {
    window.ClientPanel = ClientPanel;
}
