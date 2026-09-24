import { Router } from "express";
import { imageUrl } from "../services/enka.js";
export const assetsRouter = Router();
const cache = new Map(),
  pending = new Map();
let bytes = 0;
async function fetchImage(url) {
  const upstream = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!upstream.ok)
    throw Object.assign(new Error("Artwork is unavailable."), { status: 404 });
  if (!upstream.headers.get("content-type")?.startsWith("image/"))
    throw Object.assign(new Error("Invalid artwork response."), {
      status: 502,
    });
  const chunks = [];
  let length = 0;
  for await (const chunk of upstream.body) {
    length += chunk.length;
    if (length > 8 * 1024 * 1024)
      throw Object.assign(new Error("Image is too large."), { status: 502 });
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);
  while (cache.size && bytes + body.length > 32 * 1024 * 1024) {
    const key = cache.keys().next().value;
    bytes -= cache.get(key).length;
    cache.delete(key);
  }
  cache.set(url, body);
  bytes += body.length;
  return body;
}
assetsRouter.get("/:name.png", async (req, res, next) => {
  try {
    const url = imageUrl(req.params.name);
    if (!url) return res.status(400).end();
    let body = cache.get(url);
    if (!body) {
      if (!pending.has(url)) {
        if (pending.size >= 64) return res.status(503).end();
        pending.set(
          url,
          fetchImage(url).finally(() => pending.delete(url)),
        );
      }
      body = await pending.get(url);
    }
    res
      .set({
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      })
      .send(body);
  } catch (e) {
    next(e);
  }
});
