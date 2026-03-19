/**
 * ATS Services Index
 * Central export point for all services
 * Provides both new modular access and backward compatibility
 */

// Service registry for lazy loading
const ServiceRegistry = {
    _services: {},
    _factories: {},

    /**
     * Register a service
     */
    register(name, instance) {
        this._services[name] = instance;
    },

    /**
     * Register a service factory
     */
    registerFactory(name, factory) {
        this._factories[name] = factory;
    },

    /**
     * Get a service
     */
    get(name) {
        if (this._services[name]) {
            return this._services[name];
        }

        if (this._factories[name]) {
            const instance = this._factories[name]();
            this._services[name] = instance;
            return instance;
        }

        // Fallback to global
        const globalName = name.charAt(0).toUpperCase() + name.slice(1) + 'Service';
        if (window[globalName]) {
            return new window[globalName]();
        }

        return null;
    },

    /**
     * Check if service exists
     */
    has(name) {
        return !!(this._services[name] || this._factories[name] || window[name + 'Service']);
    },

    /**
     * Get all registered services
     */
    getAll() {
        const services = {};
        const known = [
            'ctm', 'salesforce', 'salesforceContact', 'salesforceAction',
            'transcription', 'ai', 'callerInfo', 'audioCapture'
        ];

        known.forEach(name => {
            const service = this.get(name);
            if (service) {
                services[name] = service;
            }
        });

        return services;
    }
};

// Register default service factories
ServiceRegistry.registerFactory('ctm', () => window.CTMService ? new window.CTMService() : null);
ServiceRegistry.registerFactory('salesforce', () => window.SalesforceService ? new window.SalesforceService() : null);
ServiceRegistry.registerFactory('salesforceContact', () => window.SalesforceContactService ? new window.SalesforceContactService() : null);
ServiceRegistry.registerFactory('salesforceAction', () => window.SalesforceActionService ? new window.SalesforceActionService() : null);
ServiceRegistry.registerFactory('transcription', () => window.TranscriptionService ? new window.TranscriptionService() : null);
ServiceRegistry.registerFactory('ai', () => window.AIService ? new window.AIService() : null);
ServiceRegistry.registerFactory('callerInfo', () => window.CallerInfoService ? new window.CallerInfoService() : null);
ServiceRegistry.registerFactory('audioCapture', () => window.AudioCaptureService ? new window.AudioCaptureService() : null);

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ServiceRegistry };
} else if (typeof window !== 'undefined') {
    window.ServiceRegistry = ServiceRegistry;
}
