import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import "dotenv/config";

import { authRouter } from "./routes/auth.routes.js";
import { usersRouter } from "./routes/users.routes.js";
import { gamesRouter } from "./routes/games.routes.js";
import { charactersRouter } from "./routes/characters.routes.js";
import { buildsRouter } from "./routes/builds.routes.js";
import { teamsRouter } from "./routes/teams.routes.js";
import { favoritesRouter } from "./routes/favorites.routes.js";
import { farmingRouter } from "./routes/farming.routes.js";
import { notificationsRouter } from "./routes/notifications.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { catalogRouter } from "./routes/catalog.routes.js";
import { guidesRouter } from "./routes/guides.routes.js";
import { tierListsRouter } from "./routes/tierlists.routes.js";
import { socialRouter } from "./routes/social.routes.js";
import { mapsRouter } from "./routes/maps.routes.js";
import { profileLookupRouter } from "./routes/profileLookup.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export const app = express();

app.set("trust proxy", 1); // needed on Railway/Render/etc. for correct rate-limit IPs behind a proxy

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || true,
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Generous global limit against abuse; auth routes get a tighter one below
// since credential-stuffing/enumeration attempts target those specifically.
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: "Too many attempts. Try again later." } });

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/users", usersRouter);
app.use("/api/games", gamesRouter);
app.use("/api/characters", charactersRouter);
app.use("/api/builds", buildsRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/farming-plans", farmingRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/guides", guidesRouter);
app.use("/api/tier-lists", tierListsRouter);
app.use("/api/social", socialRouter);
app.use("/api/maps", mapsRouter);
app.use("/api/profile-lookup", profileLookupRouter);

app.use(notFoundHandler);
app.use(errorHandler);
