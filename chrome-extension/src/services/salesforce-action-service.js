/**
 * Salesforce Action Service
 * Handles Log a Call and New Task actions in Salesforce
 */

class SalesforceActionService {
    constructor() {
        this.baseUrl = '';
    }

    // Initialize with config
    async init() {
        const config = await ATS.storage.get('salesforceUrl');
        this.baseUrl = config.salesforceUrl || ATS.config.salesforceUrl;
        ATS.logger.info('Salesforce Action Service initialized', this.baseUrl);
    }

    // Get Log a Call URL
    getLogCallUrl(recordId) {
        return `${this.baseUrl}/lightning/actions/quickAction/LogCall/LogCall?recordId=${recordId}&quickActionName=LogCall`;
    }

    // Get New Task URL
    getNewTaskUrl(recordId) {
        return `${this.baseUrl}/lightning/actions/quickAction/NewTask/NewTask?recordId=${recordId}&quickActionName=NewTask`;
    }

    // Open Log a Call
    async logCall(recordId, actionData) {
        ATS.logger.info('Opening Log a Call for record:', recordId, actionData);
        
        if (!this.baseUrl) {
            ATS.logger.error('Salesforce URL not configured');
            return { success: false, error: 'Salesforce URL not configured' };
        }

        try {
            const logCallUrl = this.getLogCallUrl(recordId);
            
            const tabs = await this.getSFTabs();
            
            if (tabs.length > 0) {
                await chrome.tabs.update(tabs[0].id, { url: logCallUrl, active: true });
                ATS.logger.info('Updated existing SF tab with Log a Call');
            } else {
                await chrome.tabs.create({ url: logCallUrl });
                ATS.logger.info('Created new SF tab with Log a Call');
            }
            
            setTimeout(() => {
                this.populateLogCallForm(actionData);
            }, 2000);
            
            return { success: true, url: logCallUrl };
        } catch (error) {
            ATS.logger.error('Error opening Log a Call:', error);
            return { success: false, error };
        }
    }

    // Open New Task
    async createTask(recordId, actionData) {
        ATS.logger.info('Creating Task for record:', recordId, actionData);
        
        if (!this.baseUrl) {
            ATS.logger.error('Salesforce URL not configured');
            return { success: false, error: 'Salesforce URL not configured' };
        }

        try {
            const taskUrl = this.getNewTaskUrl(recordId);
            
            const tabs = await this.getSFTabs();
            
            if (tabs.length > 0) {
                await chrome.tabs.update(tabs[0].id, { url: taskUrl, active: true });
                ATS.logger.info('Updated existing SF tab with New Task');
            } else {
                await chrome.tabs.create({ url: taskUrl });
                ATS.logger.info('Created new SF tab with New Task');
            }
            
            setTimeout(() => {
                this.populateTaskForm(actionData);
            }, 2000);
            
            return { success: true, url: taskUrl };
        } catch (error) {
            ATS.logger.error('Error creating Task:', error);
            return { success: false, error };
        }
    }

    // Populate Log Call form
    async populateLogCallForm(actionData) {
        try {
            const tabs = await chrome.tabs.query({ url: '*://*.salesforce.com/*' });
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'POPULATE_LOG_CALL',
                    payload: {
                        subject: actionData.callSubject || 'Inbound Call',
                        description: actionData.callNotes || actionData.description || '',
                        phone: actionData.phone
                    }
                });
            }
        } catch (error) {
            ATS.logger.error('Error populating Log Call form:', error);
        }
    }

    // Populate Task form
    async populateTaskForm(actionData) {
        try {
            const tabs = await chrome.tabs.query({ url: '*://*.salesforce.com/*' });
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'POPULATE_TASK',
                    payload: {
                        subject: actionData.taskSubject || actionData.subject || 'Follow-up Call',
                        dueDate: actionData.taskDueDate || actionData.dueDate || '',
                        priority: actionData.priority || 'Normal',
                        description: actionData.callNotes || actionData.description || ''
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

    // Execute action based on AI decision
    async executeAction(recordId, actionData) {
        if (actionData.action === 'new_task') {
            return await this.createTask(recordId, actionData);
        } else {
            return await this.logCall(recordId, actionData);
        }
    }

    // Navigate to record first, then execute action
    async executeWithNavigation(recordId, actionData) {
        if (recordId) {
            const tabs = await this.getSFTabs();
            if (tabs.length > 0) {
                await chrome.tabs.update(tabs[0].id, { 
                    url: `${this.baseUrl}/${recordId}`,
                    active: true 
                });
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        return await this.executeAction(recordId, actionData);
    }
}

window.SalesforceActionService = SalesforceActionService;
