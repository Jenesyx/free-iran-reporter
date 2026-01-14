/**
 * Input Validation & Shadow-Ban Detection Utilities
 * 
 * This module provides validation functions to sanitize and filter
 * Instagram handle submissions, with shadow-ban logic for suspicious content.
 */

// ============================================================================
// BANNED WORDS LIST (case-insensitive, works with repeated characters)
// ============================================================================

/**
 * Banned substrings - if the handle contains any of these (after collapsing
 * repeated characters), it will be shadow-banned.
 * 
 * NOTE: Do NOT expose this list in any client-facing error messages.
 */
const BANNED_SUBSTRINGS: string[] = [
    'koni',
    'kooni',
    'jende',
    'koskesh',
];

// ============================================================================
// CORE UTILITY FUNCTIONS
// ============================================================================

/**
 * Collapse repeated consecutive characters for detection purposes only.
 * This helps catch attempts to bypass filters with stretched words.
 * 
 * @example
 * collapseRepeatedChars("koooooniii") // returns "koni"
 * collapseRepeatedChars("jendeeee") // returns "jende"
 * 
 * @param str - The string to process
 * @returns String with consecutive repeated characters collapsed to single
 */
export function collapseRepeatedChars(str: string): string {
    return str.replace(/(.)\1+/g, '$1');
}

/**
 * Check if a username contains any banned words/substrings.
 * Checks both the raw normalized username AND a collapsed version
 * (for detecting stretched characters like "koooooniii").
 * 
 * @param username - The normalized username (lowercase, no @)
 * @returns true if the username contains banned content
 */
export function containsBannedWord(username: string): boolean {
    const lowerUsername = username.toLowerCase();
    const collapsedUsername = collapseRepeatedChars(lowerUsername);

    for (const banned of BANNED_SUBSTRINGS) {
        // Check raw normalized username
        if (lowerUsername.includes(banned)) {
            return true;
        }
        // Check collapsed version (for stretched characters)
        if (collapsedUsername.includes(banned)) {
            return true;
        }
    }

    return false;
}

/**
 * Validate that a username only contains valid Instagram characters.
 * Instagram usernames can only contain: a-z, 0-9, periods, underscores
 * 
 * @param username - The username to validate (without @)
 * @returns true if the username uses only valid ASCII characters
 */
export function isValidCharacters(username: string): boolean {
    // Only allow lowercase letters, numbers, periods, underscores
    // Length: 1-30 characters
    return /^[a-z0-9._]{1,30}$/.test(username);
}

/**
 * Check if a string contains any non-ASCII characters
 * (useful for detecting Persian/Arabic/etc. characters)
 * 
 * @param str - The string to check
 * @returns true if the string contains non-ASCII characters
 */
export function hasNonAscii(str: string): boolean {
    // eslint-disable-next-line no-control-regex
    return /[^\x00-\x7F]/.test(str);
}

// ============================================================================
// URL EXTRACTION & NORMALIZATION
// ============================================================================

// URL patterns for Instagram
const INSTAGRAM_URL_PATTERNS = [
    /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?(?:[?#].*)?$/,
    /^(?:https?:\/\/)?(?:www\.)?instagr\.am\/([a-zA-Z0-9._]+)\/?(?:[?#].*)?$/,
];

/**
 * Extract username from an Instagram URL.
 * 
 * @param url - The URL to parse
 * @returns The extracted username or null if not a valid Instagram URL
 */
export function extractUsernameFromUrl(url: string): string | null {
    for (const pattern of INSTAGRAM_URL_PATTERNS) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

/**
 * Generate canonical Instagram profile URL from username.
 * 
 * @param username - The normalized username (no @)
 * @returns Canonical URL: https://www.instagram.com/<username>/
 */
export function generateProfileUrl(username: string): string {
    return `https://www.instagram.com/${username}/`;
}

/**
 * Fully normalize user input to a clean username.
 * 
 * Steps:
 * 1. Trim whitespace
 * 2. Convert to lowercase
 * 3. If URL, extract username
 * 4. Remove leading @
 * 5. Remove trailing slashes
 * 
 * @param input - Raw user input
 * @returns Normalized username (lowercase, no @, no URL parts)
 */
export function normalizeUsername(input: string): string {
    if (!input) return '';

    // Step 1: Trim whitespace
    let cleaned = input.trim();

    if (!cleaned) return '';

    // Step 2: Convert to lowercase
    cleaned = cleaned.toLowerCase();

    // Step 3: Try to extract from URL
    const urlUsername = extractUsernameFromUrl(cleaned);
    if (urlUsername) {
        cleaned = urlUsername.toLowerCase();
    }

    // Step 4: Remove leading @
    if (cleaned.startsWith('@')) {
        cleaned = cleaned.slice(1);
    }

    // Step 5: Remove trailing slashes (safety, should already be handled)
    cleaned = cleaned.replace(/\/+$/, '');

    return cleaned;
}

// Legacy export for backward compatibility
export const normalizeInput = normalizeUsername;

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

export interface ValidationResult {
    isValid: boolean;
    username: string | null;
    error: string | null;
}

export interface SuspicionResult {
    isSuspicious: boolean;
    reason: string | null;
}

// ============================================================================
// MAIN VALIDATION FUNCTIONS
// ============================================================================

/**
 * Basic validation of user input for Instagram username submission.
 * This performs "hard reject" validation - things that should show an error.
 * 
 * @param input - Raw user input
 * @returns Validation result with normalized username or error message
 */
export function validateInput(input: string): ValidationResult {
    // Empty input check
    if (!input || !input.trim()) {
        return {
            isValid: false,
            username: null,
            error: 'Please enter an Instagram username or URL',
        };
    }

    // Check for non-ASCII characters in the original input (before normalization)
    // This catches Persian/Arabic characters early
    const trimmedInput = input.trim();
    if (hasNonAscii(trimmedInput)) {
        return {
            isValid: false,
            username: null,
            error: 'Only English Instagram usernames are allowed (a-z, 0-9, . _).',
        };
    }

    // Normalize the input
    const normalized = normalizeUsername(input);

    if (!normalized) {
        return {
            isValid: false,
            username: null,
            error: 'Invalid Instagram username or URL',
        };
    }

    // Validate characters (must be a-z, 0-9, period, underscore, length 1-30)
    if (!isValidCharacters(normalized)) {
        return {
            isValid: false,
            username: null,
            error: 'Only English Instagram usernames are allowed (a-z, 0-9, . _).',
        };
    }

    return {
        isValid: true,
        username: normalized,
        error: null,
    };
}

/**
 * Check if a username should be shadow-banned.
 * This is called AFTER validateInput passes.
 * 
 * Shadow-ban conditions:
 * - Contains banned substrings (including stretched versions)
 * 
 * @param username - The normalized username (already validated)
 * @returns Suspicion result with reason if suspicious
 */
export function isSuspicious(username: string): SuspicionResult {
    // Check for banned words (including stretched versions)
    if (containsBannedWord(username)) {
        return {
            isSuspicious: true,
            reason: 'Contains banned substring',
        };
    }

    return {
        isSuspicious: false,
        reason: null,
    };
}

/**
 * Full validation pipeline for server-side use.
 * Returns validation status, suspicion status, and all relevant data.
 * 
 * @param input - Raw user input
 */
export function validateAndCheckSuspicion(input: string): {
    isValid: boolean;
    username: string | null;
    profileUrl: string | null;
    error: string | null;
    isSuspicious: boolean;
    suspicionReason: string | null;
} {
    const validation = validateInput(input);

    if (!validation.isValid || !validation.username) {
        return {
            isValid: false,
            username: null,
            profileUrl: null,
            error: validation.error,
            isSuspicious: false,
            suspicionReason: null,
        };
    }

    const suspicion = isSuspicious(validation.username);

    return {
        isValid: true,
        username: validation.username,
        profileUrl: generateProfileUrl(validation.username),
        error: null,
        isSuspicious: suspicion.isSuspicious,
        suspicionReason: suspicion.reason,
    };
}
