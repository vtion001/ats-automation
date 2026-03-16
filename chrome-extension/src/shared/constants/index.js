/**
 * ATS Shared Constants
 * ALL constants that MUST remain unchanged for backward compatibility
 * No Chrome APIs - pure JavaScript
 */

// ============================================================================
// STORAGE KEYS - PRESERVED EXACTLY AS THEY ARE
// ============================================================================

const ATS_STORAGE_KEYS = {
    CONFIG: 'ats_config',
    STATS: 'ats_stats',
    NOTES_PREFIX: 'ats_notes_',
    QUALIFICATION: 'ats_qualification',
    CACHE: 'ats_cache',
    
    // Individual keys (for backward compatibility)
    ACTIVE_CLIENT: 'activeClient',
    AUTOMATION_ENABLED: 'automationEnabled',
    AUTO_SEARCH_SF: 'autoSearchSF',
    TRANSCRIPTION_ENABLED: 'transcriptionEnabled',
    AI_ANALYSIS_ENABLED: 'aiAnalysisEnabled',
    SAVE_MARKDOWN: 'saveMarkdown',
    SALESFORCE_URL: 'salesforceUrl',
    AI_SERVER_URL: 'aiServerUrl',
    CTM_URL: 'ctmUrl',
    POPUP_FLOAT_ENABLED: 'popupFloatEnabled',
    
    // UI toggles
    CALL_MONITOR_ENABLED: 'callMonitorEnabled',
    SF_SYNC_ENABLED: 'sfSyncEnabled',
    AI_ENABLED: 'aiEnabled',
    AUTO_ANALYZE_ENABLED: 'autoAnalyzeEnabled'
};

// ============================================================================
// MESSAGE TYPES - PRESERVED EXACTLY AS THEY ARE
// ============================================================================

const ATS_MESSAGE_TYPES = {
    // Call events
    CTM_CALL_EVENT: 'CTM_CALL_EVENT',
    CALL_EVENT: 'CALL_EVENT',
    CTM_CALL_DETECTED: 'CTM_CALL_DETECTED',
    
    // Search events
    SEARCH_SALESFORCE: 'SEARCH_SALESFORCE',
    
    // Transcription
    TRANSCRIPTION_COMPLETE: 'TRANSCRIPTION_COMPLETE',
    
    // UI events
    SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',
    SHOW_OVERLAY: 'SHOW_OVERLAY',
    SHOW_CALL_SUMMARY: 'SHOW_CALL_SUMMARY',
    SHOW_CALL_INFO: 'SHOW_CALL_INFO',
    AI_ANALYSIS_RESULT: 'AI_ANALYSIS_RESULT',
    
    // Data events
    SF_RECORD_DATA: 'SF_RECORD_DATA',
    ATS_ACTION: 'ATS_ACTION',
    
    // Config events
    CLIENT_CHANGED: 'CLIENT_CHANGED',
    GET_CONFIG: 'GET_CONFIG',
    
    // System events
    PING: 'PING',
    FILL_SALESFORME_FORM: 'FILL_SALESFORME_FORM',
    INSERT_TEXT: 'INSERT_TEXT'
};

// ============================================================================
// API ENDPOINTS - PRESERVED EXACTLY AS THEY ARE
// ============================================================================

const ATS_API_ENDPOINTS = {
    HEALTH: '/health',
    TRANSCRIBE: '/api/transcribe',
    ANALYZE: '/api/analyze',
    DETERMINE_ACTION: '/api/determine-action',
    ANALYZE_FULL: '/api/analyze-full',
    TEST: '/api/test'
};

// ============================================================================
// DEFAULT CONFIGURATION - PRESERVED EXACTLY AS THEY ARE
// ============================================================================

const ATS_CONFIG_DEFAULTS = {
    // Active client
    activeClient: 'flyland',
    
    // Automation toggles
    automationEnabled: true,
    autoSearchSF: true,
    transcriptionEnabled: true,
    aiAnalysisEnabled: true,
    saveMarkdown: true,
    
    // UI preferences
    popupFloatEnabled: false,
    
    // Server URLs - Pre-configured for Flyland
    aiServerUrl: 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io',
    salesforceUrl: 'https://flyland.my.salesforce.com',
    ctmUrl: 'https://app.calltrackingmetrics.com'
};

// ============================================================================
// CLIENT CONFIGURATIONS - PRESERVED EXACTLY AS THEY ARE
// ============================================================================

const ATS_CLIENTS = {
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

// ============================================================================
// DOMAINS - PRESERVED EXACTLY AS THEY ARE
// ============================================================================

const ATS_DOMAINS = {
    CTM: [
        'calltrackingmetrics.com',
        'calltrackingmetrics.co'
    ],
    SALESFORCE: [
        'salesforce.com',
        'force.com',
        'lightning.force.com'
    ],
    ZOHO: [
        'zoho.com',
        'zoho.com.au',
        'zoho.eu'
    ],
    RINGCENTRAL: [
        'ringcentral.com'
    ],
    KIPU: [
        'kipuworks.com',
        'kipu.com'
    ],
    COLLABORATEMD: [
        'collaboratemd.com'
    ],
    AVAILITY: [
        'availity.com'
    ],
    VERIFYTX: [
        'verifytx.com'
    ]
};

// ============================================================================
// EXPORTS - Support both module and global
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ATS_STORAGE_KEYS,
        ATS_MESSAGE_TYPES,
        ATS_API_ENDPOINTS,
        ATS_CONFIG_DEFAULTS,
        ATS_CLIENTS,
        ATS_DOMAINS
    };
} else if (typeof window !== 'undefined') {
    window.ATS_CONSTANTS = {
        STORAGE_KEYS: ATS_STORAGE_KEYS,
        MESSAGE_TYPES: ATS_MESSAGE_TYPES,
        API_ENDPOINTS: ATS_API_ENDPOINTS,
        CONFIG_DEFAULTS: ATS_CONFIG_DEFAULTS,
        CLIENTS: ATS_CLIENTS,
        DOMAINS: ATS_DOMAINS
    };
}
