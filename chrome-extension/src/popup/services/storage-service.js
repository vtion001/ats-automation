/**
 * Storage Service - Handles all chrome.storage operations
 * Uses ATS_CONFIG_DEFAULTS and ATS_STORAGE_KEYS from config-constants.js
 */

const StorageService = {
    initialized: false,
    
    async get(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, resolve);
        });
    },

    async set(items) {
        return new Promise((resolve) => {
            chrome.storage.local.set(items, resolve);
        });
    },

    // Initialize storage with defaults if empty
    async init() {
        if (this.initialized) return;
        
        try {
            const result = await this.get(ATS_STORAGE_KEYS.CONFIG);
            const config = result[ATS_STORAGE_KEYS.CONFIG];
            
            if (!config || Object.keys(config).length === 0) {
                console.log('[StorageService] Initializing with defaults...');
                await this.set({ [ATS_STORAGE_KEYS.CONFIG]: ATS_CONFIG_DEFAULTS });
                console.log('[StorageService] Defaults loaded:', ATS_CONFIG_DEFAULTS);
            }
            this.initialized = true;
        } catch (error) {
            console.error('[StorageService] Init error:', error);
        }
    },

    async getConfig() {
        // Ensure initialized before getting config
        await this.init();
        const result = await this.get(ATS_STORAGE_KEYS.CONFIG);
        const config = result[ATS_STORAGE_KEYS.CONFIG];
        
        // Merge with defaults if partial config
        if (config && Object.keys(config).length > 0) {
            return { ...ATS_CONFIG_DEFAULTS, ...config };
        }
        return ATS_CONFIG_DEFAULTS;
    },

    async saveConfig(updates) {
        const result = await this.get(ATS_STORAGE_KEYS.CONFIG);
        const config = result[ATS_STORAGE_KEYS.CONFIG] || {};
        Object.assign(config, updates);
        await this.set({ [ATS_STORAGE_KEYS.CONFIG]: config });
        return config;
    },

    async getStats() {
        const result = await this.get(ATS_STORAGE_KEYS.STATS);
        return result[ATS_STORAGE_KEYS.STATS] || { calls: 0, searches: 0, analysis: 0 };
    },

    async updateStats(updates) {
        const stats = await this.getStats();
        Object.assign(stats, updates);
        await this.set({ [ATS_STORAGE_KEYS.STATS]: stats });
        return stats;
    },

    // Increment a specific stat counter
    async incrementStat(statName) {
        const stats = await this.getStats();
        if (stats[statName] !== undefined) {
            stats[statName]++;
        } else {
            stats[statName] = 1;
        }
        await this.set({ [ATS_STORAGE_KEYS.STATS]: stats });
        return stats;
    },

    // Convenience methods
    async incrementCalls() {
        return this.incrementStat('calls');
    },

    async incrementSearches() {
        return this.incrementStat('searches');
    },

    async incrementAnalysis() {
        return this.incrementStat('analysis');
    },

    async getNotes(clientId) {
        const key = ATS_STORAGE_KEYS.NOTES_PREFIX + clientId;
        const result = await this.get(key);
        return result[key] || [];
    },

    async saveNotes(clientId, notes) {
        const key = ATS_STORAGE_KEYS.NOTES_PREFIX + clientId;
        await this.set({ [key]: notes });
    },

    async testStorage() {
        return new Promise((resolve) => {
            this.set({ '__test_key': 'test_value' }).then(() => {
                this.get('__test_key').then((result) => {
                    this.set({ '__test_key': null }).then(() => {
                        resolve(result['__test_key'] === 'test_value');
                    });
                });
            });
        });
    },

    getDefaults() {
        return ATS_CONFIG_DEFAULTS;
    }
};

window.StorageService = StorageService;
