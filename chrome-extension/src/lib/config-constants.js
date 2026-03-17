/**
 * AGS Configuration Constants
 * Default values and storage keys used across the extension
 */

// Only declare if not already defined
if (typeof window.ATS_CONFIG_DEFAULTS === 'undefined') {
var ATS_CONFIG_DEFAULTS = {
    // Active client
    activeClient: 'flyland',
    
    // Automation toggles
    callMonitorEnabled: true,
    sfSyncEnabled: true,
    aiEnabled: true,
    transcriptionEnabled: true,
    saveMarkdown: true,
    
    // UI preferences
    popupFloatEnabled: false,
    
    // Server URLs - Pre-configured for Flyland
    aiServerUrl: 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io',
    salesforceUrl: 'https://flyland.my.salesforce.com',
    ctmUrl: 'https://app.calltrackingmetrics.com'
};
}

if (typeof window.ATS_STORAGE_KEYS === 'undefined') {
var ATS_STORAGE_KEYS = {
    CONFIG: 'ats_config',
    STATS: 'ats_stats',
    NOTES_PREFIX: 'ats_notes_',
    QUALIFICATION: 'ats_qualification',
    CACHE: 'ats_cache'
};
}

// Client configurations - pre-configured
if (typeof window.ATS_CLIENTS === 'undefined') {
var ATS_CLIENTS = {
    flyland: {
        name: 'Flyland Recovery',
        industry: 'Addiction Counseling',
        sfDomain: 'flyland.my.salesforce.com',
        salesforceUrl: 'https://flyland.my.salesforce.com',
        ctmUrl: 'https://app.calltrackingmetrics.com',
        enabled: true
    },
    legacy: {
        name: 'Legacy Services',
        industry: 'BPO Services',
        sfDomain: '',
        salesforceUrl: '',
        ctmUrl: 'https://app.calltrackingmetrics.com',
        enabled: false
    },
    tbt: {
        name: 'TBT Communications',
        industry: 'Telecom BPO',
        sfDomain: '',
        salesforceUrl: '',
        ctmUrl: 'https://app.calltrackingmetrics.com',
        enabled: false
    },
    banyan: {
        name: 'Banyan Health',
        industry: 'Addiction Counseling',
        sfDomain: '',
        salesforceUrl: '',
        ctmUrl: 'https://app.calltrackingmetrics.com',
        enabled: false
    },
    takami: {
        name: 'Takahami Medical',
        industry: 'Medical Billing',
        sfDomain: '',
        salesforceUrl: '',
        ctmUrl: 'https://app.calltrackingmetrics.com',
        enabled: false
    },
    element: {
        name: 'Element Medical',
        industry: 'Medical Billing',
        sfDomain: '',
        salesforceUrl: '',
        ctmUrl: 'https://app.calltrackingmetrics.com',
        enabled: false
    }
};
}

if (typeof window !== 'undefined') {
    window.ATS_CONFIG_DEFAULTS = window.ATS_CONFIG_DEFAULTS || ATS_CONFIG_DEFAULTS;
    window.ATS_STORAGE_KEYS = window.ATS_STORAGE_KEYS || ATS_STORAGE_KEYS;
    window.ATS_CLIENTS = window.ATS_CLIENTS || ATS_CLIENTS;
}
