import { API } from "./api";
import { formatStat } from "./hooks";

// Render normalized data directly. Only approved same-origin art enters the canvas.
export async function exportBuild(build, { uid = "", showUid = false } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 1220;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0a1020";
  ctx.fillRect(0, 0, 1400, 1220);
  const gradient = ctx.createLinearGradient(0, 0, 1400, 600);
  gradient.addColorStop(0, "#273449");
  gradient.addColorStop(1, "#101728");
  ctx.fillStyle = gradient;
  ctx.fillRect(24, 24, 1352, 1172);
  const drawText = (text, x, y, size = 24, color = "#dde6fa", max = 1000) => {
    ctx.fillStyle = color;
    ctx.font = `${size >= 34 ? "bold " : ""}${size}px system-ui, sans-serif`;
    ctx.fillText(String(text ?? ""), x, y, max);
  };
  const loadArt = async (url) => {
    if (!/^https:\/\/enka\.network\/ui\/[A-Za-z0-9_-]+\.png$/.test(url || ""))
      return null;
    let timer;
    try {
      const img = new Image();
      img.src = `${API}/assets/${url.split("/").pop()}`;
      await Promise.race([
        img.decode(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(Error("Image timeout")), 5000);
        }),
      ]);
      return img;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
  const artifacts = (build.artifacts || []).slice(0, 5);
  const [hero, weaponArt, ...artifactArt] = await Promise.all([
    loadArt(build.artwork || build.image),
    loadArt(build.weapon?.image),
    ...artifacts.map((a) => loadArt(a.image)),
  ]);
  const drawArt = (img, x, y, width, height) => {
    if (!img) return;
    const scale = Math.min(width / img.width, height / img.height);
    ctx.drawImage(
      img,
      x + (width - img.width * scale) / 2,
      y + (height - img.height * scale) / 2,
      img.width * scale,
      img.height * scale,
    );
  };
  drawText("GAME ROSTER / GENSHIN IMPACT", 60, 74, 19, "#d9b875");
  drawText(build.name, 60, 137, 48);
  drawText(
    `Lv. ${build.level ?? "—"}  ·  C${build.constellation ?? "—"}`,
    60,
    178,
    24,
    "#a4b3cd",
  );
  drawArt(hero, 900, 55, 430, 410);
  Object.entries(build.stats || {})
    .filter(
      ([key, s]) =>
        [
          "hp",
          "atk",
          "def",
          "em",
          "critRate",
          "critDamage",
          "energyRecharge",
        ].includes(key) || s.value > 0,
    )
    .slice(0, 10)
    .forEach(([, s], i) => {
      const x = 60 + (i % 2) * 410,
        y = 240 + Math.floor(i / 2) * 53;
      drawText(s.label, x, y, 20, "#9faec7", 265);
      drawText(formatStat(s), x + 285, y, 23, "#f3f5fc", 115);
    });
  drawArt(weaponArt, 60, 500, 95, 115);
  drawText(
    build.weapon?.name || "Weapon not available",
    180,
    535,
    29,
    "#edd095",
    660,
  );
  drawText(
    build.weapon
      ? `Lv. ${build.weapon.level ?? "—"} · R${build.weapon.refinement ?? "—"}`
      : "",
    180,
    570,
    22,
    "#a4b3cd",
  );
  drawText(
    (build.weapon?.stats || [])
      .map((s) => `${s.label} ${formatStat(s)}`)
      .join(" · "),
    180,
    604,
    18,
    "#b5c1d9",
    660,
  );
  drawText("TALENT LEVELS", 930, 525, 17, "#d9b875");
  drawText(
    (build.talents || [])
      .map((t) =>
        t.baseLevel == null
          ? "—"
          : `${t.baseLevel}${t.bonus ? ` + ${t.bonus}` : ""}`,
      )
      .join("  /  ") || "Unavailable",
    930,
    565,
    28,
    "#dde6fa",
    390,
  );
  drawText("Normal attack / Skill / Burst", 930, 598, 17, "#9faec7", 390);
  artifacts.forEach((a, i) => {
    const x = 55 + i * 263;
    ctx.fillStyle = "#182237";
    ctx.fillRect(x, 655, 248, 440);
    drawArt(artifactArt[i], x + 70, 667, 108, 98);
    drawText(a.name, x + 15, 795, 19, "#e3c37d", 215);
    drawText(a.setName, x + 15, 826, 15, "#99aacc", 215);
    drawText(`+${a.level ?? "—"} · ${a.rarity || "—"}★`, x + 15, 858, 17);
    drawText(
      `${a.mainStat?.label || ""} ${formatStat(a.mainStat)}`,
      x + 15,
      902,
      19,
      "#eef3ff",
      215,
    );
    (a.substats || []).forEach((s, j) =>
      drawText(
        `${s.label} ${formatStat(s)}`,
        x + 15,
        941 + j * 35,
        17,
        "#b5c1d9",
        215,
      ),
    );
  });
  if (!artifacts.length)
    drawText(
      "Artifact details unavailable in this snapshot.",
      60,
      740,
      22,
      "#9faec7",
    );
  drawText(
    showUid && uid ? `UID ${uid}` : "UID hidden",
    60,
    1162,
    18,
    "#99aacc",
  );
  drawText(
    "Public showcase via Enka.Network • gameroster",
    650,
    1162,
    17,
    "#99aacc",
    690,
  );
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw Error("Your browser could not create an image.");
  const href = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = href;
  link.download = `${(build.name || "build").replace(/[^a-z0-9]+/gi, "-")}-GameRoster.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
  return { imageIncluded: Boolean(hero) };
}
