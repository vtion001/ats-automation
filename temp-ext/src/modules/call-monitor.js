/**
 * Call Monitor - CTM Softphone Integration
 * Detects calls from CTM softphone elements, shows overlay with call info.
 */

class CallMonitor {
    constructor() {
        this.ctmService = new CTMService();
        this.currentCall = null;
        this.isMonitoring = false;
    }

    async init() {
        ATS.logger.info('[CallMonitor] Initializing...');

        this.startMonitoring();

        return true;
    }

    startMonitoring() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;

        this.ctmService.startMonitoring((callData) => {
            this.handleNewCall(callData);
        });

        ATS.logger.info('[CallMonitor] Started monitoring');
    }

    handleNewCall(callData) {
        if (!callData || !callData.phoneNumber) return;

        if (this.currentCall && this.currentCall.phoneNumber === callData.phoneNumber) {
            return;
        }

        ATS.logger.info('[CallMonitor] New call:', callData);

        this.currentCall = callData;

        this.showCallOverlay(callData);

        if (chrome && chrome.runtime) {
            chrome.runtime.sendMessage({
                type: 'CALL_DETECTED',
                payload: callData
            });
        }
    }

    showCallOverlay(callData) {
        const phoneNumber = callData.phoneNumber || 'Unknown';
        const callerName = callData.callerName || 'Unknown Caller';
        const direction = callData.direction || 'inbound';

        chrome.runtime.sendMessage({
            type: 'SHOW_CALL_IN_PROGRESS',
            payload: {
                phoneNumber,
                callerName,
                direction,
                status: callData.status
            }
        });
    }

    stopMonitoring() {
        this.ctmService.stopMonitoring();
        this.isMonitoring = false;
        this.currentCall = null;
    }
}

if (typeof window !== 'undefined') {
    window.CallMonitor = CallMonitor;
}
