/**
 * Storage Service - Handles all chrome.storage operations
 * Uses ATS_CONFIG_DEFAULTS and ATS_STORAGE_KEYS from config-constants.js
 */

const StorageService = {
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

    async getConfig() {
        const result = await this.get(ATS_STORAGE_KEYS.CONFIG);
        return result[ATS_STORAGE_KEYS.CONFIG] || {};
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
