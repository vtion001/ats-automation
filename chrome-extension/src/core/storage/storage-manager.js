/**
 * ATS Storage Manager
 * Wraps chrome.storage with typed interface
 * Maintains FULL backward compatibility with existing storage keys
 */

class ATSStorageManager {
    constructor() {
        this.namespace = 'ats_';
        this.initialized = false;
    }
    
    /**
     * Initialize storage - load config
     */
    async init() {
        if (this.initialized) return;
        
        // Load initial config
        await this.loadConfig();
        this.initialized = true;
        
        console.log('[ATS Storage] Initialized');
    }
    
    /**
     * Get value from storage
     * @param {string|string[]|Object} keys - Key(s) to retrieve
     * @returns {Promise<Object>}
     */
    async get(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, (result) => {
                resolve(result);
            });
        });
    }
    
    /**
     * Set value in storage
     * @param {Object} items - Key-value pairs to store
     * @returns {Promise}
     */
    async set(items) {
        return new Promise((resolve) => {
            chrome.storage.local.set(items, () => {
                resolve(true);
            });
        });
    }
    
    /**
     * Remove value from storage
     * @param {string|string[]} keys - Key(s) to remove
     * @returns {Promise}
     */
    async remove(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.remove(keys, () => {
                resolve(true);
            });
        });
    }
    
    /**
     * Clear all storage
     * @returns {Promise}
     */
    async clear() {
        return new Promise((resolve) => {
            chrome.storage.local.clear(() => {
                resolve(true);
            });
        });
    }
    
    // =========================================================================
    // CONVENIENCE METHODS - BACKWARD COMPATIBLE
    // =========================================================================
    
    /**
     * Get config (backward compatible)
     */
    async getConfig() {
        // Try new format first
        const result = await this.get('ats_config');
        if (result.ats_config) {
            return result.ats_config;
        }
        
        // Fall back to old format
        const keys = [
            'activeClient',
            'automationEnabled',
            'autoSearchSF',
            'transcriptionEnabled',
            'aiAnalysisEnabled',
            'saveMarkdown',
            'salesforceUrl',
            'aiServerUrl',
            'ctmUrl'
        ];
        
        const legacy = await this.get(keys);
        
        // Merge into config object
        return {
            activeClient: legacy.activeClient || 'flyland',
            automationEnabled: legacy.automationEnabled !== false,
            autoSearchSF: legacy.autoSearchSF !== false,
            transcriptionEnabled: legacy.transcriptionEnabled !== false,
            aiAnalysisEnabled: legacy.aiAnalysisEnabled !== false,
            saveMarkdown: legacy.saveMarkdown !== false,
            salesforceUrl: legacy.salesforceUrl || 'https://flyland.my.salesforce.com',
            aiServerUrl: legacy.aiServerUrl || 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io',
            ctmUrl: legacy.ctmUrl || 'https://app.calltrackingmetrics.com'
        };
    }
    
    /**
     * Save config (backward compatible)
     */
    async saveConfig(config) {
        // Save in both new and old format for compatibility
        await this.set({
            'ats_config': config,
            ...config
        });
    }
    
    /**
     * Get specific config value
     */
    async getConfigValue(key) {
        const config = await this.getConfig();
        return config[key];
    }
    
    /**
     * Set specific config value
     */
    async setConfigValue(key, value) {
        const config = await this.getConfig();
        config[key] = value;
        await this.saveConfig(config);
    }
    
    /**
     * Load config into memory (for ATS core)
     */
    async loadConfig() {
        const config = await this.getConfig();
        
        // Set as global for backward compatibility
        if (typeof window !== 'undefined') {
            window.ATS_CONFIG = config;
        }
        
        return config;
    }
    
    // =========================================================================
    // NOTES MANAGEMENT
    // =========================================================================
    
    /**
     * Get notes for a client
     */
    async getNotes(clientId) {
        const key = `ats_notes_${clientId}`;
        const result = await this.get(key);
        return result[key] || [];
    }
    
    /**
     * Save notes for a client
     */
    async saveNotes(clientId, notes) {
        const key = `ats_notes_${clientId}`;
        await this.set({ [key]: notes });
    }
    
    /**
     * Add a note
     */
    async addNote(clientId, note, source = 'manual') {
        const notes = await this.getNotes(clientId);
        notes.unshift({
            id: Date.now().toString(),
            text: note,
            source,
            timestamp: new Date().toISOString()
        });
        await this.saveNotes(clientId, notes);
        return notes;
    }
    
    /**
     * Delete a note
     */
    async deleteNote(clientId, noteId) {
        const notes = await this.getNotes(clientId);
        const filtered = notes.filter(n => n.id !== noteId);
        await this.saveNotes(clientId, filtered);
        return filtered;
    }
    
    // =========================================================================
    // STATS
    // =========================================================================
    
    /**
     * Get stats
     */
    async getStats() {
        const result = await this.get('ats_stats');
        return result.ats_stats || { calls: 0, searches: 0, analysis: 0 };
    }
    
    /**
     * Increment stat
     */
    async incrementStat(statName) {
        const stats = await this.getStats();
        stats[statName] = (stats[statName] || 0) + 1;
        await this.set({ 'ats_stats': stats });
        return stats;
    }
    
    // =========================================================================
    // QUALIFICATION
    // =========================================================================
    
    /**
     * Get qualification data
     */
    async getQualification(clientId) {
        const key = `ats_qualification_${clientId}`;
        const result = await this.get(key);
        return result[key] || null;
    }
    
    /**
     * Save qualification data
     */
    async saveQualification(clientId, data) {
        const key = `ats_qualification_${clientId}`;
        await this.set({ [key]: data });
    }
    
    // =========================================================================
    // EVENT LISTENERS
    // =========================================================================
    
    /**
     * Listen for storage changes
     */
    onChanged(callback) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local') {
                callback(changes);
            }
        });
    }
}

// Global storage manager instance
const storageManager = new ATSStorageManager();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ATSStorageManager, storageManager };
} else if (typeof window !== 'undefined') {
    window.ATSStorageManager = ATSStorageManager;
    window.storageManager = storageManager;
    // Backward compatibility alias
    window.ATS_STORAGE = storageManager;
}
