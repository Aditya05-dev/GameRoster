import { fileURLToPath } from "node:url";

// Tests never load the developer's .env or its database credentials.
process.env.DOTENV_CONFIG_PATH = fileURLToPath(new URL("./unused-test.env", import.meta.url));
process.env.NODE_ENV = "test";
process.env.PGSSL = "false";
process.env.JWT_ACCESS_SECRET = "test-only-access-secret-not-for-deployment";
process.env.JWT_REFRESH_SECRET = "test-only-refresh-secret-not-for-deployment";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://test:test@127.0.0.1:1/unused";
