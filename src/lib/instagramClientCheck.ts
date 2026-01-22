/**
 * Client-Side Instagram Profile Verification
 * 
 * Uses the browser to verify if an Instagram profile exists.
 * This avoids server IP blocking issues that cause false positives.
 * 
 * Strategy: Open the Instagram profile in a new tab and let the user
 * verify it exists, OR use an embedded approach.
 */

export type ClientExistsStatus = 'exists' | 'not_found' | 'unknown';

/**
 * Verification result returned from the verification process
 */
export interface VerificationResult {
    username: string;
    status: ClientExistsStatus;
    error?: string;
}

/**
 * Creates an Instagram profile URL
 */
export function getInstagramProfileUrl(username: string): string {
    return `https://www.instagram.com/${username}/`;
}

/**
 * Opens the Instagram profile in a new tab for user verification.
 * Returns the window reference so it can be closed later.
 */
export function openProfileTab(username: string): Window | null {
    const profileUrl = getInstagramProfileUrl(username);
    return window.open(profileUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Verification state management for the InputSection component.
 * This allows users to confirm a profile exists before adding it.
 */
export interface PendingVerification {
    username: string;
    profileUrl: string;
    windowRef: Window | null;
    startedAt: number;
}

/**
 * Check if a popup window is still open
 */
export function isWindowOpen(windowRef: Window | null): boolean {
    return windowRef !== null && !windowRef.closed;
}

/**
 * Close a verification window if it's still open
 */
export function closeVerificationWindow(windowRef: Window | null): void {
    if (isWindowOpen(windowRef)) {
        try {
            windowRef!.close();
        } catch {
            // Ignore errors when closing
        }
    }
}
