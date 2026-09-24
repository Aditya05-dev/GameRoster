import { writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
const sources = [
  [
    "enka-characters.json",
    "https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/characters.json",
    (x) => x,
  ],
  [
    "enka-loc.json",
    "https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/loc.json",
    (x) => x.en,
  ],
  [
    "avatar-levels.json",
    "https://gitlab.com/Dimbreath/AnimeGameData/-/raw/master/ExcelBinOutput/AvatarLevelExcelConfigData.json",
    (x) => x,
  ],
];
const prepared = [];
for (const [file, url, select] of sources) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(`${file}: HTTP ${r.status}`);
  const value = select(await r.json());
  if (!value || typeof value !== "object" || Object.keys(value).length < 50)
    throw Error(`Invalid ${file}`);
  const content = JSON.stringify(value);
  prepared.push({
    file,
    url,
    content,
    sha256: createHash("sha256").update(content).digest("hex"),
  });
}
for (const { file, content } of prepared)
  await writeFile(new URL(`../src/data/${file}.tmp`, import.meta.url), content);
for (const { file } of prepared)
  await rename(
    new URL(`../src/data/${file}.tmp`, import.meta.url),
    new URL(`../src/data/${file}`, import.meta.url),
  );
await writeFile(
  new URL("../src/data/metadata-sources.json", import.meta.url),
  JSON.stringify(
    {
      retrievedAt: new Date().toISOString(),
      files: prepared.map(({ content, ...entry }) => entry),
    },
    null,
    2,
  ),
);
console.log("Metadata snapshots refreshed. Review the diff before committing.");
