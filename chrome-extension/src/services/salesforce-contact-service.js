/**
 * Salesforce Contact Service
 * Handles Contact creation and management in Salesforce
 */

class SalesforceContactService {
    constructor() {
        this.baseUrl = '';
    }

    // Initialize with config
    async init() {
        const salesforceUrl = await ATS.storage.get('salesforceUrl');
        this.baseUrl = salesforceUrl || ATS.config.salesforceUrl;
        ATS.logger.info('Salesforce Contact Service initialized', this.baseUrl);
    }

    // Get contact creation URL
    getContactCreationUrl(accountId = null) {
        if (accountId) {
            return `${this.baseUrl}/lightning/action/root/NewContact?recordId=${accountId}`;
        }
        return `${this.baseUrl}/lightning/action/root/NewContact`;
    }

    // Open Contact creation page with pre-filled data
    async createContact(contactData) {
        ATS.logger.info('Creating Contact with data:', contactData);
        
        if (!this.baseUrl) {
            ATS.logger.error('Salesforce URL not configured');
            return { success: false, error: 'Salesforce URL not configured' };
        }

        try {
            const creationUrl = this.getContactCreationUrl(contactData.accountId);
            
            const tabs = await this.getSFTabs();
            
            if (tabs.length > 0) {
                await chrome.tabs.update(tabs[0].id, { url: creationUrl, active: true });
                ATS.logger.info('Updated existing SF tab with Contact creation');
            } else {
                await chrome.tabs.create({ url: creationUrl });
                ATS.logger.info('Created new SF tab with Contact creation');
            }
            
            // Pre-fill form after page loads
            setTimeout(() => {
                this.populateContactForm(contactData);
            }, 2000);
            
            return { success: true, url: creationUrl };
        } catch (error) {
            ATS.logger.error('Error creating Contact:', error);
            return { success: false, error };
        }
    }

    // Populate Contact form using content script
    async populateContactForm(contactData) {
        try {
            const tabs = await chrome.tabs.query({ url: '*://*.salesforce.com/*' });
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'POPULATE_CONTACT',
                    payload: contactData
                });
            }
        } catch (error) {
            ATS.logger.error('Error populating Contact form:', error);
        }
    }

    // Search for existing contact by phone
    async searchByPhone(phoneNumber) {
        ATS.logger.info('Searching for contact by phone:', phoneNumber);
        
        if (!this.baseUrl) {
            return null;
        }

        try {
            const searchUrl = `${this.baseUrl}/lightning/setup/Search/home?ws=%2Fsearch%2F%3FsearchType%3D2%26q%3D${encodeURIComponent(phoneNumber)}`;
            
            const tabs = await this.getSFTabs();
            
            if (tabs.length > 0) {
                await chrome.tabs.update(tabs[0].id, { url: searchUrl, active: true });
            } else {
                await chrome.tabs.create({ url: searchUrl });
            }
            
            return { searchUrl, found: false };
        } catch (error) {
            ATS.logger.error('Error searching for contact:', error);
            return null;
        }
    }

    // Get all Salesforce tabs
    async getSFTabs() {
        return new Promise(resolve => {
            chrome.tabs.query({ url: '*://*.salesforce.com/*' }, resolve);
        });
    }

    // Prepare contact data from caller info
    prepareContactData(callerInfo, phone) {
        const data = {
            phone: phone || callerInfo.phone?.value,
            firstName: '',
            lastName: '',
            description: callerInfo.callNotes || '',
            leadSource: 'Inbound Call',
            status: 'Open - Not Contacted'
        };

        // Parse name if available
        if (callerInfo.callerName?.value) {
            const nameParts = callerInfo.callerName.value.split(' ');
            if (nameParts.length > 1) {
                data.firstName = nameParts[0];
                data.lastName = nameParts.slice(1).join(' ');
            } else {
                data.lastName = nameParts[0];
            }
        }

        // Add description with call details
        let description = '';
        if (callerInfo.callNotes) {
            description += callerInfo.callNotes + '\n\n';
        }
        description += `Qualification Score: ${callerInfo.qualificationScore || 0}\n`;
        description += `Insurance: ${callerInfo.insurance?.value || 'Not specified'}\n`;
        description += `State: ${callerInfo.state?.value || 'Not specified'}\n`;
        description += `Sober Days: ${callerInfo.soberDays?.value || 'Not specified'}`;
        
        data.description = description;

        return data;
    }
}

window.SalesforceContactService = SalesforceContactService;
