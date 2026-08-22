'use client';

export interface Sticker {
  id: number | string;
  code: string;
  alias?: string;
  shortcode: string;
  image_url: string;
  image_url_avif?: string | null;
  width?: number | null;
  height?: number | null;
  is_animated?: number | boolean;
}

export interface StickerPack {
  id: number | string;
  slug: string;
  title: string;
  icon_url: string;
  author?: string | null;
  scope?: 'all' | 'posts' | 'messages';
  sort_order?: number;
  stickers: Sticker[];
}

export interface SevenTvStickerItem {
  id: string;
  name: string;
  url: string;
}

const STICKERS_CACHE_KEY = 'ancial_stickers_cache_v2';
const RECENT_STICKERS_KEY = 'ancial_recent_stickers_v2';
const MAX_RECENT_STICKERS = 24;

// Встроенный резервный набор стикеров на случай офлайна или задержки сети
export const FALLBACK_NATIVE_STICKERS: Sticker[] = [
  { id: 1, code: 'privet', alias: 'privet', shortcode: ':privet:', image_url: '/img/stickers/webp/privet.webp', image_url_avif: '/img/stickers/privet.avif', is_animated: 1 },
  { id: 2, code: 'hi', alias: 'hi', shortcode: ':hi:', image_url: '/img/stickers/webp/hi.webp', image_url_avif: '/img/stickers/hi.avif', is_animated: 0 },
  { id: 3, code: 'aware', alias: 'aware', shortcode: ':aware:', image_url: '/img/stickers/webp/aware.webp', image_url_avif: '/img/stickers/aware.avif', is_animated: 1 },
  { id: 4, code: 'booba', alias: 'booba', shortcode: ':booba:', image_url: '/img/stickers/webp/booba.webp', image_url_avif: '/img/stickers/booba.avif', is_animated: 1 },
  { id: 5, code: 'box', alias: 'box', shortcode: ':box:', image_url: '/img/stickers/webp/box.webp', image_url_avif: '/img/stickers/box.avif', is_animated: 1 },
  { id: 6, code: 'classic', alias: 'classic', shortcode: ':classic:', image_url: '/img/stickers/webp/classic.webp', image_url_avif: '/img/stickers/classic.avif', is_animated: 1 },
  { id: 7, code: 'durak', alias: 'durak', shortcode: ':durak:', image_url: '/img/stickers/webp/durak.webp', image_url_avif: '/img/stickers/durak.avif', is_animated: 1 },
  { id: 8, code: 'rar', alias: 'rar', shortcode: ':rar:', image_url: '/img/stickers/webp/rar.webp', image_url_avif: '/img/stickers/rar.avif', is_animated: 1 },
  { id: 9, code: 'flex1337', alias: 'flex1337', shortcode: ':flex1337:', image_url: '/img/stickers/webp/flex1337.webp', image_url_avif: '/img/stickers/flex1337.avif', is_animated: 1 },
  { id: 10, code: 'hehehe', alias: 'hehehe', shortcode: ':hehehe:', image_url: '/img/stickers/webp/hehehe.webp', image_url_avif: '/img/stickers/hehehe.avif', is_animated: 1 },
  { id: 11, code: 'hmm', alias: 'hmm', shortcode: ':hmm:', image_url: '/img/stickers/webp/hmm.webp', image_url_avif: '/img/stickers/hmm.avif', is_animated: 0 },
  { id: 12, code: 'hop', alias: 'hop', shortcode: ':hop:', image_url: '/img/stickers/webp/hop.webp', image_url_avif: '/img/stickers/hop.avif', is_animated: 1 },
  { id: 13, code: 'love', alias: 'love', shortcode: ':love:', image_url: '/img/stickers/webp/love.webp', image_url_avif: '/img/stickers/love.avif', is_animated: 1 },
  { id: 14, code: 'myaa', alias: 'myaa', shortcode: ':myaa:', image_url: '/img/stickers/webp/myaa.webp', image_url_avif: '/img/stickers/myaa.avif', is_animated: 1 },
  { id: 15, code: 'nerd', alias: 'nerd', shortcode: ':nerd:', image_url: '/img/stickers/webp/nerd.webp', image_url_avif: '/img/stickers/nerd.avif', is_animated: 1 },
  { id: 16, code: 'peepoclap', alias: 'peepoclap', shortcode: ':peepoclap:', image_url: '/img/stickers/webp/peepoclap.webp', image_url_avif: '/img/stickers/peepoclap.avif', is_animated: 0 },
  { id: 17, code: 'pofig', alias: 'pofig', shortcode: ':pofig:', image_url: '/img/stickers/webp/pofig.webp', image_url_avif: '/img/stickers/pofig.avif', is_animated: 1 },
  { id: 18, code: 'russian', alias: 'russian', shortcode: ':russian:', image_url: '/img/stickers/webp/russian.webp', image_url_avif: '/img/stickers/russian.avif', is_animated: 1 },
  { id: 19, code: 'shy', alias: 'shy', shortcode: ':shy:', image_url: '/img/stickers/webp/shy.webp', image_url_avif: '/img/stickers/shy.avif', is_animated: 0 },
  { id: 20, code: 'sussy', alias: 'sussy', shortcode: ':sussy:', image_url: '/img/stickers/webp/sussy.webp', image_url_avif: '/img/stickers/sussy.avif', is_animated: 0 },
  { id: 21, code: 'ura', alias: 'ura', shortcode: ':ura:', image_url: '/img/stickers/webp/ura.webp', image_url_avif: '/img/stickers/ura.avif', is_animated: 1 },
  { id: 22, code: 'vibe', alias: 'vibe', shortcode: ':vibe:', image_url: '/img/stickers/webp/vibe.webp', image_url_avif: '/img/stickers/vibe.avif', is_animated: 1 },
  { id: 23, code: 'ww', alias: 'ww', shortcode: ':ww:', image_url: '/img/stickers/webp/ww.webp', image_url_avif: '/img/stickers/ww.avif', is_animated: 0 },
  { id: 24, code: 'alcoholic', alias: 'alcoholic', shortcode: ':alcoholic:', image_url: '/img/stickers/webp/alcoholic.webp', image_url_avif: '/img/stickers/alcoholic.avif', is_animated: 1 },
  { id: 25, code: 'stonks', alias: 'stonks', shortcode: ':stonks:', image_url: '/img/stickers/webp/stonks.webp', image_url_avif: '/img/stickers/stonks.avif', is_animated: 1 },
  { id: 26, code: 'nowoted', alias: 'nowoted', shortcode: ':nowoted:', image_url: '/img/stickers/webp/nowoted.webp', image_url_avif: '/img/stickers/nowoted.avif', is_animated: 1 },
  { id: 27, code: 'what', alias: 'what', shortcode: ':what:', image_url: '/img/stickers/webp/what.webp', image_url_avif: '/img/stickers/what.avif', is_animated: 1 },
  { id: 28, code: 'late', alias: 'late', shortcode: ':late:', image_url: '/img/stickers/webp/late.webp', image_url_avif: '/img/stickers/late.avif', is_animated: 0 },
  { id: 29, code: 'hamster', alias: 'hamster', shortcode: ':hamster:', image_url: '/img/stickers/webp/hamster.webp', image_url_avif: '/img/stickers/hamster.avif', is_animated: 0 },
  { id: 30, code: 'joker', alias: 'joker', shortcode: ':joker:', image_url: '/img/stickers/webp/joker.webp', image_url_avif: '/img/stickers/joker.avif', is_animated: 0 },
];

export const FALLBACK_MEMES_STICKERS: Sticker[] = [
  { id: 101, code: 'btez', alias: 'btEZ', shortcode: ':btez:', image_url: 'https://cdn.betterttv.net/emote/5590b223b344e2c42a9e28e3/2x', is_animated: 1 },
  { id: 102, code: 'btcj', alias: 'btCJ', shortcode: ':btcj:', image_url: 'https://cdn.betterttv.net/emote/5f1b0186cf6d2144653d2970/2x', is_animated: 1 },
  { id: 103, code: 'btbdolbit', alias: 'btbDOLBIT', shortcode: ':btbdolbit:', image_url: 'https://cdn.betterttv.net/emote/5fb91b870d141d6f06d7df81/2x', is_animated: 1 },
  { id: 104, code: 'btbpog', alias: 'btbPOG', shortcode: ':btbpog:', image_url: 'https://cdn.betterttv.net/emote/5fb023284dfba1644029eea4/2x', is_animated: 1 },
  { id: 105, code: 'btpa', alias: 'btPA', shortcode: ':btpa:', image_url: 'https://cdn.betterttv.net/emote/5d0d7140ca4f4b50240ff6b4/2x', is_animated: 1 },
  { id: 106, code: 'bttu', alias: 'btTU', shortcode: ':bttu:', image_url: 'https://cdn.betterttv.net/emote/61501b4fb63cc97ee6d35ea3/2x', is_animated: 1 },
  { id: 107, code: 'btbooba', alias: 'btBOOBA', shortcode: ':btbooba:', image_url: 'https://cdn.betterttv.net/emote/605c5f597493072efdeb430a/2x', is_animated: 1 },
  { id: 108, code: 'btclap', alias: 'btCLAP', shortcode: ':btclap:', image_url: 'https://cdn.betterttv.net/emote/5d38aaa592fc550c2d5996b8/2x', is_animated: 1 },
  { id: 109, code: 'btlove', alias: 'btLOVE', shortcode: ':btlove:', image_url: 'https://cdn.betterttv.net/emote/5ca7591926dfd77429327bb6/2x', is_animated: 1 },
  { id: 110, code: 'btafk', alias: 'btAFK', shortcode: ':btafk:', image_url: 'https://cdn.betterttv.net/emote/5edbf265f54be95e2a843385/2x', is_animated: 1 },
  { id: 111, code: 'bt89', alias: 'bt89', shortcode: ':bt89:', image_url: 'https://cdn.betterttv.net/emote/601f13f3f4d51165feda1886/2x', is_animated: 1 },
  { id: 112, code: 'btpop', alias: 'btPOP', shortcode: ':btpop:', image_url: 'https://cdn.betterttv.net/emote/601ef51af4d51165feda15cd/2x', is_animated: 1 },
  { id: 113, code: 'btpoo', alias: 'btPOO', shortcode: ':btpoo:', image_url: 'https://cdn.betterttv.net/emote/5c3427a55752683d16e409d1/2x', is_animated: 1 },
  { id: 114, code: 'bteat', alias: 'btEAT', shortcode: ':bteat:', image_url: 'https://cdn.betterttv.net/emote/61e8d6ac06fd6a9f5be16425/2x', is_animated: 1 },
  { id: 115, code: 'btaga', alias: 'btAGA', shortcode: ':btaga:', image_url: 'https://cdn.betterttv.net/emote/58a57fa706e70d0465b29cd3/2x', is_animated: 1 },
  { id: 116, code: 'btvk', alias: 'btVK', shortcode: ':btvk:', image_url: 'https://cdn.betterttv.net/emote/61afa691002cdeedc21e9950/2x', is_animated: 1 },
  { id: 117, code: 'btyoutube', alias: 'btYOUTUBE', shortcode: ':btyoutube:', image_url: 'https://cdn.betterttv.net/emote/62f14ed7ecbd41815423a7a9/2x', is_animated: 1 },
  { id: 118, code: 'btheart', alias: 'btHEART', shortcode: ':btheart:', image_url: 'https://cdn.betterttv.net/emote/6011197adf6a0665f2753118/2x', is_animated: 1 },
  { id: 119, code: 'btnea', alias: 'btNEA', shortcode: ':btnea:', image_url: 'https://cdn.betterttv.net/emote/605e21037493072efdeb50d2/2x', is_animated: 1 },
  { id: 120, code: 'btban', alias: 'btBAN', shortcode: ':btban:', image_url: 'https://cdn.betterttv.net/emote/6055e47f306b602acc5a06db/2x', is_animated: 1 },
  { id: 121, code: 'btbb', alias: 'btBB', shortcode: ':btbb:', image_url: 'https://cdn.betterttv.net/emote/5eef252af91de70dea5baedd/2x.webp', is_animated: 1 },
  { id: 122, code: 'btalien', alias: 'btALIEN', shortcode: ':btalien:', image_url: 'https://cdn.betterttv.net/emote/6052368c306b602acc59eb5c/2x', is_animated: 1 },
  { id: 123, code: 'btabdul', alias: 'btABDUL', shortcode: ':btabdul:', image_url: 'https://cdn.betterttv.net/emote/59a4ea2865231102cde26e9c/2x', is_animated: 1 },
  { id: 124, code: 'btdurak', alias: 'btDURAK', shortcode: ':btdurak:', image_url: 'https://cdn.betterttv.net/emote/618fa6ef54f3344f8805759f/2x', is_animated: 1 },
  { id: 125, code: 'btracer', alias: 'btRACER', shortcode: ':btracer:', image_url: 'https://cdn.betterttv.net/emote/5ed0fd17f54be95e2a835054/2x', is_animated: 1 },
  { id: 126, code: 'btnoob', alias: 'btNOOB', shortcode: ':btnoob:', image_url: 'https://cdn.betterttv.net/emote/5e8b86328fb1ca5cde5866b5/2x', is_animated: 1 },
  { id: 127, code: 'bthug', alias: 'btHUG', shortcode: ':bthug:', image_url: 'https://cdn.betterttv.net/emote/5b53f5f2e78929110b2ac92c/2x', is_animated: 1 },
  { id: 128, code: 'bttasty', alias: 'btTASTY', shortcode: ':bttasty:', image_url: 'https://cdn.betterttv.net/emote/5ebe1f72ec17d81685a4f97a/2x', is_animated: 1 },
  { id: 129, code: 'btdance', alias: 'btDANCE', shortcode: ':btdance:', image_url: 'https://cdn.betterttv.net/emote/61ce1122c8cc7f36d52b0dd0/2x', is_animated: 1 },
  { id: 130, code: 'btlaugh', alias: 'btLAUGH', shortcode: ':btlaugh:', image_url: 'https://cdn.betterttv.net/emote/61ce10e0c8cc7f36d52b0dcb/2x', is_animated: 1 },
  { id: 131, code: 'btcry', alias: 'btCRY', shortcode: ':btcry:', image_url: 'https://cdn.betterttv.net/emote/61ce109ec8cc7f36d52b0dc5/2x', is_animated: 1 },
  { id: 132, code: 'btgiga', alias: 'btGIGA', shortcode: ':btgiga:', image_url: 'https://cdn.7tv.app/emote/60ae958e229664e8667aea38/2x.webp', is_animated: 1 },
  { id: 133, code: 'donowall', alias: 'donowall', shortcode: ':donowall:', image_url: 'https://cdn.7tv.app/emote/60a9cfe96daf811370b0b640/2x.webp', is_animated: 1 },
  { id: 134, code: 'pepegiggles', alias: 'pepegiggles', shortcode: ':pepegiggles:', image_url: 'https://cdn.7tv.app/emote/60af03597e8706b57220e8ce/2x.webp', is_animated: 1 },
  { id: 135, code: 'catflashbang', alias: 'catflashbang', shortcode: ':catflashbang:', image_url: 'https://cdn.7tv.app/emote/60baca0a3285d8b0b8a051c9/2x.webp', is_animated: 1 },
  { id: 136, code: 'brffpoh', alias: 'brffpoh', shortcode: ':brffpoh:', image_url: 'https://cdn.7tv.app/emote/64b227cb1cc37958c10efaeb/2x.webp', is_animated: 1 },
  { id: 137, code: 'btcatplz', alias: 'btcatplz', shortcode: ':btcatplz:', image_url: 'https://cdn.7tv.app/emote/612d78ab29ee958c97fe6b91/2x.webp', is_animated: 1 },
  { id: 138, code: 'brffflex', alias: 'brffflex', shortcode: ':brffflex:', image_url: 'https://cdn.7tv.app/emote/616b51f5d89696663cf3406a/2x.webp', is_animated: 1 },
  { id: 139, code: 'btcatjam', alias: 'btCatJam', shortcode: ':btcatjam:', image_url: 'https://cdn.7tv.app/emote/60ae4f0a5d3fdae583146082/2x.webp', is_animated: 1 },
  { id: 140, code: 'l1337spin', alias: 'l1337spin', shortcode: ':l1337spin:', image_url: 'https://cdn.7tv.app/emote/63a450b407b5c0d21b2f9a38/2x.webp', is_animated: 1 },
  { id: 141, code: 'l1337dance', alias: 'l1337dance', shortcode: ':l1337dance:', image_url: 'https://cdn.7tv.app/emote/6211cf2e5e821986e6f95ea9/2x.webp', is_animated: 1 },
  { id: 142, code: 'l1337punch', alias: 'l1337punch', shortcode: ':l1337punch:', image_url: 'https://cdn.7tv.app/emote/6195998170bd99598794f86c/2x.webp', is_animated: 1 },
  { id: 143, code: 'l1337skoka', alias: 'l1337skoka', shortcode: ':l1337skoka:', image_url: 'https://cdn.7tv.app/emote/654bc8f8cf586d12ce2f320c/2x.webp', is_animated: 1 },
  { id: 144, code: 'l1337sng', alias: 'l1337sng', shortcode: ':l1337sng:', image_url: 'https://cdn.7tv.app/emote/63b43c6e977fdddeadcf8be2/2x.webp', is_animated: 1 },
  { id: 145, code: 'l1337arg', alias: 'l1337arg', shortcode: ':l1337arg:', image_url: 'https://cdn.7tv.app/emote/66b61665071858acca1b3169/2x.webp', is_animated: 1 },
  { id: 146, code: 'l1337drink', alias: 'l1337drink', shortcode: ':l1337drink:', image_url: 'https://cdn.7tv.app/emote/626eef3debaf81a66f3d3773/2x.webp', is_animated: 1 },
  { id: 147, code: 'l1337molu', alias: 'l1337molu', shortcode: ':l1337molu:', image_url: 'https://cdn.7tv.app/emote/64df6048b7ce014343af9320/2x.webp', is_animated: 1 },
];

export const FALLBACK_PACKS: StickerPack[] = [
  {
    id: 1,
    slug: 'native',
    title: 'Классические',
    icon_url: '/img/stickers/webp/privet.webp',
    author: 'Zypo',
    scope: 'all',
    sort_order: 1,
    stickers: FALLBACK_NATIVE_STICKERS,
  },
  {
    id: 2,
    slug: 'memes',
    title: 'Мемы и реакции',
    icon_url: 'https://cdn.betterttv.net/emote/5590b223b344e2c42a9e28e3/2x',
    author: 'BetterTTV / 7TV',
    scope: 'all',
    sort_order: 2,
    stickers: FALLBACK_MEMES_STICKERS,
  },
];

let inMemoryPacks: StickerPack[] | null = null;
let inMemoryLookup: Map<string, Sticker> | null = null;
let fetchPromise: Promise<StickerPack[]> | null = null;

function buildLookupMap(packs: StickerPack[]): Map<string, Sticker> {
  const map = new Map<string, Sticker>();
  for (const pack of packs) {
    for (const sticker of pack.stickers) {
      const code = sticker.code.toLowerCase();
      map.set(code, sticker);
      map.set(`:${code}:`, sticker);
      if (sticker.alias) {
        map.set(sticker.alias, sticker);
        map.set(sticker.alias.toLowerCase(), sticker);
        map.set(`:${sticker.alias}:`, sticker);
        map.set(`:${sticker.alias.toLowerCase()}:`, sticker);
      }
    }
  }
  return map;
}

export function getCachedStickerPacks(): StickerPack[] {
  if (inMemoryPacks && inMemoryPacks.length > 0) {
    return inMemoryPacks;
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STICKERS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StickerPack[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryPacks = parsed;
          inMemoryLookup = buildLookupMap(parsed);
          return parsed;
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  inMemoryPacks = FALLBACK_PACKS;
  inMemoryLookup = buildLookupMap(FALLBACK_PACKS);
  return FALLBACK_PACKS;
}

export async function fetchStickerPacks(scope: 'all' | 'posts' | 'messages' = 'all'): Promise<StickerPack[]> {
  const current = getCachedStickerPacks();

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const response = await fetch(`/api/V2/stickers/GetPacks.php?scope=${encodeURIComponent(scope)}`, {
        cache: 'default',
      });
      if (response.ok) {
        const json = await response.json();
        if (json?.success && Array.isArray(json?.data?.packs) && json.data.packs.length > 0) {
          const packs = json.data.packs as StickerPack[];
          inMemoryPacks = packs;
          inMemoryLookup = buildLookupMap(packs);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(STICKERS_CACHE_KEY, JSON.stringify(packs));
            } catch {
              // Ignore quota error
            }
          }
          return packs;
        }
      }
    } catch {
      // Fall back to cached or default
    } finally {
      fetchPromise = null;
    }

    return current;
  })();

  return fetchPromise;
}

export function getStickerByCode(codeOrShortcode: string): Sticker | null {
  if (!codeOrShortcode) return null;
  if (!inMemoryLookup) {
    getCachedStickerPacks();
  }

  const clean = codeOrShortcode.trim();
  const lower = clean.toLowerCase();

  return inMemoryLookup?.get(clean) || inMemoryLookup?.get(lower) || null;
}

export function getRecentStickers(): Sticker[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_STICKERS_KEY);
    if (!raw) return [];
    const codes = JSON.parse(raw) as string[];
    if (!Array.isArray(codes)) return [];

    const stickers: Sticker[] = [];
    for (const code of codes) {
      const st = getStickerByCode(code);
      if (st) {
        stickers.push(st);
      }
    }
    return stickers;
  } catch {
    return [];
  }
}

export function recordRecentSticker(stickerCode: string): void {
  if (typeof window === 'undefined' || !stickerCode) return;
  try {
    const clean = stickerCode.replace(/^:/, '').replace(/:$/, '').trim();
    const raw = localStorage.getItem(RECENT_STICKERS_KEY);
    let codes: string[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(codes)) codes = [];

    codes = [clean, ...codes.filter((c) => c.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT_STICKERS);
    localStorage.setItem(RECENT_STICKERS_KEY, JSON.stringify(codes));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Рендерит HTML-разметку стикера в соответствии с дизайн-системой Zypo
 */
export function renderStickerHtml(code: string, imageUrl: string, isStandalone: boolean = false): string {
  const safeCode = code.replace(/[&"<>]/g, (c) =>
    c === '&' ? '&amp;' : c === '"' ? '&quot;' : c === '<' ? '&lt;' : '&gt;'
  );
  const safeUrl = imageUrl.replace(/"/g, '&quot;');
  const imgClass = isStandalone
    ? 'h-24 w-24 object-contain inline-block my-1 rounded-2xl select-none'
    : 'h-10 w-10 inline-block align-middle object-contain mx-0.5 select-none';

  return `<span class="inline-sticker-wrapper relative group inline-block cursor-pointer active:scale-95 duration-300" data-sticker="${safeCode}" contenteditable="false"><img class="${imgClass} copy" data-clipboard-text=":${safeCode}:" src="${safeUrl}" alt=":${safeCode}:" loading="lazy" /><span class="hidden group-hover:flex -top-7 left-0 text-xs h-6 items-center justify-center w-fit bg-zinc-800/90 border border-zinc-600/30 text-zinc-200 px-1.5 absolute rounded-full backdrop-blur-lg shadow pointer-events-none select-none z-10">:${safeCode}:</span></span>`;
}

/**
 * Проверяет, состоит ли текст сообщения/поста только из одного стикера
 */
export function isSingleSticker(content: string | null | undefined): boolean {
  if (!content) return false;
  const clean = content.trim();
  if (/^:7tv-[a-zA-Z0-9_\-]+(-[a-zA-Z0-9]+)?:$/i.test(clean)) return true;
  if (/^:([a-zA-Z0-9_\-]+):$/.test(clean)) return true;
  return false;
}

/**
 * Парсит текст/HTML и заменяет шорткоды стикеров (:code:, 7TV, алиасы) на HTML-компоненты
 */
export function parseStickersToHtml(content: string | null | undefined, allowStandalone: boolean = false): string {
  if (!content) return '';

  let html = content
    .replaceAll('/includes/img/anlite/stickers/webp/', '/img/stickers/webp/')
    .replaceAll('?id=NEW', '');

  // Проверяем, является ли сообщение одиночным стикером (только если разрешено allowStandalone)
  let isStandalone = false;
  if (allowStandalone) {
    const trimmed = html.trim();
    const singleMatch = trimmed.match(/^:([a-zA-Z0-9_\-]+):$/);
    if (singleMatch) {
      const rawCode = singleMatch[1];
      const sevenTvMatch = rawCode.match(/^7tv-([a-zA-Z0-9_\-]+)(?:-([a-zA-Z0-9]+))?$/i);
      if (sevenTvMatch) {
        isStandalone = true;
      } else if (getStickerByCode(rawCode)) {
        isStandalone = true;
      }
    }
  }

  // 1. Заменяем стандартные шорткоды :code: и 7TV стикеры :7tv-name-id:
  html = html.replace(/:([a-zA-Z0-9_\-]+):/gi, (match, rawCode: string) => {
    // Проверяем формат 7TV стикера :7tv-name-id:
    const sevenTvMatch = rawCode.match(/^7tv-([a-zA-Z0-9_\-]+)(?:-([a-zA-Z0-9]+))?$/i);
    if (sevenTvMatch) {
      const stickerName = sevenTvMatch[1];
      const stickerId = sevenTvMatch[2];
      const url = stickerId ? `https://cdn.7tv.app/emote/${stickerId}/2x.webp` : '';
      if (url) {
        return renderStickerHtml(stickerName, url, isStandalone);
      }
    }

    const sticker = getStickerByCode(rawCode);
    if (sticker) {
      const url = sticker.image_url_avif || sticker.image_url;
      return renderStickerHtml(sticker.code, url, isStandalone);
    }

    return match;
  });

  // 2. Заменяем BetterTTV / Memes алиасы (например btEZ, btbDOLBIT, donowall, l1337spin) вне HTML-тегов
  const bttvAliases = [
    'btEZ', 'btCJ', 'btbDOLBIT', 'btbPOG', 'btPA', 'btTU', 'btBOOBA', 'btCLAP',
    'btLOVE', 'btAFK', 'bt89', 'btPOP', 'btPOO', 'btEAT', 'btAGA', 'btVK',
    'btYOUTUBE', 'btHEART', 'btNEA', 'btBAN', 'btBB', 'btALIEN', 'btABDUL',
    'btDURAK', 'btRACER', 'btNOOB', 'btHUG', 'btTASTY', 'btDANCE', 'btLAUGH',
    'btCRY', 'btGIGA', 'donowall', 'pepegiggles', 'catflashbang', 'brffpoh',
    'btcatplz', 'brffflex', 'btCatJam', 'l1337spin', 'l1337dance', 'l1337punch',
    'l1337skoka', 'l1337sng', 'l1337arg', 'l1337drink', 'l1337molu'
  ];

  for (const alias of bttvAliases) {
    const sticker = getStickerByCode(alias);
    if (sticker) {
      const url = sticker.image_url_avif || sticker.image_url;
      const replacement = renderStickerHtml(sticker.code, url, false);
      const regex = new RegExp(`(<[^>]+>)|(?:^|[\\s\\n(])(${alias})(?=$|[\\s\\n<.,!?:;)])`, 'g');
      html = html.replace(regex, (match, htmlTag, capturedAlias) => {
        if (htmlTag) return htmlTag;
        if (capturedAlias) {
          const prefix = match.slice(0, match.length - capturedAlias.length);
          return prefix + replacement;
        }
        return match;
      });
    }
  }

  return html;
}
