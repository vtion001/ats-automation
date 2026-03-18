/**
 * Console Interceptor - Captures ALL console.log/warn/error/debug from content scripts
 * Runs as a content script; overrides console methods to send logs to background service worker
 * for forwarding to the remote log viewer.
 * 
 * In Chrome's isolated world, all content scripts on the same tab share the same JS context,
 * so overriding console here captures logs from ALL content scripts in that tab.
 * 
 * Infinite loop prevention: we store the original console methods BEFORE overriding,
 * and use them internally. Messages sent to background carry a flag so we don't re-capture.
 */

(function() {
    'use strict';

    const INTERCEPTOR_ID = 'console-interceptor';
    const CACHE_TTL_MS = 30000;
    let remoteLogUrl = null;
    let remoteLogUrlCachedAt = 0;
    let cachedClient = 'flyland';
    let cachedClientAt = 0;
    let _isSendingToBg = false;

    const _originalConsole = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        debug: console.debug.bind(console),
        info: console.info.bind(console)
    };

    function serializeArgs(args) {
        return Array.from(args).map(arg => {
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            if (typeof arg === 'function') return arg.toString();
            if (typeof arg === 'object') {
                try { return JSON.stringify(arg); } catch { return String(arg); }
            }
            return String(arg);
        });
    }

    async function sendToBackground(level, args) {
        if (_isSendingToBg) return;
        _isSendingToBg = true;

        try {
            const now = Date.now();
            if (!remoteLogUrl || (now - remoteLogUrlCachedAt) > CACHE_TTL_MS) {
                const r = await chrome.storage.local.get(['remoteLogUrl', 'activeClient']);
                if (r.remoteLogUrl) {
                    remoteLogUrl = r.remoteLogUrl.replace(/\/$/, '');
                    remoteLogUrlCachedAt = now;
                }
                if (r.activeClient) {
                    cachedClient = r.activeClient;
                    cachedClientAt = now;
                }
            }

            const messageText = args.map(String).join(' ');
            const structuredData = args.find(a => typeof a === 'object' && a !== null);

            const logEntry = {
                _fromInterceptor: true,
                source: 'extension',
                script: 'content-script',
                level: level,
                message: messageText,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                client: cachedClient,
                data: structuredData || null
            };

            chrome.runtime.sendMessage({
                type: 'CONSOLE_INTERCEPT',
                entry: logEntry
            });
        } catch (e) {
            _originalConsole.error('[ConsoleInterceptor] Failed to send to background:', e);
        } finally {
            _isSendingToBg = false;
        }
    }

    function interceptConsole(level) {
        return function(...args) {
            _originalConsole[level](...args);
            sendToBackground(level, args);
        };
    }

    console.log = interceptConsole('log');
    console.warn = interceptConsole('warn');
    console.error = interceptConsole('error');
    console.debug = interceptConsole('debug');
    console.info = interceptConsole('info');

    _originalConsole.log('[ConsoleInterceptor] Active - capturing all console output');

})();
