/**
 * Constants and Configuration
 */

export const CONFIG = {
    SERVER_URL: 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io',
    DOM_POLL_INTERVAL: 2000,
    API_POLL_INTERVAL: 3000,
    STORAGE_KEY: 'ats_latest_analysis'
};

export const CLIENTS = [
    { id: 'flyland', name: 'Flyland Recovery' },
    { id: 'legacy', name: 'Legacy Services' },
    { id: 'tbt', name: 'TBT Communications' },
    { id: 'banyan', name: 'Banyan Health' },
    { id: 'takami', name: 'Takahami Medical' },
    { id: 'element', name: 'Element Medical' }
];

export const SCORE_THRESHOLDS = {
    HOT: 70,
    WARM: 40
};

export const SENTIMENT_LABELS = {
    positive: 'Positive',
    neutral: 'Neutral',
    negative: 'Negative'
};

export const MESSAGE_TYPES = {
    CALL_DETECTED: 'call_detected',
    CALL_ENDED: 'call_ended',
    ANALYSIS_COMPLETE: 'analysis_complete',
    ERROR: 'error'
};
