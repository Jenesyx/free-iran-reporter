/**
 * Instagram handle parsing and validation utilities
 */

// Valid Instagram username: 1-30 characters, letters, numbers, periods, underscores
const INSTAGRAM_USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

// URL patterns for Instagram
const INSTAGRAM_URL_PATTERNS = [
    /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?(?:\?.*)?$/,
    /^(?:https?:\/\/)?(?:www\.)?instagr\.am\/([a-zA-Z0-9._]+)\/?(?:\?.*)?$/,
];

/**
 * Parse an Instagram handle from various input formats
 * @param input - The user input (username, @username, or full URL)
 * @returns The normalized handle (lowercase, no @) or null if invalid
 */
export function parseInstagramHandle(input: string): string | null {
    if (!input) return null;

    // Trim and clean input
    let cleaned = input.trim();

    // If empty after trim, return null
    if (!cleaned) return null;

    // Try to extract from URL first
    for (const pattern of INSTAGRAM_URL_PATTERNS) {
        const match = cleaned.match(pattern);
        if (match && match[1]) {
            return normalizeHandle(match[1]);
        }
    }

    // Remove @ prefix if present
    if (cleaned.startsWith('@')) {
        cleaned = cleaned.slice(1);
    }

    // Validate and normalize
    if (validateHandle(cleaned)) {
        return normalizeHandle(cleaned);
    }

    return null;
}

/**
 * Validate an Instagram handle against IG username rules
 * @param handle - The handle to validate (without @)
 * @returns true if valid
 */
export function validateHandle(handle: string): boolean {
    if (!handle) return false;
    return INSTAGRAM_USERNAME_REGEX.test(handle);
}

/**
 * Normalize a handle to lowercase
 * @param handle - The handle to normalize
 * @returns Lowercase handle
 */
export function normalizeHandle(handle: string): string {
    return handle.toLowerCase().trim();
}

/**
 * Format a handle for display (with @ prefix)
 * @param handle - The stored handle
 * @returns Handle with @ prefix
 */
export function formatHandle(handle: string): string {
    return `@${handle}`;
}

/**
 * Get validation error message for user feedback
 * @param input - The user input
 * @returns Error message or null if valid
 */
export function getValidationError(input: string): string | null {
    if (!input || !input.trim()) {
        return 'Please enter an Instagram username or URL';
    }

    const parsed = parseInstagramHandle(input);
    if (!parsed) {
        return 'Invalid Instagram username. Use letters, numbers, periods, or underscores (1-30 characters)';
    }

    return null;
}
