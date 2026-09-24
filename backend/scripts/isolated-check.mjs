// Runs the real migrations/API tests against disposable PostgreSQL WASM, never .env.
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const db = await PGlite.create({ extensions: { pgcrypto, citext, pg_trgm } });
const server = new PGLiteSocketServer({
  db,
  port: 0,
  host: "127.0.0.1",
  maxConnections: 30,
});
await server.start();
const databaseUrl = `postgresql://postgres:postgres@${server.getServerConn()}/postgres`;
const env = {
  ...process.env,
  DOTENV_CONFIG_PATH: "/dev/null",
  DATABASE_URL: databaseUrl,
  TEST_DATABASE_URL: databaseUrl,
  PGSSL: "false",
  NODE_ENV: "test",
  JWT_ACCESS_SECRET: "isolated-test-access-secret-only",
  JWT_REFRESH_SECRET: "isolated-test-refresh-secret-only",
  SEED_ADMIN_USERNAME: "",
  SEED_ADMIN_EMAIL: "",
  SEED_ADMIN_PASSWORD: "",
};
async function run(args) {
  const child = spawn(process.execPath, args, { stdio: "inherit", env });
  const [code] = await once(child, "exit");
  if (code) throw Error(`${args.join(" ")} failed (${code})`);
}
try {
  await run(["src/db/migrate.js"]);
  await run(["src/db/seed.js"]);
  await run(["src/db/seed-genshin.js"]);
  const identities = await db.query(
    "SELECT id,native_id FROM characters ORDER BY id",
  );
  await run(["src/db/sync-genshin.js"]);
  await run(["src/db/sync-genshin.js"]);
  assert.deepEqual(
    (await db.query("SELECT id,native_id FROM characters ORDER BY id")).rows,
    identities.rows,
    "Catalog imports must retain UUIDs and avoid duplicates",
  );
  const imports = await db.query("SELECT count(*) FROM catalog_imports");
  await run(["src/db/sync-genshin.js", "--dry-run"]);
  assert.deepEqual(
    (await db.query("SELECT count(*) FROM catalog_imports")).rows,
    imports.rows,
    "Dry run must roll back its import record",
  );
  if (process.argv.includes("--ui")) {
    Object.assign(process.env, env);
    await import("./ui-check.mjs");
  } else {
    await run([
      "--test",
      "--test-concurrency=1",
      "tests/auth.test.js",
      "tests/catalog.test.js",
      "tests/companion.test.js",
      ...process.argv.slice(2),
    ]);
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await server.stop();
  await db.close();
}
