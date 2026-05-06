import { NextResponse } from 'next/server';

const LEGACY_ORIGIN = process.env.NEXT_PUBLIC_API_BASE || 'https://ancial.ru';

export async function proxyLegacyJson(path: string, searchParams?: URLSearchParams) {
  const url = new URL(path, LEGACY_ORIGIN);

  searchParams?.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        accept: 'application/json,text/plain,*/*',
      },
    });

    const body = await response.text();

    return new NextResponse(body, {
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8',
      },
      status: response.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Legacy API request failed',
        success: false,
      },
      { status: 502 },
    );
  }
}
