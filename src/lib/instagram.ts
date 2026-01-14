/**
 * Instagram username utilities
 */

import { validateInput, normalizeUsername, generateProfileUrl } from './validation';

// Valid Instagram username: 1-30 characters, letters, numbers, periods, underscores
const INSTAGRAM_USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

/**
 * Validate an Instagram username against IG username rules
 * @param username - The username to validate (without @)
 * @returns true if valid
 */
export function validateUsername(username: string): boolean {
    if (!username) return false;
    return INSTAGRAM_USERNAME_REGEX.test(username);
}

/**
 * Format a username for display (WITHOUT @ prefix).
 * @param username - The stored username
 * @returns Username as-is (no @ prefix)
 */
export function formatUsername(username: string): string {
    return username;
}

/**
 * Get validation error message for user feedback.
 * Uses comprehensive validation including character checks.
 * 
 * @param input - The user input
 * @returns Error message or null if valid
 */
export function getValidationError(input: string): string | null {
    const result = validateInput(input);
    return result.error;
}

/**
 * Parse and validate input, returning the normalized username or null.
 * This is the main entry point for username validation on client.
 * 
 * @param input - The user input
 * @returns Normalized username or null if invalid
 */
export function parseAndValidateUsername(input: string): string | null {
    const result = validateInput(input);
    return result.isValid ? result.username : null;
}

// Re-export for convenience
export { normalizeUsername, validateInput, generateProfileUrl } from './validation';
