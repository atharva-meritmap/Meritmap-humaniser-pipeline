import { NextRequest, NextResponse } from 'next/server';
import { scoreHumanLikeness } from '@/lib/server/model-runtime';
import { handleApiError } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 },
      );
    }

    // Body size guard
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
    if (contentLength > 2_000_000) {
      return NextResponse.json({ success: false, error: 'Request body too large.' }, { status: 413 });
    }

    const { text } = await request.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing text' }, { status: 400 });
    }
    const result = await scoreHumanLikeness(text);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    return handleApiError(err, true);
  }
}
