export type LegacyAppSummary = {
  cover: string;
  desk: string;
  downloads: number | string;
  id: number | string;
  name: string;
  red_chois: number | string;
};

export type LegacyAppInfo = LegacyAppSummary & {
  developer: string;
  img?: string;
  link_web: string;
  screenshots: string;
};

export type LegacyAppsResponse = {
  data?: {
    apps?: LegacyAppSummary[];
    category?: string;
    query?: string;
  };
  error?: string | null;
  success: boolean;
};

export type LegacyAppInfoResponse = {
  app?: LegacyAppInfo[];
  error?: string | null;
  success: boolean;
};

export type OverlayGame = {
  backHref: string;
  id: string;
  name: string;
  requiresAuth?: boolean;
  src: string;
};

const overlayGames: Record<string, OverlayGame> = {
  pb: {
    backHref: "/apps",
    id: "pb",
    name: "Pixel Battle",
    requiresAuth: true,
    src: "https://ancial.ru/anui/apps/pb/new_index.php",
  },
  hgl: {
    backHref: "/apps",
    id: "hgl",
    name: "HexGL",
    src: "https://hexgl.bkcore.com/play/",
  },
  swp: {
    backHref: "/apps",
    id: "swp",
    name: "Swooop",
    src: "https://s3-eu-west-1.amazonaws.com/apps.playcanvas.com/R2axJfsc/index.html",
  },
  efxp: {
    backHref: "/apps",
    id: "efxp",
    name: "Escape From XP",
    src: "https://r4to0.gitlab.io/escape-from-xp/index.html#arcade",
  },
  snk: {
    backHref: "/apps",
    id: "snk",
    name: "Snake",
    src: "https://alirezaomidi.github.io/classic-snake-html5/",
  },
  brffbingo: {
    backHref: "/apps",
    id: "brffbingo",
    name: "Bingo по Братишкину",
    src: "https://ancial.ru/anui/apps/bingo/",
  },
  kkkr: {
    backHref: "/apps",
    id: "kkkr",
    name: "King Kong Kart Racing",
    src: "https://cdn.now.gg/html5-games/com.nowgg.h5.pub474.app51807/king-kong-kart-racing/index.html",
  },
  blxd: {
    backHref: "/apps",
    id: "blxd",
    name: "Bloxd.io",
    src: "https://bloxd.io/?nggPlayUrl=https%3A%2F%2Fnow.gg%2Fapps%2Fbloxd%2F51240%2Fbloxd-io.html",
  },
  fnaf: {
    backHref: "/apps",
    id: "fnaf",
    name: "Five Nights at Freddy`s",
    src: "https://cdn.now.gg/html5-games/com.nowgg.h5.pub501.app51750/five-nights-at-freddy-s/index.html",
  },
  minecraft: {
    backHref: "/apps",
    id: "minecraft",
    name: "Minecraft",
    src: "https://classic.minecraft.net/",
  },
  "venge.io": {
    backHref: "/apps",
    id: "venge.io",
    name: "Venge.io",
    src: "https://venge.io/",
  },
  miniroyale: {
    backHref: "/apps",
    id: "miniroyale",
    name: "Mini Royale: Nations",
    src: "https://miniroyale.io/",
  },
  weather: {
    backHref: "/",
    id: "weather",
    name: "Weather",
    src: "/apps/included/weather",
  },
};

export function getOverlayGame(id: string | null | undefined) {
  if (!id) {
    return null;
  }

  return overlayGames[decodeURIComponent(id)] ?? null;
}

export function getOverlayGames() {
  return Object.values(overlayGames);
}

export function rewriteLegacyPlayUrl(link: string | null | undefined) {
  if (!link) {
    return "/apps";
  }

  try {
    const url = new URL(link, "https://ancial.ru");
    const isLegacyOverlay =
      url.pathname === "/anui/apps/playoverlay" || url.pathname === "/apps/overlay";
    const game = url.searchParams.get("gm");

    if (isLegacyOverlay && game) {
      return `/apps/overlay/${encodeURIComponent(game)}`;
    }

    if (url.pathname.startsWith("/apps/overlay/")) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return link;
  }

  return link;
}

export function splitScreenshots(screenshots: string | null | undefined) {
  if (!screenshots) {
    return [];
  }

  return screenshots
    .split("|")
    .map((screenshot) => screenshot.trim())
    .filter(Boolean);
}

export function toBooleanFlag(value: number | string | boolean | null | undefined) {
  return value === true || value === 1 || value === "1";
}

export function toAppId(value: number | string) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : value;
}
