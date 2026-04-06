import { NextResponse } from 'next/server';

const CANDIDATE_SUFFIXES = [
  '4x.webp',
  '4x.avif',
  '4x.png',
  '4x.gif',
  '4x_static.webp',
  '4x_static.png',
  '3x.webp',
  '3x.avif',
  '3x.png',
  '3x.gif',
  '3x_static.webp',
  '3x_static.png',
  '2x.webp',
  '2x.avif',
  '2x.png',
  '2x.gif',
  '1x.webp',
  '1x.avif',
  '1x.png',
  '1x.gif',
  '1x_static.webp',
  '1x_static.png',
];

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim();
}

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id } = await context.params;
  const stickerId = normalizeText(id);

  if (!stickerId) {
    return NextResponse.json({ error: 'Missing sticker id' }, { status: 400 });
  }

  for (const suffix of CANDIDATE_SUFFIXES) {
    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(`https://cdn.7tv.app/emote/${encodeURIComponent(stickerId)}/${suffix}`, {
        cache: 'no-store',
        redirect: 'follow',
      });
    } catch {
      continue;
    }

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      continue;
    }

    const headers = new Headers();
    const contentType = upstreamResponse.headers.get('content-type');
    const contentLength = upstreamResponse.headers.get('content-length');
    const etag = upstreamResponse.headers.get('etag');
    const lastModified = upstreamResponse.headers.get('last-modified');

    if (contentType) headers.set('Content-Type', contentType);
    if (contentLength) headers.set('Content-Length', contentLength);
    if (etag) headers.set('ETag', etag);
    if (lastModified) headers.set('Last-Modified', lastModified);

    headers.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');

    return new NextResponse(upstreamResponse.body, {
      headers,
      status: 200,
    });
  }

  return NextResponse.json({ error: '7TV image not found' }, { status: 404 });
}
