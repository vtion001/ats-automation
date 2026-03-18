/**
 * CTM Service - CallTrackingMetrics Softphone Monitor
 * Detects CTM softphone calls using specific DOM elements only.
 * 
 * Monitored CTM softphone elements:
 * - main.pick-outbound (data-status attribute reflects call state)
 * - .banner[data-type="answer"] (incoming call banner)
 * - .info-body (caller number in banner)
 * - .info-title (caller name in banner)
 * - .agent-status-inbound, .agent-status-connecting (call state visibility)
 * 
 * All other page elements are IGNORED to prevent false positives.
 */

class CTMService {
    constructor() {
        this.monitorInterval = null;
        this.observer = null;
        this.callActive = false;
        this.lastPhoneNumber = null;
        this.lastBannerHash = null;
        this.currentCallData = null;

        this.CTM_CALL_STATES = ['inbound', 'outbound', 'connecting', 'ringing', 'wrapup', 'oncall'];
        this.lastMainStatus = null;
    }

    startMonitoring(onCallDetected) {
        ATS.logger.info('[CTM] Starting softphone monitoring...');

        this.onCallDetected = onCallDetected;

        this.monitorInterval = setInterval(() => {
            this.checkForCall();
        }, 1000);

        this.setupMutationObserver();
        this.checkForCall();
    }

    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        ATS.logger.info('[CTM] Stopped monitoring');
    }

    setupMutationObserver() {
        if (this.observer) return;

        const mainEl = document.querySelector('main.pick-outbound');
        if (!mainEl) return;

        this.lastMainStatus = mainEl.getAttribute('data-status');

        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-status') {
                    const newStatus = mutation.target.getAttribute('data-status');
                    if (newStatus !== this.lastMainStatus) {
                        this.lastMainStatus = newStatus;
                        ATS.logger.info('[CTM] Softphone status changed:', newStatus);
                        this.checkForCall();
                    }
                }
                if (mutation.type === 'childList') {
                    for (const added of mutation.addedNodes) {
                        if (added.nodeType === Node.ELEMENT_NODE) {
                            this.checkForCall();
                        }
                    }
                }
            }
        });

        this.observer.observe(mainEl, {
            attributes: true,
            attributeFilter: ['data-status'],
            childList: true,
            subtree: true
        });
    }

    checkForCall() {
        try {
            const mainEl = document.querySelector('main.pick-outbound');
            if (!mainEl) return null;

            const status = mainEl.getAttribute('data-status');

            const inboundBanner = this.getInboundBannerInfo();
            const inboundVisible = this.isInboundStatusVisible(mainEl, status);

            if (!inboundBanner && !inboundVisible) {
                if (this.callActive) {
                    ATS.logger.info('[CTM] Call ended (no inbound elements visible)');
                    this.callActive = false;
                    this.currentCallData = null;
                    this.lastBannerHash = null;
                }
                return null;
            }

            if (inboundBanner) {
                const bannerHash = inboundBanner.phone + '|' + inboundBanner.name + '|' + status;
                if (bannerHash !== this.lastBannerHash) {
                    this.lastBannerHash = bannerHash;
                    this.lastPhoneNumber = inboundBanner.phone;
                    this.callActive = true;

                    const callData = {
                        phoneNumber: inboundBanner.phone,
                        callerName: inboundBanner.name,
                        timestamp: new Date().toISOString(),
                        status: status || 'incoming',
                        source: 'ctm-softphone-banner'
                    };

                    ATS.logger.info('[CTM] Incoming call detected:', callData);

                    if (this.onCallDetected) {
                        this.onCallDetected(callData);
                    }

                    return callData;
                }
            } else if (inboundVisible && this.lastPhoneNumber) {
                const callData = {
                    phoneNumber: this.lastPhoneNumber,
                    callerName: null,
                    timestamp: new Date().toISOString(),
                    status: status || 'connecting',
                    source: 'ctm-softphone-status'
                };

                if (!this.callActive) {
                    this.callActive = true;
                    ATS.logger.info('[CTM] Call active (status-based):', callData);

                    if (this.onCallDetected) {
                        this.onCallDetected(callData);
                    }
                }

                return callData;
            }

        } catch (e) {
            ATS.logger.error('[CTM] Error checking for call:', e.message);
        }

        return null;
    }

    getInboundBannerInfo() {
        const banner = document.querySelector('.banner[data-type="answer"]');
        if (!banner) return null;

        const infoBody = banner.querySelector('.info-body');
        const infoTitle = banner.querySelector('.info-title');

        const phoneEl = infoBody || banner.querySelector('.info-phone, [class*="phone"], [class*="number"]');
        const nameEl = infoTitle || banner.querySelector('.info-name, [class*="caller-name"]');

        if (!phoneEl) return null;

        const phone = this.extractPhoneFromElement(phoneEl);
        if (!phone) return null;

        const name = nameEl ? nameEl.textContent?.trim() : null;

        return { phone, name };
    }

    extractPhoneFromElement(el) {
        const text = el.textContent?.trim();
        if (text && this.isPhoneNumber(text)) {
            return this.cleanPhoneNumber(text);
        }
        return null;
    }

    isInboundStatusVisible(mainEl, status) {
        const inboundStatuses = ['inbound', 'connecting', 'ringing', 'oncall'];
        if (status && inboundStatuses.includes(status)) return true;

        const inboundEl = mainEl.querySelector('.agent-status-inbound');
        const connectingEl = mainEl.querySelector('.agent-status-connecting');

        if (inboundEl && this.isElementVisible(inboundEl)) return true;
        if (connectingEl && this.isElementVisible(connectingEl)) return true;

        return false;
    }

    isElementVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    }

    isPhoneNumber(text) {
        if (!text) return false;
        const cleaned = text.replace(/^[+\s#*]+/, '').replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 15;
    }

    cleanPhoneNumber(phone) {
        if (!phone) return null;
        return phone.replace(/[^\d+]/g, '');
    }

    getCallStatus() {
        return {
            active: this.callActive,
            phoneNumber: this.lastPhoneNumber,
            callData: this.currentCallData
        };
    }
}

window.CTMService = CTMService;
