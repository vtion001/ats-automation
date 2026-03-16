/**
 * Client Manager
 * Handles loading and managing client-specific configurations
 */

class ClientManager {
    constructor() {
        this.currentClient = null;
        this.clientConfig = null;
        this.domProfiles = {};
        this.templates = {};
        this.knowledgeBase = null;
    }

    /**
     * Initialize with default client
     */
    async init(defaultClient = 'flyland') {
        await this.loadClient(defaultClient);
    }

    /**
     * Load a client configuration
     */
    async loadClient(clientId) {
        console.log('[ClientManager] Loading client:', clientId);

        try {
            // Load client config
            const configUrl = chrome.runtime.getURL(`clients/${clientId}/config.json`);
            const configResponse = await fetch(configUrl);

            if (!configResponse.ok) {
                throw new Error(`Config not found for ${clientId}`);
            }

            this.clientConfig = await configResponse.json();
            this.currentClient = clientId;

            // Load DOM profiles for configured systems
            await this.loadDOMProfiles();

            // Load templates
            await this.loadTemplates();

            // Load knowledge base
            await this.loadKnowledgeBase();

            console.log('[ClientManager] Client loaded:', clientId, this.clientConfig);
            return this.clientConfig;

        } catch (error) {
            console.error('[ClientManager] Error loading client:', error);
            return null;
        }
    }

    /**
     * Load DOM profiles for all configured systems
     */
    async loadDOMProfiles() {
        if (!this.clientConfig?.systems) return;

        this.domProfiles = {};

        for (const systemName of Object.keys(this.clientConfig.systems)) {
            const profile = await this.loadDOMProfile(systemName);
            if (profile) {
                this.domProfiles[systemName] = profile;
            }
        }
    }

    /**
     * Load a single DOM profile
     */
    async loadDOMProfile(systemName) {
        try {
            const profileUrl = chrome.runtime.getURL(
                `clients/${this.currentClient}/dom_profiles/${systemName}.json`
            );
            const response = await fetch(profileUrl);

            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            return null;
        }
    }

    /**
     * Get DOM profile for a system
     */
    getDOMProfile(systemName) {
        return this.domProfiles[systemName] || null;
    }

    /**
     * Load templates
     */
    async loadTemplates() {
        try {
            const templateUrl = chrome.runtime.getURL(
                `clients/${this.currentClient}/templates/reply_templates.json`
            );
            const response = await fetch(templateUrl);

            if (response.ok) {
                this.templates = await response.json();
            }
        } catch (e) {
            this.templates = {};
        }
    }

    /**
     * Get templates
     */
    getTemplates() {
        return this.templates;
    }

    /**
     * Load knowledge base
     */
    async loadKnowledgeBase() {
        try {
            // Try Flyland KB first
            let kbUrl = chrome.runtime.getURL(
                `clients/${this.currentClient}/knowledge-base/flyland-kb.json`
            );
            let response = await fetch(kbUrl);

            if (!response.ok) {
                // Try generic qualification.json
                kbUrl = chrome.runtime.getURL(
                    `clients/${this.currentClient}/knowledge-base/qualification.json`
                );
                response = await fetch(kbUrl);
            }

            if (response.ok) {
                this.knowledgeBase = await response.json();
            }
        } catch (e) {
            this.knowledgeBase = null;
        }
    }

    /**
     * Get knowledge base
     */
    getKnowledgeBase() {
        return this.knowledgeBase;
    }

    /**
     * Get client configuration
     */
    getConfig() {
        return this.clientConfig;
    }

    /**
     * Get current client ID
     */
    getClientId() {
        return this.currentClient;
    }

    /**
     * Get enabled automations for current client
     */
    getEnabledAutomations() {
        if (!this.clientConfig?.automations) return [];

        return Object.entries(this.clientConfig.automations)
            .filter(([_, config]) => config.enabled)
            .map(([name, _]) => name);
    }

    /**
     * Get system configuration
     */
    getSystemConfig(systemName) {
        return this.clientConfig?.systems?.[systemName] || null;
    }

    /**
     * Check if system is enabled
     */
    isSystemEnabled(systemName) {
        const system = this.getSystemConfig(systemName);
        return system?.enabled || false;
    }
}

// Export
if (typeof window !== 'undefined') {
    window.ClientManager = ClientManager;
}
