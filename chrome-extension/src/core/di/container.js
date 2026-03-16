/**
 * ATS Dependency Injection Container
 * Simple service locator pattern for extension services
 * Maintains backward compatibility with existing global objects
 */

class ATSContainer {
    constructor() {
        this.services = new Map();
        this.factories = new Map();
        this.instances = new Map();
    }
    
    /**
     * Register a service factory
     * @param {string} name - Service name
     * @param {Function} factory - Factory function that returns service instance
     * @param {boolean} singleton - If true, returns same instance every time
     */
    register(name, factory, singleton = true) {
        this.factories.set(name, { factory, singleton });
    }
    
    /**
     * Get a service instance
     * @param {string} name - Service name
     * @returns {*} Service instance
     */
    get(name) {
        // Check if it's already instantiated
        if (this.instances.has(name)) {
            return this.instances.get(name);
        }
        
        // Check if factory exists
        if (!this.factories.has(name)) {
            console.warn(`[ATS Container] Service not registered: ${name}`);
            return null;
        }
        
        const { factory, singleton } = this.factories.get(name);
        
        // Create instance
        const instance = factory(this);
        
        // Store if singleton
        if (singleton) {
            this.instances.set(name, instance);
        }
        
        return instance;
    }
    
    /**
     * Check if service is registered
     * @param {string} name - Service name
     * @returns {boolean}
     */
    has(name) {
        return this.factories.has(name);
    }
    
    /**
     * Clear all services (useful for testing)
     */
    clear() {
        this.services.clear();
        this.factories.clear();
        this.instances.clear();
    }
    
    /**
     * Get all registered service names
     * @returns {string[]}
     */
    getServiceNames() {
        return Array.from(this.factories.keys());
    }
}

// Global container instance
const container = new ATSContainer();

// Service token constants for type safety
const SERVICE_TOKENS = {
    STORAGE: 'storage',
    MESSAGING: 'messaging',
    CONFIG: 'config',
    CTM_SERVICE: 'ctmService',
    SALESFORCE_SERVICE: 'salesforceService',
    SALESFORCE_CONTACT_SERVICE: 'salesforceContactService',
    SALESFORCE_ACTION_SERVICE: 'salesforceActionService',
    TRANSCRIPTION_SERVICE: 'transcriptionService',
    AI_SERVICE: 'aiService',
    CALLER_INFO_SERVICE: 'callerInfoService',
    CLIENT_MANAGER: 'clientManager'
};

// Export for both module and global use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ATSContainer, container, SERVICE_TOKENS };
} else if (typeof window !== 'undefined') {
    window.ATSContainer = ATSContainer;
    window.atsContainer = container;
    window.SERVICE_TOKENS = SERVICE_TOKENS;
}
