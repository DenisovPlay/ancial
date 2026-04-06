import { NextRequest, NextResponse } from 'next/server';

type SevenTvImage = {
  frameCount?: number | null;
  mime?: string | null;
  scale?: number | null;
  url?: string | null;
  width?: number | null;
};

type SevenTvSearchItem = {
  defaultName?: string | null;
  deleted?: boolean | null;
  flags?: {
    private?: boolean | null;
    publicListed?: boolean | null;
  } | null;
  id?: string | null;
  images?: SevenTvImage[] | null;
  imagesPending?: boolean | null;
};

const SEARCH_QUERY = `
  query EmoteSearch(
    $query: String
    $tags: [String!]!
    $sortBy: SortBy!
    $filters: Filters
    $page: Int
    $perPage: Int!
  ) {
    emotes {
      search(
        query: $query
        tags: { tags: $tags, match: ANY }
        sort: { sortBy: $sortBy, order: DESCENDING }
        filters: $filters
        page: $page
        perPage: $perPage
      ) {
        items {
          id
          defaultName
          deleted
          imagesPending
          flags {
            private
            publicListed
          }
          images {
            url
            mime
            scale
            width
            frameCount
          }
        }
      }
    }
  }
`;

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim();
}

function toNumber(value: number | string | null | undefined) {
  const nextValue = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

function getSevenTvToken() {
  return normalizeText(
    process.env.SEVENTV_TOKEN
    || process.env.SEVENTV_BEARER_TOKEN
    || process.env.SEVEN_TV_TOKEN
    || '',
  );
}

function pickBestImage(images: SevenTvImage[] | null | undefined) {
  const validImages = Array.isArray(images)
    ? images.filter((image) => normalizeText(image.url))
    : [];

  if (!validImages.length) {
    return '';
  }

  const mimePriority = (mime: string) => {
    const normalizedMime = normalizeText(mime).toLowerCase();
    if (normalizedMime.includes('webp')) return 4;
    if (normalizedMime.includes('avif')) return 3;
    if (normalizedMime.includes('png')) return 2;
    if (normalizedMime.includes('gif')) return 1;
    return 0;
  };

  const sortedImages = validImages.slice().sort((left, right) => {
    const animatedDelta = (toNumber(right.frameCount) > 1 ? 1 : 0) - (toNumber(left.frameCount) > 1 ? 1 : 0);
    if (animatedDelta !== 0) {
      return animatedDelta;
    }

    const scaleDelta = Math.abs(toNumber(left.scale) - 2) - Math.abs(toNumber(right.scale) - 2);
    if (scaleDelta !== 0) {
      return scaleDelta;
    }

    const mimeDelta = mimePriority(normalizeText(right.mime)) - mimePriority(normalizeText(left.mime));
    if (mimeDelta !== 0) {
      return mimeDelta;
    }

    return toNumber(right.width) - toNumber(left.width);
  });

  return normalizeText(sortedImages[0]?.url);
}

function buildSevenTvImageProxyUrl(stickerId: string) {
  return `/api/7tv/image/${encodeURIComponent(stickerId)}`;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = normalizeText(searchParams.get('q'));
  const exact = searchParams.get('exact') === '1';
  const limit = Math.min(Math.max(toNumber(searchParams.get('limit')) || 24, 1), 72);

  try {
    const token = getSevenTvToken();
    const response = await fetch('https://api.7tv.app/v4/gql', {
      body: JSON.stringify({
        operationName: 'EmoteSearch',
        query: SEARCH_QUERY,
        variables: {
          filters: {},
          page: 1,
          perPage: limit,
          query: query || null,
          sortBy: 'TOP_ALL_TIME',
          tags: [],
        },
      }),
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        'content-type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      return NextResponse.json({ error: '7TV request failed', items: [] }, { status: 502 });
    }

    const payload = await response.json() as {
      data?: {
        emotes?: {
          search?: {
            items?: SevenTvSearchItem[];
          } | null;
        } | null;
      } | null;
      errors?: Array<{
        message?: string | null;
      }> | null;
    };

    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      return NextResponse.json(
        {
          error: normalizeText(payload.errors[0]?.message) || '7TV GraphQL error',
          items: [],
        },
        { status: 502 },
      );
    }

    const items = (payload.data?.emotes?.search?.items ?? [])
      .filter((item) => !item?.deleted)
      .filter((item) => !item?.imagesPending)
      .filter((item) => !item?.flags?.private)
      .filter((item) => item?.flags?.publicListed !== false)
      .map((item) => {
        const id = normalizeText(item.id);
        const bestImageUrl = pickBestImage(item.images);

        return {
          id,
          name: normalizeText(item.defaultName),
          url: bestImageUrl ? buildSevenTvImageProxyUrl(id) : '',
        };
      })
      .filter((item) => item.id && item.name && item.url);

    const normalizedQuery = query.toLowerCase();
    const sortedItems = exact
      ? items.filter((item) => item.name.toLowerCase() === normalizedQuery)
      : items;

    return NextResponse.json({
      items: sortedItems.slice(0, limit),
    });
  } catch {
    return NextResponse.json({ error: '7TV request failed', items: [] }, { status: 500 });
  }
}
