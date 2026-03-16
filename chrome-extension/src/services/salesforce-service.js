/**
 * Salesforce Service
 * Handles Salesforce interactions
 */

class SalesforceService {
    constructor() {
        this.baseUrl = '';
    }

    // Initialize with config
    async init() {
        const salesforceUrl = await ATS.storage.get('salesforceUrl');
        this.baseUrl = salesforceUrl || ATS.config.salesforceUrl;
    }

    // Build search URL
    getSearchUrl(phoneNumber) {
        const searchParams = new URLSearchParams({
            searchType: '2',
            q: phoneNumber
        });
        return `${this.baseUrl}/lightning/setup/Search/home?ws=%2Fsearch%2F%3F${searchParams.toString()}`;
    }

    // Search for a phone number
    async search(phoneNumber) {
        if (!phoneNumber) return;
        
        ATS.logger.info('Searching Salesforce for:', phoneNumber);
        
        const searchUrl = this.getSearchUrl(phoneNumber);
        
        try {
            // Find existing Salesforce tab
            const tabs = await this.getSFTabs();
            
            if (tabs.length > 0) {
                // Update existing tab
                await chrome.tabs.update(tabs[0].id, { url: searchUrl, active: true });
                ATS.logger.info('Updated existing SF tab');
            } else {
                // Create new tab
                await chrome.tabs.create({ url: searchUrl });
                ATS.logger.info('Created new SF tab');
            }
            
            return { success: true, url: searchUrl };
        } catch (error) {
            ATS.logger.error('Error searching Salesforce:', error);
            return { success: false, error };
        }
    }

    // Get all Salesforce tabs
    async getSFTabs() {
        return new Promise(resolve => {
            chrome.tabs.query({ url: '*://*.salesforce.com/*' }, resolve);
        });
    }

    // Open a specific record
    async openRecord(recordId) {
        const url = `${this.baseUrl}/${recordId}`;
        await chrome.tabs.create({ url });
    }

    // Create new lead
    async createLead(data) {
        ATS.logger.info('Creating lead:', data);
        // Would use Salesforce API here
        return { success: true, id: 'new-lead-id' };
    }
}

window.SalesforceService = SalesforceService;
