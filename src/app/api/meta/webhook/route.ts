import { NextRequest, NextResponse } from 'next/server';

/**
 * Meta (Facebook/Instagram) Webhook Endpoint
 * 
 * GET: Verification endpoint for Meta webhook subscription
 * POST: Receives webhook events from Meta
 */

// GET - Webhook Verification
export async function GET(request: NextRequest): Promise<NextResponse> {
    const searchParams = request.nextUrl.searchParams;

    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Verify the webhook subscription
    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
        console.log('[Meta Webhook] Verification successful');
        // Return the challenge as plain text with status 200
        return new NextResponse(challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        });
    }

    console.warn('[Meta Webhook] Verification failed - invalid mode or token');
    return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
    );
}

// POST - Receive Webhook Events
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const payload = await request.json();

        // Log the payload safely (avoid logging sensitive data in production)
        console.log('[Meta Webhook] Received event:', JSON.stringify(payload, null, 2));

        // TODO: Add your webhook event handling logic here
        // Examples:
        // - Handle Instagram mentions
        // - Process comment events
        // - Handle message events

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        console.error('[Meta Webhook] Error processing payload:', error);
        return NextResponse.json({ received: true }, { status: 200 });
    }
}
