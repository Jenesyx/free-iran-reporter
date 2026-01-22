/**
 * Browser Fingerprint Generator
 * 
 * Creates a unique identifier for the browser/device combination
 * to track votes without requiring user accounts.
 * 
 * Uses multiple browser characteristics hashed together:
 * - User agent
 * - Screen dimensions
 * - Timezone
 * - Language
 * - Platform
 * - Color depth
 * - Canvas fingerprint (subtle rendering differences)
 */

const FINGERPRINT_STORAGE_KEY = 'ifr_fp';

/**
 * Simple hash function (djb2)
 * For actual cryptographic security, use Web Crypto API
 */
function simpleHash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
}

/**
 * Generate a canvas fingerprint
 * Different browsers/devices render text slightly differently
 */
function getCanvasFingerprint(): string {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return 'no-canvas';

        canvas.width = 200;
        canvas.height = 50;

        // Draw some text with specific styling
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('IranFreedom🇮🇷', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('IranFreedom🇮🇷', 4, 17);

        // Get the data URL and hash it
        const dataUrl = canvas.toDataURL();
        return simpleHash(dataUrl);
    } catch {
        return 'canvas-error';
    }
}

/**
 * Collect browser characteristics for fingerprinting
 */
function collectBrowserData(): string {
    const data = [
        navigator.userAgent,
        navigator.language,
        navigator.languages?.join(',') || '',
        navigator.platform,
        screen.width,
        screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 0,
        navigator.maxTouchPoints || 0,
        getCanvasFingerprint(),
    ];

    return data.join('|');
}

/**
 * Generate a SHA-256 hash using Web Crypto API
 */
async function sha256(message: string): Promise<string> {
    try {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
        // Fallback to simple hash if Web Crypto not available
        return simpleHash(message);
    }
}

/**
 * Generate or retrieve the browser fingerprint
 * Cached in localStorage for consistency
 */
export async function getFingerprint(): Promise<string> {
    // Check if we already have a fingerprint stored
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(FINGERPRINT_STORAGE_KEY);
        if (stored) {
            return stored;
        }
    }

    // Generate new fingerprint
    const browserData = collectBrowserData();
    const fingerprint = await sha256(browserData);

    // Store for future use
    if (typeof window !== 'undefined') {
        localStorage.setItem(FINGERPRINT_STORAGE_KEY, fingerprint);
    }

    return fingerprint;
}

/**
 * Get fingerprint synchronously (returns cached or generates new)
 * Use this when you need immediate access
 */
export function getFingerprintSync(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(FINGERPRINT_STORAGE_KEY);
}
