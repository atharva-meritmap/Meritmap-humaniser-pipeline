import { NextRequest, NextResponse } from 'next/server';
import { POST as humanizePost } from '../../humanize/route';

function buildForwardedHeaders(request: NextRequest): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  for (const name of ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip', 'x-vercel-forwarded-for']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export async function POST(request: NextRequest) {
  try {
  // Body size guard
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > 2_000_000) {
    return NextResponse.json({ success: false, error: 'Request body too large.' }, { status: 413 });
  }

  const configuredToken = process.env.STEALTHHUMANIZER_API_TOKEN;
  if (configuredToken) {
    const supplied = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (supplied !== configuredToken) {
      return NextResponse.json({ success: false, error: 'Invalid API token.' }, { status: 401 });
    }
  }

  const payload = await request.json().catch(() => null);
  if (!isRecord(payload)) {
    return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const payloadApiKey = typeof payload.apiKey === 'string' ? payload.apiKey : undefined;
  const payloadModel = typeof payload.model === 'string' ? payload.model : undefined;
  const providerApiKey = payloadApiKey || process.env.STEALTHHUMANIZER_PROVIDER_API_KEY || process.env.GEMINI_API_KEY;
  const provider = payloadModel || process.env.STEALTHHUMANIZER_PROVIDER || 'gemini';
  if (!providerApiKey) {
    return NextResponse.json({ success: false, error: 'No provider API key supplied. Pass apiKey or configure STEALTHHUMANIZER_PROVIDER_API_KEY.' }, { status: 400 });
  }

  const forwarded = new NextRequest(request.url.replace('/api/v1/humanize', '/api/humanize'), {
    method: 'POST',
    headers: buildForwardedHeaders(request),
    body: JSON.stringify({
      level: 'medium',
      style: 'humanize',
      tone: 'conversational',
      language: 'auto',
      ...payload,
      model: provider,
      apiKey: providerApiKey,
    }),
  });
  return humanizePost(forwarded);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ success: false, error: process.env.NODE_ENV === 'development' ? message : 'Internal error' }, { status: 500 });
  }
}
