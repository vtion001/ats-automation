/**
 * ATS Service Bootstrap
 * Registers all services with the DI container
 * Maintains backward compatibility with existing global objects
 */

(function() {
    'use strict';
    
    // Wait for dependencies to be available
    function bootstrap() {
        if (typeof window === 'undefined') return;
        
        // Check if container is available
        if (!window.atsContainer) {
            console.warn('[ATS Bootstrap] Container not available, retrying...');
            setTimeout(bootstrap, 100);
            return;
        }
        
        registerServices();
        console.log('[ATS Bootstrap] Services registered');
    }
    
    function registerServices() {
        const container = window.atsContainer;
        
        // Register Storage Manager
        container.register('storage', (c) => {
            if (window.storageManager) {
                return window.storageManager;
            }
            return new window.ATSStorageManager();
        }, true);
        
        // Register Message Bus
        container.register('messaging', (c) => {
            if (window.messageBus) {
                return window.messageBus;
            }
            return new window.ATSMessageBus();
        }, true);
        
        // Register Config Manager (uses storage)
        container.register('config', (c) => {
            return {
                async get(key) {
                    const storage = c.get('storage');
                    return storage.getConfigValue(key);
                },
                async set(key, value) {
                    const storage = c.get('storage');
                    return storage.setConfigValue(key, value);
                },
                async getAll() {
                    const storage = c.get('storage');
                    return storage.getConfig();
                }
            };
        }, true);
        
        // Register Client Manager
        container.register('clientManager', (c) => {
            return {
                async loadClient(clientName) {
                    // Load client config
                    const configUrl = chrome.runtime.getURL(`clients/${clientName}/config.json`);
                    try {
                        const response = await fetch(configUrl);
                        if (!response.ok) throw new Error('Config not found');
                        return await response.json();
                    } catch (e) {
                        console.warn(`[ClientManager] Could not load config for ${clientName}:`, e);
                        return null;
                    }
                },
                
                async getDOMProfile(clientName, system) {
                    const profileUrl = chrome.runtime.getURL(`clients/${clientName}/dom_profiles/${system}.json`);
                    try {
                        const response = await fetch(profileUrl);
                        if (!response.ok) throw new Error('Profile not found');
                        return await response.json();
                    } catch (e) {
                        return null;
                    }
                }
            };
        }, true);
        
        // Register CTM Service
        container.register('ctmService', (c) => {
            if (window.CTMService) {
                return new window.CTMService();
            }
            return null;
        }, true);
        
        // Register Salesforce Service
        container.register('salesforceService', (c) => {
            if (window.SalesforceService) {
                return new window.SalesforceService();
            }
            return null;
        }, true);
        
        // Register Salesforce Contact Service
        container.register('salesforceContactService', (c) => {
            if (window.SalesforceContactService) {
                return new window.SalesforceContactService();
            }
            return null;
        }, true);
        
        // Register Salesforce Action Service
        container.register('salesforceActionService', (c) => {
            if (window.SalesforceActionService) {
                return new window.SalesforceActionService();
            }
            return null;
        }, true);
        
        // Register Transcription Service
        container.register('transcriptionService', (c) => {
            if (window.TranscriptionService) {
                return new window.TranscriptionService();
            }
            return null;
        }, true);
        
        // Register AI Service
        container.register('aiService', (c) => {
            if (window.AIService) {
                return new window.AIService();
            }
            return null;
        }, true);
        
        // Register Caller Info Service
        container.register('callerInfoService', (c) => {
            if (window.CallerInfoService) {
                return new window.CallerInfoService();
            }
            return null;
        }, true);
        
        // Mark as bootstrapped
        window.ATS_BOOTSTRAPPED = true;
    }
    
    // Start bootstrap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})();
