/**
 * Phone Utilities
 */

/**
 * Extract phone number from text
 */
export function extractPhoneFromText(text) {
    if (!text) return null;
    
    const patterns = [
        /\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
        /\+?[0-9]{10,15}/g
    ];

    for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
            for (const match of matches) {
                const phone = cleanPhone(match);
                if (looksLikePhone(phone)) {
                    return phone;
                }
            }
        }
    }
    return null;
}

/**
 * Clean phone number - keep only digits and leading +
 */
export function cleanPhone(phone) {
    if (!phone) return '';
    const hasPlus = phone.startsWith('+');
    const digits = phone.replace(/\D/g, '');
    return hasPlus ? '+' + digits : digits;
}

/**
 * Check if string looks like a phone number
 */
export function looksLikePhone(str) {
    if (!str) return false;
    const digits = str.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
}

/**
 * Format phone for display
 */
export function formatPhone(phone) {
    if (!phone) return 'Unknown';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits[0] === '1') {
        return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
}

/**
 * Extract phone from CTM DOM elements
 */
export function extractFromCTMDOM() {
    // Method 1: Check party-options
    const phone1 = extractFromPartyOptions();
    if (phone1) return phone1;

    // Method 2: Check banners
    const phone2 = extractFromBanners();
    if (phone2) return phone2;

    // Method 3: Search any element
    const phone3 = extractFromAnyElement();
    if (phone3) return phone3;

    return null;
}

function extractFromPartyOptions() {
    const partyOptions = document.querySelector('.frame.party-options');
    if (!partyOptions) return null;

    const participants = partyOptions.querySelectorAll('.participant');
    
    for (const participant of participants) {
        const isModerator = participant.getAttribute('data-moderator') === '1';
        if (isModerator) continue;

        const resultText = participant.querySelector('.result-text');
        if (resultText) {
            const phone = extractPhoneFromText(resultText.textContent);
            if (phone) return phone;
        }

        const dataId = participant.getAttribute('data-id');
        if (dataId && looksLikePhone(dataId)) {
            return cleanPhone(dataId);
        }
    }
    return null;
}

function extractFromBanners() {
    const banners = document.querySelectorAll('.banner, .incoming-call, [data-type="answer"]');
    
    for (const banner of banners) {
        const phone = extractPhoneFromText(banner.textContent);
        if (phone) return phone;

        const dataPhone = banner.getAttribute('data-phone');
        if (dataPhone && looksLikePhone(dataPhone)) {
            return cleanPhone(dataPhone);
        }
    }
    return null;
}

function extractFromAnyElement() {
    const selectors = [
        '.caller-number', '.phone-number', '.call-phone',
        '.participant-phone', '[class*="caller"]', '[class*="phone"]', '[data-phone]'
    ];

    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
            const phone = extractPhoneFromText(el.textContent || el.getAttribute('data-phone') || '');
            if (phone) return phone;
        }
    }
    return null;
}
