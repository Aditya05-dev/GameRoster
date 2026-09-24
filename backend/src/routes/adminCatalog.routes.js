import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
export const adminCatalogRouter = Router();
adminCatalogRouter.use(requireAuth, requireAdmin);
const text = z.string().max(15000),
  name = z.string().trim().min(1).max(200),
  id = z.string().uuid(),
  url = z
    .string()
    .url()
    .refine((x) => /^https?:\/\//.test(x))
    .or(z.literal(""))
    .nullable();
const base = { game_id: id, name, is_visible: z.boolean().default(false) };
const schemas = {
  "tier-lists": z.object({
    game_id: id,
    title: name,
    methodology_notes: text,
    version: z.string().max(30),
    is_published: z.boolean().default(false),
  }),
  tiers: z.object({
    tier_list_id: id,
    label: name,
    sort_order: z.number().int().min(0).max(100),
  }),
  "tier-entries": z.object({
    tier_id: id,
    character_id: id,
    explanation: text,
  }),
  characters: z.object({
    ...base,
    slug: z.string().regex(/^[a-z0-9-]+$/),
    rarity: z.number().int().min(1).max(6).nullable().optional(),
    stats: z.record(z.any()).default({}),
    strengths: z.array(text).default([]),
    weaknesses: z.array(text).default([]),
    gameplay_notes: text.nullable().optional(),
    release_version: z
      .string()
      .regex(/^\d+\.\d+$/)
      .nullable()
      .optional(),
    release_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    portrait_url: url.optional(),
    artwork_url: url.optional(),
  }),
  equipment: z.object({
    ...base,
    kind: z.enum([
      "weapon",
      "artifact_set",
      "light_cone",
      "relic_set",
      "w_engine",
      "echo",
      "module",
    ]),
    rarity: z.number().int().min(1).max(6).nullable().optional(),
    stats: z.record(z.any()).default({}),
    effect_text: text.nullable().optional(),
    portrait_url: url.optional(),
  }),
  materials: z.object({
    ...base,
    category: z.string().max(120).nullable().optional(),
    rarity: z.number().int().min(1).max(6).nullable().optional(),
    source_locations: z.array(text).default([]),
    portrait_url: url.optional(),
    detail: z.record(z.any()).default({}),
  }),
  domains: z.object({
    ...base,
    kind: z.enum(["domain", "boss", "stage"]),
    location: text.nullable().optional(),
    difficulty: text.nullable().optional(),
    available_days: z
      .array(
        z.enum([
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ]),
      )
      .default([]),
    drops: text.nullable().optional(),
    detail: z.record(z.any()).default({}),
  }),
  recommendations: z.object({
    character_id: id,
    category: z.enum([
      "weapon",
      "artifact_set",
      "main_stats",
      "substats",
      "talent_priority",
      "team_note",
    ]),
    item_name: name,
    rank: z.number().int().min(0).max(100).default(0),
    notes: text.nullable().optional(),
    equipment_id: id.nullable().optional(),
    source_meta: z.record(z.any()).default({}),
    is_visible: z.boolean().default(false),
  }),
  guides: z.object({
    game_id: id,
    category: name,
    title: name,
    body: text,
    status: z
      .enum(["draft", "published", "unpublished", "archived"])
      .default("draft"),
    is_featured: z.boolean().default(false),
  }),
  maps: z.object({
    ...base,
    image_url: url.optional(),
    source_url: url.optional(),
  }),
  markers: z.object({
    map_id: id,
    category: name,
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    label: name,
    notes: text.nullable().optional(),
  }),
  events: z.object({
    ...base,
    description: text.nullable().optional(),
    starts_at: z.string().datetime().nullable().optional(),
    ends_at: z.string().datetime().nullable().optional(),
    version: text.nullable().optional(),
    image_url: url.optional(),
  }),
  skills: z.object({
    character_id: id,
    name,
    type: name,
    description: text,
    icon_url: url.optional(),
    sort_order: z.number().int().min(0).default(0),
  }),
};
const tables = {
  "tier-lists": "tier_lists",
  tiers: "tier_list_tiers",
  "tier-entries": "tier_list_entries",
  characters: "characters",
  equipment: "equipment",
  materials: "materials",
  domains: "domains_stages",
  recommendations: "character_recommendations",
  guides: "guides",
  maps: "maps",
  markers: "map_markers",
  events: "events",
  skills: "character_skills",
};
const jsonFields = new Set(["stats", "detail", "source_meta"]);
function config(resource) {
  if (!tables[resource])
    throw Object.assign(new Error("Unknown content type."), { status: 404 });
  return { table: tables[resource], schema: schemas[resource] };
}
adminCatalogRouter.get("/history", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT r.id,r.resource,r.entity_id,r.action,r.created_at,u.username FROM content_revisions r LEFT JOIN users u ON u.id=r.actor_id ORDER BY r.id DESC LIMIT 100",
    );
    res.json({ revisions: rows });
  } catch (e) {
    next(e);
  }
});
adminCatalogRouter.get("/:resource", async (req, res, next) => {
  try {
    const { table } = config(req.params.resource);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const values = [],
      where = [];
    if (
      req.query.gameId &&
      ![
        "markers",
        "skills",
        "recommendations",
        "tiers",
        "tier-entries",
      ].includes(req.params.resource)
    ) {
      values.push(id.parse(req.query.gameId));
      where.push(`game_id=$${values.length}`);
    }
    if (
      req.query.characterId &&
      ["skills", "recommendations"].includes(req.params.resource)
    ) {
      values.push(id.parse(req.query.characterId));
      where.push(`character_id=$${values.length}`);
    }
    const col = ["guides", "tier-lists"].includes(req.params.resource)
      ? "title"
      : req.params.resource === "tiers"
        ? "label"
        : req.params.resource === "tier-entries"
          ? "explanation"
          : req.params.resource === "recommendations"
            ? "item_name"
            : req.params.resource === "markers"
              ? "label"
              : "name";
    if (req.query.q) {
      values.push(`%${String(req.query.q).slice(0, 100)}%`);
      where.push(`${col} ILIKE $${values.length}`);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const {
      rows: [{ count }],
    } = await pool.query(`SELECT count(*) FROM ${table} ${clause}`, values);
    const { rows } = await pool.query(
      `SELECT * FROM ${table} ${clause} ORDER BY ${col} LIMIT 50 OFFSET $${values.length + 1}`,
      [...values, (page - 1) * 50],
    );
    res.json({ items: rows, total: Number(count), page });
  } catch (e) {
    next(e);
  }
});
for (const method of ["post", "patch"])
  adminCatalogRouter[method](
    method === "post" ? "/:resource" : "/:resource/:id",
    async (req, res, next) => {
      let client;
      try {
        const { table, schema } = config(req.params.resource);
        const data = (method === "post" ? schema : schema.partial())
          .strict()
          .parse(req.body);
        if (!Object.keys(data).length)
          return res.status(422).json({ error: "Provide fields to update." });
        const entityId = method === "patch" ? id.parse(req.params.id) : null;
        if (method === "post" && table === "guides")
          data.author_id = req.user.id;
        if (method === "post" && table === "map_markers")
          data.created_by = req.user.id;
        client = await pool.connect();
        await client.query("BEGIN");
        let before = null;
        if (entityId) {
          before = (
            await client.query(
              `SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`,
              [entityId],
            )
          ).rows[0];
          if (!before)
            throw Object.assign(new Error("Content not found."), {
              status: 404,
            });
        }
        const merged = { ...before, ...data };
        const invalid = (message) => {
          throw Object.assign(new Error(message), { status: 422 });
        };
        if (before?.game_id && data.game_id && before.game_id !== data.game_id)
          invalid("Existing content cannot be moved between games.");
        if (table === "character_recommendations" && merged.equipment_id) {
          const linked = (
            await client.query(
              "SELECT c.game_id AS character_game,e.game_id AS equipment_game,e.kind FROM characters c CROSS JOIN equipment e WHERE c.id=$1 AND e.id=$2",
              [merged.character_id, merged.equipment_id],
            )
          ).rows[0];
          if (
            !linked ||
            linked.character_game !== linked.equipment_game ||
            linked.kind !== merged.category
          )
            invalid(
              "Recommendation equipment must match the character’s game and category.",
            );
        }
        if (table === "tier_list_entries") {
          const linked = (
            await client.query(
              "SELECT c.game_id AS character_game,l.game_id AS tier_game FROM characters c CROSS JOIN tier_list_tiers t JOIN tier_lists l ON l.id=t.tier_list_id WHERE c.id=$1 AND t.id=$2",
              [merged.character_id, merged.tier_id],
            )
          ).rows[0];
          if (!linked || linked.character_game !== linked.tier_game)
            invalid("Tier placements must use characters from the same game.");
        }
        const keys = Object.keys(data),
          values = keys.map((k) =>
            jsonFields.has(k) ? JSON.stringify(data[k]) : data[k],
          );
        let result;
        if (entityId) {
          values.push(entityId);
          result = await client.query(
            `UPDATE ${table} SET ${keys.map((k, i) => `${k}=$${i + 1}`).join(",")} WHERE id=$${values.length} RETURNING *`,
            values,
          );
        } else
          result = await client.query(
            `INSERT INTO ${table}(${keys.join(",")}) VALUES(${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`,
            values,
          );
        const after = result.rows[0];
        await client.query(
          "INSERT INTO content_revisions(actor_id,resource,entity_id,action,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6)",
          [req.user.id, req.params.resource, after.id, method, before, after],
        );
        if (table === "characters" && after.is_visible && !before?.is_visible)
          await client.query(
            `INSERT INTO notifications(user_id,type,payload) SELECT u.id,'new_character',$1 FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.is_active AND p.notify_new_characters`,
            [{ characterName: after.name, characterId: after.id }],
          );
        await client.query("COMMIT");
        res.status(entityId ? 200 : 201).json({ item: after });
      } catch (e) {
        if (client) await client.query("ROLLBACK");
        next(e);
      } finally {
        client?.release();
      }
    },
  );
