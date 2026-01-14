/**
 * Input Validation & Abuse Prevention Utilities
 * 
 * This module provides validation functions to sanitize and filter
 * Instagram handle submissions, blocking profanity and unwanted keywords.
 */

// ============================================================================
// BANNED WORDS LIST (case-insensitive, works with repeated characters)
// ============================================================================

/**
 * Banned substrings - if the handle contains any of these (after collapsing
 * repeated characters), it will be rejected.
 * 
 * NOTE: Do NOT expose this list in any client-facing error messages.
 */
const BANNED_SUBSTRINGS: string[] = [
    'koni',
    'kooni',
    'jende',
    'koskesh',
    'pahlavi',
    'rezapahlavi',
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
 * collapseRepeatedChars("pahlaviiiijendaaas") // returns "pahlavijendas"
 * 
 * @param str - The string to process
 * @returns String with consecutive repeated characters collapsed to single
 */
export function collapseRepeatedChars(str: string): string {
    return str.replace(/(.)\1+/g, '$1');
}

/**
 * Check if a handle contains any banned words/substrings.
 * Checks both the raw normalized handle AND a collapsed version
 * (for detecting stretched characters like "koooooniii").
 * 
 * @param handle - The normalized handle (lowercase, no @)
 * @returns true if the handle contains banned content
 */
export function isBanned(handle: string): boolean {
    const lowerHandle = handle.toLowerCase();
    const collapsedHandle = collapseRepeatedChars(lowerHandle);

    for (const banned of BANNED_SUBSTRINGS) {
        // Check raw normalized handle
        if (lowerHandle.includes(banned)) {
            return true;
        }
        // Check collapsed version (for stretched characters)
        if (collapsedHandle.includes(banned)) {
            return true;
        }
    }

    return false;
}

/**
 * Validate that a handle only contains valid Instagram characters.
 * Instagram usernames can only contain: a-z, 0-9, periods, underscores
 * 
 * @param handle - The handle to validate (without @)
 * @returns true if the handle uses only valid ASCII characters
 */
export function isValidCharacters(handle: string): boolean {
    // Only allow lowercase letters, numbers, periods, underscores
    // Length: 1-30 characters
    return /^[a-z0-9._]{1,30}$/.test(handle);
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
 * Fully normalize user input to a clean handle.
 * 
 * Steps:
 * 1. Trim whitespace
 * 2. Convert to lowercase
 * 3. If URL, extract username
 * 4. Remove leading @
 * 5. Remove trailing slashes, query params, fragments (already handled by URL extraction)
 * 
 * @param input - Raw user input
 * @returns Normalized handle (lowercase, no @, no URL parts)
 */
export function normalizeInput(input: string): string {
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

// ============================================================================
// MAIN VALIDATION INTERFACE
// ============================================================================

export interface ValidationResult {
    isValid: boolean;
    handle: string | null;
    error: string | null;
}

/**
 * Comprehensive validation of user input for Instagram handle submission.
 * 
 * @param input - Raw user input
 * @returns Validation result with normalized handle or error message
 */
export function validateInput(input: string): ValidationResult {
    // Empty input check
    if (!input || !input.trim()) {
        return {
            isValid: false,
            handle: null,
            error: 'Please enter an Instagram username or URL',
        };
    }

    // Check for non-ASCII characters in the original input (before normalization)
    // This catches Persian/Arabic characters early
    const trimmedInput = input.trim();
    if (hasNonAscii(trimmedInput)) {
        return {
            isValid: false,
            handle: null,
            error: 'Only English Instagram usernames are allowed (a-z, 0-9, . _).',
        };
    }

    // Normalize the input
    const normalized = normalizeInput(input);

    if (!normalized) {
        return {
            isValid: false,
            handle: null,
            error: 'Invalid Instagram username or URL',
        };
    }

    // Validate characters (must be a-z, 0-9, period, underscore, length 1-30)
    if (!isValidCharacters(normalized)) {
        return {
            isValid: false,
            handle: null,
            error: 'Only English Instagram usernames are allowed (a-z, 0-9, . _).',
        };
    }

    // Check for banned words
    if (isBanned(normalized)) {
        return {
            isValid: false,
            handle: null,
            error: 'This username is not allowed.',
        };
    }

    return {
        isValid: true,
        handle: normalized,
        error: null,
    };
}

// ============================================================================
// TEST CASES (for reference)
// ============================================================================
/**
 * Test Cases:
 * 
 * VALID:
 * - "instagram.user_1" → valid, normalized to "instagram.user_1"
 * - "@valid_user" → valid, normalized to "valid_user"
 * - "https://instagram.com/user123" → valid, normalized to "user123"
 * - "USER.Name_123" → valid, normalized to "user.name_123"
 * 
 * INVALID - Non-ASCII (Persian characters):
 * - "کاربر_ایرانی" → error: "Only English Instagram usernames are allowed..."
 * - "user_فارسی" → error: "Only English Instagram usernames are allowed..."
 * 
 * INVALID - Banned words:
 * - "koooooniii" → collapsed to "koni", error: "This username is not allowed."
 * - "rezaPahlavi" → contains "pahlavi", error: "This username is not allowed."
 * - "pahlaviiiijendaaas" → collapsed contains "pahlavi" + "jendas", error: "This username is not allowed."
 * - "rezapahlavijende" → contains both banned substrings, error: "This username is not allowed."
 * - "kooni_user" → contains "kooni", error: "This username is not allowed."
 * - "koskesh123" → contains "koskesh", error: "This username is not allowed."
 * 
 * INVALID - Character rules:
 * - "user name" (space) → error: "Only English Instagram usernames are allowed..."
 * - "user-name" (hyphen) → error: "Only English Instagram usernames are allowed..."
 * - "" (empty) → error: "Please enter an Instagram username or URL"
 * - "a".repeat(31) (too long) → error: "Only English Instagram usernames are allowed..."
 */
