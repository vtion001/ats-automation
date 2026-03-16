/**
 * Salesforce Actions Service
 * Handles Salesforce "Log a Call" and "New Task" actions
 */

class SalesforceActionsService {
    constructor() {
        this.baseUrl = '';
        this.currentRecordId = null;
        this.currentRecordType = null;
    }

    // Initialize with config
    async init() {
        const salesforceUrl = await ATS.storage.get('salesforceUrl');
        this.baseUrl = salesforceUrl || ATS.config.salesforceUrl;
        ATS.logger.info('Salesforce Actions Service initialized', this.baseUrl);
    }

    // Get Log a Call URL for a record
    getLogCallUrl(recordId, recordType = 'Lead') {
        const encodedSubject = encodeURIComponent('Inbound Call');
        const encodedNote = encodeURIComponent('');
        return `${this.baseUrl}/lightning/action/root/LogCall?recordId=${recordId}&actionName=LogCall&flowName=LogCall&subject=${encodedSubject}&description=${encodedNote}`;
    }

    // Get New Task URL for a record
    getNewTaskUrl(recordId, taskData = {}) {
        const subject = encodeURIComponent(taskData.subject || 'Follow-up Call');
        const dueDate = taskData.dueDate || '';
        const priority = taskData.priority || 'Normal';
        return `${this.baseUrl}/lightning/action/root/NewTask?recordId=${recordId}&actionName=NewTask&flowName=NewTask&subject=${subject}&dueDate=${dueDate}&priority=${priority}`;
    }

    // Open Log a Call modal/page
    async logCall(recordId, callData) {
        ATS.logger.info('Opening Log a Call for record:', recordId, callData);
        
        if (!this.baseUrl) {
            ATS.logger.error('Salesforce URL not configured');
            return { success: false, error: 'Salesforce URL not configured' };
        }

        try {
            // Build the LogCall URL with data pre-filled
            const subject = encodeURIComponent(callData.callSubject || 'Inbound Call');
            const description = encodeURIComponent(callData.callNotes || '');
            
            // Try the standard Lightning action URL first
            let logCallUrl = `${this.baseUrl}/lightning/action/root/LogCall?recordId=${recordId}&subject=${subject}&description=${description}`;
            
            // Alternative: Use the Quick Action API URL
            // This opens the standard Log a Call dialog
            const quickActionUrl = `${this.baseUrl}/lightning/actions/quickAction/LogCall/LogCall?recordId=${recordId}&quickActionName=LogCall`;
            
            // Get the SF tab
            const tabs = await this.getSFTabs();
            
            if (tabs.length > 0) {
                await chrome.tabs.update(tabs[0].id, { url: quickActionUrl, active: true });
                ATS.logger.info('Updated existing SF tab with Log a Call');
            } else {
                await chrome.tabs.create({ url: quickActionUrl });
                ATS.logger.info('Created new SF tab with Log a Call');
            }
            
            // Send message to populate the form
            setTimeout(() => {
                this.populateLogCallForm(callData);
            }, 2000);
            
            return { success: true, url: quickActionUrl };
        } catch (error) {
            ATS.logger.error('Error opening Log a Call:', error);
            return { success: false, error };
        }
    }

    // Open New Task modal/page
    async createTask(recordId, taskData) {
        ATS.logger.info('Creating New Task for record:', recordId, taskData);
        
        if (!this.baseUrl) {
            ATS.logger.error('Salesforce URL not configured');
            return { success: false, error: 'Salesforce URL not configured' };
        }

        try {
            const subject = encodeURIComponent(taskData.taskSubject || 'Follow-up Call');
            const dueDate = taskData.taskDueDate || '';
            const priority = taskData.priority || 'Normal';
            const description = encodeURIComponent(taskData.callNotes || '');
            
            // Quick Action URL for New Task
            const quickActionUrl = `${this.baseUrl}/lightning/actions/quickAction/NewTask/NewTask?recordId=${recordId}&quickActionName=NewTask`;
            
            // Get the SF tab
            const tabs = await this.getSFTabs();
            
            if (tabs.length > 0) {
                await chrome.tabs.update(tabs[0].id, { url: quickActionUrl, active: true });
                ATS.logger.info('Updated existing SF tab with New Task');
            } else {
                await chrome.tabs.create({ url: quickActionUrl });
                ATS.logger.info('Created new SF tab with New Task');
            }
            
            // Send message to populate the form after page loads
            setTimeout(() => {
                this.populateTaskForm(taskData);
            }, 2000);
            
            return { success: true, url: quickActionUrl };
        } catch (error) {
            ATS.logger.error('Error opening New Task:', error);
            return { success: false, error };
        }
    }

    // Populate Log Call form using content script messaging
    async populateLogCallForm(callData) {
        try {
            const tabs = await chrome.tabs.query({ url: '*://*.salesforce.com/*' });
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'POPULATE_LOG_CALL',
                    payload: {
                        subject: callData.callSubject || 'Inbound Call',
                        description: callData.callNotes || '',
                        phone: callData.phone
                    }
                });
            }
        } catch (error) {
            ATS.logger.error('Error populating Log Call form:', error);
        }
    }

    // Populate Task form using content script messaging
    async populateTaskForm(taskData) {
        try {
            const tabs = await chrome.tabs.query({ url: '*://*.salesforce.com/*' });
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'POPULATE_TASK',
                    payload: {
                        subject: taskData.taskSubject || 'Follow-up Call',
                        dueDate: taskData.taskDueDate || '',
                        priority: taskData.priority || 'Normal',
                        description: taskData.callNotes || ''
                    }
                });
            }
        } catch (error) {
            ATS.logger.error('Error populating Task form:', error);
        }
    }

    // Get all Salesforce tabs
    async getSFTabs() {
        return new Promise(resolve => {
            chrome.tabs.query({ url: '*://*.salesforce.com/*' }, resolve);
        });
    }

    // Execute action based on AI analysis
    async executeSfAction(recordId, actionData, phone) {
        ATS.logger.info('Executing SF action:', actionData, 'for record:', recordId);

        // First, navigate to the record if not already there
        if (recordId) {
            const tabs = await this.getSFTabs();
            if (tabs.length > 0) {
                // Navigate to record detail page first
                await chrome.tabs.update(tabs[0].id, { 
                    url: `${this.baseUrl}/${recordId}`,
                    active: true 
                });
                
                // Wait for page to load, then execute action
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        // Execute the appropriate action
        if (actionData.action === 'new_task') {
            return await this.createTask(recordId, actionData);
        } else {
            return await this.logCall(recordId, actionData);
        }
    }

    // Find record ID from current Salesforce session by phone number
    async findRecordByPhone(phoneNumber) {
        ATS.logger.info('Searching for record by phone:', phoneNumber);
        
        if (!this.baseUrl) {
            return null;
        }

        try {
            // Open search in Salesforce
            const searchUrl = `${this.baseUrl}/lightning/setup/Search/home?ws=%2Fsearch%2F%3FsearchType%3D2%26q%3D${encodeURIComponent(phoneNumber)}`;
            
            const tabs = await this.getSFTabs();
            
            if (tabs.length > 0) {
                await chrome.tabs.update(tabs[0].id, { url: searchUrl, active: true });
            } else {
                await chrome.tabs.create({ url: searchUrl });
            }
            
            return { searchUrl };
        } catch (error) {
            ATS.logger.error('Error searching for record:', error);
            return null;
        }
    }

    // Get current active Salesforce record from page
    async getCurrentRecord() {
        try {
            const tabs = await this.getSFTabs();
            if (tabs.length === 0) return null;

            return new Promise(resolve => {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_CURRENT_RECORD' }, response => {
                    resolve(response || null);
                });
            });
        } catch (error) {
            ATS.logger.error('Error getting current record:', error);
            return null;
        }
    }
}

window.SalesforceActionsService = SalesforceActionsService;
