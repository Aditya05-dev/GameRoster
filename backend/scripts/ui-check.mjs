// Isolated end-to-end checks. Install Chromium with: npx playwright install chromium.
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { once } from "node:events";
const { chromium: playwright } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const Chromium = process.env.CHROMIUM_MODULE
  ? (await import(process.env.CHROMIUM_MODULE)).default
  : null;
const { app } = await import("../src/app.js");
const { pool } = await import("../src/db/pool.js");
const { hashPassword } = await import("../src/utils/password.js");
const { normalizeEnka } = await import("../src/services/enka.js");
const httpServer = app.listen(0, "127.0.0.1");
await once(httpServer, "listening");
const apiBase = `http://127.0.0.1:${httpServer.address().port}`;
process.env.API_PROXY_TARGET = apiBase;
process.env.VITE_API_URL = "/api";
const { createServer } =
  await import("../../frontend/node_modules/vite/dist/node/index.js");
const vite = await createServer({
  root: fileURLToPath(new URL("../../frontend", import.meta.url)),
  server: { host: "127.0.0.1", port: 0 },
});
await vite.listen();
const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
const out = fileURLToPath(new URL("../../docs/screenshots/", import.meta.url));
await fs.mkdir(out, { recursive: true });
const game = (
  await pool.query("SELECT * FROM games WHERE slug='genshin-impact'")
).rows[0];
const skirk = (
  await pool.query(
    "SELECT * FROM characters WHERE game_id=$1 AND name='Skirk'",
    [game.id],
  )
).rows[0];
const password = "Isolated-ui-fixture-42!";
const user = (
  await pool.query(
    "INSERT INTO users(user_id_public,username,email,password_hash,role) VALUES('UI-TEST','ui_tester','ui@example.test',$1,'admin') RETURNING id",
    [await hashPassword(password)],
  )
).rows[0];
await pool.query("INSERT INTO profiles(user_id) VALUES($1)", [user.id]);
let browser, page;
const errors = [];
const checks = [];
checks.push = (...items) => {
  console.log("Passed:", ...items);
  return Array.prototype.push.apply(checks, items);
};
try {
  browser = await playwright.launch({
    args: Chromium?.args,
    executablePath:
      process.env.CHROMIUM_EXECUTABLE ||
      (Chromium ? await Chromium.executablePath() : undefined),
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    deviceScaleFactor: 1,
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (
      r.url().startsWith(base + "/api/") &&
      r.status() >= 500 &&
      !r.url().includes("/assets/")
    )
      errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(base);
  await page.getByRole("heading", { name: "Where are we heading?" }).waitFor();
  await page.screenshot({ path: out + "01-home-desktop.png", fullPage: true });
  checks.push("Home loads games without featured characters");
  await page.goto(base + "/games/genshin-impact/characters");
  await page.getByText("124 entries", { exact: true }).waitFor();
  await page.getByRole("searchbox").fill("Skirk");
  await page.getByRole("heading", { name: "Skirk", exact: true }).waitFor();
  assert.equal(await page.locator(".characterCard").count(), 1);
  await page.getByRole("searchbox").fill("");
  await page.getByRole("heading", { name: "Albedo", exact: true }).waitFor();
  await page.screenshot({
    path: out + "02-character-archive-desktop.png",
    fullPage: true,
  });
  checks.push("Catalog search and page results");
  await page.goto(base + `/characters/${skirk.id}`);
  await page.getByRole("heading", { name: "Skirk", exact: true }).waitFor();
  await page.waitForFunction(
    () => document.querySelector(".characterSplash")?.naturalWidth > 0,
    {},
    { timeout: 30000 },
  );
  await page.getByRole("button", { name: "build", exact: true }).click();
  await page
    .getByRole("heading", { name: "5★ weapon recommendations" })
    .waitFor();
  await page.getByText("Azurelight", { exact: true }).waitFor();
  await page.screenshot({
    path: out + "03-skirk-build-desktop.png",
    fullPage: true,
  });
  checks.push("Skirk dashboard and curated weapon recommendations");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.getByLabel("Username", { exact: true }).fill("ui_tester");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("dialog")
    .locator("form")
    .getByRole("button", { name: "Log in", exact: true })
    .click();
  await page.getByRole("link", { name: "ui_tester" }).waitFor();
  await page.getByRole("button", { name: "overview", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Level", exact: true }).fill("90");
  await page.getByLabel("Constellation", { exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Save to my roster" }).click();
  await page.goto(base + "/roster");
  await page.getByText("Lv. 90 · C2 · Cryo").waitFor();
  checks.push("Login and persisted roster");
  await page.goto(base + `/characters/${skirk.id}?tab=ascension`);
  await page.getByRole("button", { name: "Calculate materials" }).click();
  await page.getByRole("heading", { name: "Your upgrade checklist" }).waitFor();
  await page.getByRole("button", { name: "Save farming plan" }).click();
  await page.getByRole("button", { name: "Saved to farming plans" }).waitFor();
  await page.goto(base + "/farming");
  await page.getByRole("heading", { name: "Skirk", exact: true }).waitFor();
  await page.getByLabel("Collected Mora").fill("100");
  await page.getByRole("button", { name: "Save progress" }).click();
  await page.getByText("Progress saved", { exact: true }).waitFor();
  await page.reload();
  await page.getByLabel("Collected Mora").waitFor();
  assert.equal(await page.getByLabel("Collected Mora").inputValue(), "100");
  await page.screenshot({
    path: out + "04-farming-desktop.png",
    fullPage: true,
  });
  checks.push("Cost calculation, farming save and inventory persistence");
  await page.goto(base + "/teams");
  await page.getByRole("button", { name: "Create team +" }).click();
  await page.getByLabel("Team name", { exact: true }).fill("Skirk UI test");
  const choices = page.getByLabel("Character", { exact: true });
  await choices.nth(0).selectOption({ label: "Skirk" });
  await choices.nth(1).selectOption({ label: "Furina" });
  await choices.nth(2).selectOption({ label: "Escoffier" });
  await choices.nth(3).selectOption({ label: "Yelan" });
  await page
    .getByLabel("Rotation and notes")
    .fill("Apply off-field abilities, then use Skirk on field.");
  await page.getByRole("button", { name: "Save team", exact: true }).click();
  await page
    .getByRole("heading", { name: "Skirk UI test", exact: true })
    .waitFor();
  checks.push("Four-character team save");
  const raw = {
    playerInfo: {
      nickname: "Browser test fixture",
      level: 60,
      worldLevel: 8,
      finishAchievementNum: 1000,
    },
    ttl: 60,
    avatarInfoList: [
      {
        avatarId: 10000114,
        skillDepotId: 11401,
        propMap: { 4001: { val: "90" }, 1002: { val: "6" } },
        fightPropMap: {
          2000: 22000,
          2001: 2400,
          2002: 900,
          20: 0.72,
          22: 1.8,
          23: 1.25,
          28: 0,
          46: 0.466,
        },
        skillLevelMap: { 11141: 1, 11142: 10, 11145: 8 },
        talentIdList: [1],
        equipList: [
          {
            itemId: 11517,
            weapon: { level: 90, affixMap: { 111517: 0 } },
            flat: {
              nameTextMapHash: 1,
              rankLevel: 5,
              icon: "UI_EquipIcon_Sword_OuterSword",
              weaponStats: [
                { appendPropId: "FIGHT_PROP_BASE_ATTACK", statValue: 674 },
              ],
            },
          },
          {
            itemId: 1,
            reliquary: { level: 21 },
            flat: {
              nameTextMapHash: 2,
              setNameTextMapHash: 3,
              rankLevel: 5,
              equipType: "EQUIP_RING",
              icon: "UI_RelicIcon_15040_1",
              reliquaryMainstat: {
                mainPropId: "FIGHT_PROP_ICE_ADD_HURT",
                statValue: 46.6,
              },
              reliquarySubstats: [
                { appendPropId: "FIGHT_PROP_CRITICAL", statValue: 10.5 },
              ],
            },
          },
        ],
      },
    ],
  };
  const fixture = normalizeEnka(raw, "123456789");
  fixture.characters[0].characterId = skirk.id;
  fixture.characters[0].weapon.name = "Azurelight";
  fixture.characters[0].artifacts[0].name = "Fixture goblet";
  fixture.characters[0].artifacts[0].setName = "Finale of the Deep Galleries";
  await page.route("**/api/profile-lookup", (route) =>
    route.fulfill({ json: fixture }),
  );
  await page.goto(base + "/lookup");
  await page.getByLabel("Genshin UID").fill("123456789");
  await page.getByRole("button", { name: "View showcase →" }).click();
  await page.getByText("22,000", { exact: true }).waitFor();
  await page.getByText("2,400", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Save build", exact: true }).click();
  await page.getByText("Saved privately to My builds.").waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const download = await downloadPromise;
  await download.saveAs(out + "05-build-export-fixture.png");
  checks.push("Fixture UID normalization UI, private save and PNG export");
  await page.screenshot({
    path: out + "06-uid-build-fixture-desktop.png",
    fullPage: true,
  });
  await page.goto(base + "/builds");
  await page.getByText("View build card", { exact: true }).click();
  await page.getByText("22,000", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await page.getByRole("heading", { name: "Build comparison" }).waitFor();
  checks.push("Saved build reload and comparison");
  await page.goto(base + "/admin");
  await page.getByRole("button", { name: "Create entry +" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Review fixture");
  await page.getByLabel("URL slug").fill("review-fixture");
  await page.getByLabel("Rarity", { exact: true }).fill("4");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page
    .getByRole("heading", { name: "Review fixture", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Continue editing" }).click();
  await page.getByRole("button", { name: "Create entry", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  checks.push("Admin create, preview, and draft save");
  const map = (
    await pool.query(
      "INSERT INTO maps(game_id,name,image_url,is_visible) VALUES($1,'Coordinate test fixture','https://example.test/coordinate-fixture.svg',true) RETURNING id",
      [game.id],
    )
  ).rows[0];
  await pool.query(
    "INSERT INTO map_markers(map_id,label,category,x,y) VALUES($1,'Fixture material','Materials',25,75),($1,'Fixture chest','Chests',60,30)",
    [map.id],
  );
  await page.route("https://example.test/coordinate-fixture.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#1a3451"/><path d="M0 250H800M400 0V500" stroke="#65879e"/><text x="30" y="50" fill="white" font-size="24">Coordinate test fixture — not a game map</text></svg>',
    }),
  );
  await page.goto(base + "/games/genshin-impact/map");
  await page
    .getByRole("button", { name: "Fixture material", exact: true })
    .waitFor();
  await page.waitForFunction(
    () => document.querySelector(".mapImage")?.naturalWidth > 0,
  );
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  const layer = await page.locator(".mapImageLayer").boundingBox(),
    pin = await page
      .getByRole("button", { name: "Fixture material", exact: true })
      .boundingBox();
  assert.ok(
    Math.abs((pin.x + pin.width / 2 - layer.x) / layer.width - 0.25) < 0.002,
  );
  assert.ok(
    Math.abs((pin.y + pin.height / 2 - layer.y) / layer.height - 0.75) < 0.002,
  );
  await page
    .getByRole("button", { name: "Fixture material", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mark collected", exact: true })
    .click();
  await page.getByText("1 collected / 2 markers", { exact: true }).waitFor();
  await page.reload();
  await page.getByText("1 collected / 2 markers", { exact: true }).waitFor();
  await page.getByLabel("Hide collected", { exact: true }).check();
  assert.equal(
    await page
      .getByRole("button", { name: "Fixture material", exact: true })
      .count(),
    0,
  );
  await page.getByLabel("Chests", { exact: true }).check();
  assert.equal(await page.locator(".mapMarker").count(), 1);
  checks.push(
    "Fixture map coordinates after zoom, category filtering and persisted collections",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/",
    "/games/genshin-impact/characters",
    `/characters/${skirk.id}`,
    "/farming",
    "/teams",
    "/builds",
    "/dashboard",
    "/admin",
    "/games/genshin-impact/map",
  ]) {
    await page.goto(base + path);
    await page.locator(".loading").first().waitFor({ state: "hidden" });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Horizontal overflow at ${path}`,
    );
  }
  await page.goto(base + `/characters/${skirk.id}`);
  await page.getByRole("heading", { name: "Skirk", exact: true }).waitFor();
  await page.screenshot({ path: out + "07-skirk-mobile.png", fullPage: true });
  checks.push("Nine mobile routes fit without horizontal overflow");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.locator(".atmosphere").isVisible(), false);
  checks.push("Reduced motion respected");
  assert.deepEqual(errors, []);
  await fs.writeFile(
    out + "verification.json",
    JSON.stringify(
      {
        checks,
        errors,
        uidData: "Synthetic test fixture; no player UID was fetched",
        catalog: "Actual imported genshin-db catalog",
      },
      null,
      2,
    ),
  );
  console.log("Browser checks:", checks.join("; "));
} catch (e) {
  console.error("Browser failure:", e);
  if (page) {
    console.log("Failure URL:", page.url());
    await page
      .screenshot({ path: out + "99-failure.png", timeout: 5000 })
      .catch(() => {});
    console.log(
      "Visible errors:",
      await page.locator(".error").allTextContents(),
    );
    console.log(
      "Select labels:",
      await page
        .locator("select")
        .evaluateAll((els) =>
          els.map(
            (el) =>
              el.getAttribute("aria-label") || el.closest("label")?.textContent,
          ),
        ),
    );
  }
  throw e;
} finally {
  await browser?.close();
  await vite.close();
  await new Promise((resolve) => httpServer.close(resolve));
  await pool.end();
}
