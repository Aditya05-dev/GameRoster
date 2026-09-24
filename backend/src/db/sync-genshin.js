import { pool } from "./pool.js";
import { importCatalog } from "../services/catalogImport.js";
try {
  console.log(
    await importCatalog(pool, undefined, {
      dryRun: process.argv.includes("--dry-run"),
    }),
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
