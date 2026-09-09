import { verifyAccessToken } from "../utils/jwt.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing access token." });
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired access token." });
  }
}

// Attaches req.user if a valid token is present, but doesn't reject the
// request otherwise — for endpoints that behave differently when logged in
// (e.g. showing private content) but are also open to anonymous visitors.
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, username: payload.username };
  } catch {
    // Ignore invalid tokens on optional routes rather than rejecting.
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required." });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to perform this action." });
    }
    next();
  };
}

export const requireAdmin = requireRole("admin");

// Lets a request through if the caller owns the resource OR is an admin.
// `getOwnerId` is an async function (req) => ownerUserId.
export function requireOwnerOrAdmin(getOwnerId) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required." });
    if (req.user.role === "admin") return next();
    try {
      const ownerId = await getOwnerId(req);
      if (ownerId && ownerId === req.user.id) return next();
      return res.status(403).json({ error: "You can only modify your own content." });
    } catch (err) {
      next(err);
    }
  };
}
