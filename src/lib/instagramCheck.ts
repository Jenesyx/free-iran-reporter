/**
 * Instagram Profile Existence Checker
 * 
 * Server-side utility to verify if an Instagram profile exists
 * by making an HTTP request to the profile page.
 * 
 * IMPORTANT: This does NOT use the Instagram Graph API or any Meta tokens.
 * It performs a simple HTTP check to detect 404s vs accessible profiles.
 */

export type ExistsStatus = 'exists' | 'not_found' | 'unknown';

/**
 * Check if an Instagram profile exists by fetching the profile page.
 * 
 * Instagram behavior:
 * - Non-existent users: Returns 200 with "Sorry, this page isn't available" in HTML
 * - Existing users: Returns 200 with profile data or login wall
 * - Private/logged-out: Returns 200 with login wall but profile still exists
 * 
 * Detection strategy:
 * - Look for "Sorry, this page isn't available" = not_found
 * - Look for "page isn't available" variations = not_found
 * - Look for profile indicators (og:title with username) = exists
 * - If we can't determine, return unknown (shadow-ban)
 * 
 * @param username - The normalized Instagram username (no @ prefix)
 * @returns 
 *   - 'exists' if the profile appears to exist
 *   - 'not_found' if the page clearly indicates the user doesn't exist
 *   - 'unknown' for ambiguous cases (login walls without indicators, errors)
 */
export async function checkInstagramProfile(username: string): Promise<ExistsStatus> {
    const profileUrl = `https://www.instagram.com/${username}/`;

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    try {
        const response = await fetch(profileUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0',
            },
            signal: controller.signal,
            redirect: 'follow', // Follow redirects to see final page
        });

        clearTimeout(timeoutId);

        // Handle non-200 responses
        if (response.status === 404) {
            console.log(`[Instagram Check] ${username}: HTTP 404 (not_found)`);
            return 'not_found';
        }

        if (response.status !== 200) {
            console.log(`[Instagram Check] ${username}: HTTP ${response.status} (unknown)`);
            return 'unknown';
        }

        // Read the response body
        const html = await response.text();

        // Check for "page not available" indicators - this means user doesn't exist
        const notFoundPatterns = [
            "Sorry, this page isn't available",
            "Sorry, this page isn\\'t available",
            "The link you followed may be broken",
            '"HttpErrorPage"',  // Instagram's error page component
            'PAGE_NOT_FOUND',   // Error type in data
        ];

        for (const pattern of notFoundPatterns) {
            if (html.includes(pattern)) {
                console.log(`[Instagram Check] ${username}: Page not available pattern found (not_found)`);
                return 'not_found';
            }
        }

        // Check for profile existence indicators
        const existsPatterns = [
            `"username":"${username}"`,           // JSON data with exact username
            `"username":"${username.toLowerCase()}"`, // lowercase version
            `@${username}`,                        // @ mention in page
            `instagram.com/${username}`,          // canonical URL reference
            `<meta property="og:title"`,          // Profile has OpenGraph tags
            `"ProfilePage"`,                       // Profile page type indicator
        ];

        for (const pattern of existsPatterns) {
            if (html.toLowerCase().includes(pattern.toLowerCase())) {
                console.log(`[Instagram Check] ${username}: Profile indicator found (exists)`);
                return 'exists';
            }
        }

        // Check for login wall - if we see login indicators but no "not found",
        // the profile likely exists but Instagram wants us to log in
        const loginPatterns = [
            'LoginAndSignupPage',
            '"LoginPage"',
            'login/?next=',
            'accounts/login',
        ];

        let hasLoginWall = false;
        for (const pattern of loginPatterns) {
            if (html.includes(pattern)) {
                hasLoginWall = true;
                break;
            }
        }

        // If there's a login wall without "not found" message, the user probably exists
        // but Instagram is blocking. Treat as unknown to be safe.
        if (hasLoginWall) {
            console.log(`[Instagram Check] ${username}: Login wall detected, unable to verify (unknown)`);
            return 'unknown';
        }

        // If we got a 200 response with no clear indicators, treat as unknown
        console.log(`[Instagram Check] ${username}: No clear indicators found (unknown)`);
        return 'unknown';

    } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                console.log(`[Instagram Check] ${username}: Timeout (unknown)`);
            } else {
                console.log(`[Instagram Check] ${username}: Network error - ${error.message} (unknown)`);
            }
        }

        return 'unknown';
    }
}
