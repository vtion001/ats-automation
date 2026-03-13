/**
 * Storage Service - Handles all chrome.storage operations
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
        const result = await this.get('ats_config');
        return result.ats_config || {};
    },

    async saveConfig(updates) {
        const result = await this.get('ats_config');
        const config = result.ats_config || {};
        Object.assign(config, updates);
        await this.set({ ats_config: config });
        return config;
    },

    async getStats() {
        const result = await this.get('ats_stats');
        return result.ats_stats || { calls: 0, searches: 0, analysis: 0 };
    },

    async updateStats(updates) {
        const stats = await this.getStats();
        Object.assign(stats, updates);
        await this.set({ ats_stats: stats });
        return stats;
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
    }
};

window.StorageService = StorageService;
