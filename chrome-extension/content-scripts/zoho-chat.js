/**
 * ZOHO Chat Monitor
 * Detects chat messages and extracts content for reply suggestions
 */

(function() {
    'use strict';

    const CONFIG = {
        pollInterval: 1000,
        chatSelectors: {
            messageContainer: [
                '.chat-messages',
                '.message-list',
                '.zsiq_msgcnt',
                '.chat-content'
            ],
            inputField: [
                '.chat-input',
                'textarea[placeholder*="Type"]',
                '.composer-input',
                '[contenteditable="true"]'
            ],
            customerMessage: [
                '.customer-message',
                '.message-in',
                '.zsiq_message'
            ],
            agentMessage: [
                '.agent-message',
                '.message-out'
            ]
        }
    };

    function findElement(selectors) {
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element;
        }
        return null;
    }

    function extractMessages() {
        const container = findElement(CONFIG.chatSelectors.messageContainer);
        if (!container) return null;

        const customerMessages = container.querySelectorAll(CONFIG.chatSelectors.customerMessage.join(','));
        const agentMessages = container.querySelectorAll(CONFIG.chatSelectors.agentMessage.join(','));

        const extractText = (elements) => {
            return Array.from(elements).map(el => el.textContent?.trim()).filter(Boolean);
        };

        return {
            customer: extractText(customerMessages).slice(-5),
            agent: extractText(agentMessages).slice(-5),
            timestamp: Date.now()
        };
    }

    function detectNewMessage() {
        const messages = extractMessages();
        if (!messages) return null;

        const lastCustomer = messages.customer[messages.customer.length - 1];
        const lastAgent = messages.agent[messages.agent.length - 1];

        if (lastCustomer && lastCustomer !== lastAgent) {
            return {
                type: 'customer',
                content: lastCustomer,
                fullContext: messages
            };
        }

        return null;
    }

    function getInputField() {
        return findElement(CONFIG.chatSelectors.inputField);
    }

    function broadcastChatEvent(data) {
        chrome.runtime.sendMessage({
            type: 'ZOHO_CHAT_EVENT',
            payload: data
        });
    }

    let lastMessageHash = null;

    function startMonitoring() {
        console.log('[ATS] ZOHO Chat Monitor started');
        
        setInterval(() => {
            const newMessage = detectNewMessage();
            if (newMessage) {
                const messageHash = JSON.stringify(newMessage);
                if (messageHash !== lastMessageHash) {
                    lastMessageHash = messageHash;
                    broadcastChatEvent({
                        ...newMessage,
                        url: window.location.href
                    });
                }
            }
        }, CONFIG.pollInterval);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startMonitoring);
    } else {
        startMonitoring();
    }

    window.atsZoho = {
        getInputField,
        extractMessages
    };
})();
