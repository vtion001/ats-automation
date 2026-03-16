/**
 * ATS Core Module Index
 * Exports all core infrastructure modules
 */

// Core modules
export { ATSContainer, container, SERVICE_TOKENS } from './di/container.js';
export { ATSMessageBus, messageBus } from './messaging/message-bus.js';
export { ATSStorageManager, storageManager } from './storage/storage-manager.js';

// Re-export shared
import * as Constants from '../shared/constants/index.js';
import * as Utils from '../shared/utils/index.js';

export const Core = {
    Container: ATSContainer,
    container,
    MessageBus: ATSMessageBus,
    messageBus,
    StorageManager: ATSStorageManager,
    storageManager,
    Constants,
    Utils
};

// Make available globally
if (typeof window !== 'undefined') {
    window.ATSCore = Core;
}
