/**
 * Storage Service - Chrome Storage abstraction
 */

export const StorageService = {
    STORAGE_KEYS: {
        ANALYSIS: 'ats_latest_analysis',
        STATS: 'ats_stats',
        CLIENT: 'ats_client',
        CONFIG: 'ats_config'
    },

    /**
     * Get item(s) from storage
     */
    get(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, resolve);
        });
    },

    /**
     * Set item(s) in storage
     */
    set(items) {
        return new Promise((resolve) => {
            chrome.storage.local.set(items, resolve);
        });
    },

    /**
     * Get latest analysis result
     */
    async getLatestAnalysis() {
        const result = await this.get(this.STORAGE_KEYS.ANALYSIS);
        return result[this.STORAGE_KEYS.ANALYSIS] || null;
    },

    /**
     * Store analysis result
     */
    async setLatestAnalysis(data) {
        await this.set({ [this.STORAGE_KEYS.ANALYSIS]: data });
    },

    /**
     * Get stats
     */
    async getStats() {
        const result = await this.get(['stats_calls', 'stats_analyzed', 'stats_hot']);
        return {
            calls: result.stats_calls || 0,
            analyzed: result.stats_analyzed || 0,
            hot: result.stats_hot || 0
        };
    },

    /**
     * Update stats
     */
    async updateStats(callsDelta = 0, analyzedDelta = 0, hotDelta = 0) {
        const stats = await this.getStats();
        await this.set({
            stats_calls: stats.calls + callsDelta,
            stats_analyzed: stats.analyzed + analyzedDelta,
            stats_hot: stats.hot + hotDelta
        });
        return { ...stats, calls: stats.calls + callsDelta, analyzed: stats.analyzed + analyzedDelta, hot: stats.hot + hotDelta };
    },

    /**
     * Get selected client
     */
    async getClient() {
        const result = await this.get([this.STORAGE_KEYS.CLIENT]);
        return result[this.STORAGE_KEYS.CLIENT] || 'flyland';
    },

    /**
     * Set selected client
     */
    async setClient(client) {
        await this.set({ [this.STORAGE_KEYS.CLIENT]: client });
    },

    /**
     * Clear all storage
     */
    async clear() {
        return new Promise((resolve) => {
            chrome.storage.local.clear(resolve);
        });
    }
};

export default StorageService;
