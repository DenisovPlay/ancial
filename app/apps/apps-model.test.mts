import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getOverlayGame,
  rewriteLegacyPlayUrl,
  splitScreenshots,
  toBooleanFlag,
} from "./apps-model.ts";

test("rewriteLegacyPlayUrl converts legacy overlay links to the App Router route", () => {
  assert.equal(
    rewriteLegacyPlayUrl("/anui/apps/playoverlay?gm=hgl"),
    "/apps/overlay/hgl",
  );
  assert.equal(
    rewriteLegacyPlayUrl("https://ancial.ru/anui/apps/playoverlay?gm=venge.io"),
    "/apps/overlay/venge.io",
  );
  assert.equal(
    rewriteLegacyPlayUrl("/apps/overlay?gm=minecraft"),
    "/apps/overlay/minecraft",
  );
});

test("getOverlayGame preserves legacy iframe source and back target", () => {
  const hexgl = getOverlayGame("hgl");
  assert.equal(hexgl?.name, "HexGL");
  assert.equal(hexgl?.src, "https://hexgl.bkcore.com/play/");
  assert.equal(hexgl?.backHref, "/apps");

  const weather = getOverlayGame("weather");
  assert.equal(weather?.src, "/apps/included/weather");
  assert.equal(weather?.backHref, "/");
});

test("splitScreenshots drops empty legacy separators", () => {
  assert.deepEqual(splitScreenshots("/a.png||/b.png|"), ["/a.png", "/b.png"]);
});

test("toBooleanFlag handles numeric and string legacy flags", () => {
  assert.equal(toBooleanFlag(1), true);
  assert.equal(toBooleanFlag("1"), true);
  assert.equal(toBooleanFlag(0), false);
  assert.equal(toBooleanFlag(""), false);
});
