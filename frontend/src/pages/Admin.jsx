import React, { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";
import {
  Button,
  Card,
  Field,
  Select,
  Textarea,
  Image,
  Loading,
  Empty,
  ErrorNotice,
  Dialog,
  Pagination,
  SignInPrompt,
} from "../components/UI";
const resources = {
  characters: "Characters",
  equipment: "Weapons & artifacts",
  materials: "Materials",
  domains: "Domains",
  recommendations: "Build recommendations",
  skills: "Talents",
  guides: "Guides",
  maps: "Maps",
  markers: "Map markers",
  events: "Events",
  "tier-lists": "Tier lists",
  tiers: "Tier rows",
  "tier-entries": "Tier placements",
};
const fields = {
  characters: [
    ["name", "Name"],
    ["slug", "URL slug"],
    ["rarity", "Rarity", "number"],
    ["portrait_url", "Portrait URL", "url"],
    ["artwork_url", "Artwork URL", "url"],
    ["release_version", "Source version"],
    ["release_date", "Release date", "date"],
    ["stats", "Character attributes", "json"],
    ["strengths", "Strengths (one per line)", "lines"],
    ["weaknesses", "Considerations (one per line)", "lines"],
    ["gameplay_notes", "Gameplay notes", "textarea"],
  ],
  equipment: [
    ["name", "Name"],
    [
      "kind",
      "Equipment type",
      "select",
      [
        "weapon",
        "artifact_set",
        "light_cone",
        "relic_set",
        "w_engine",
        "echo",
        "module",
      ],
    ],
    ["rarity", "Rarity", "number"],
    ["portrait_url", "Image URL", "url"],
    ["effect_text", "Equipment effect", "textarea"],
    ["stats", "Equipment attributes", "json"],
  ],
  materials: [
    ["name", "Name"],
    ["category", "Material category"],
    ["rarity", "Rarity", "number"],
    ["portrait_url", "Image URL", "url"],
    ["source_locations", "Source locations (one per line)", "lines"],
    ["detail", "Schedule and details", "json"],
  ],
  domains: [
    ["name", "Name"],
    ["kind", "Type", "select", ["domain", "boss", "stage"]],
    ["location", "Region"],
    ["difficulty", "Recommended level"],
    ["available_days", "Days (one per line)", "lines"],
    ["drops", "Drops", "textarea"],
    ["detail", "Additional details", "json"],
  ],
  recommendations: [
    ["character_id", "Character", "characters"],
    [
      "category",
      "Recommendation category",
      "select",
      [
        "weapon",
        "artifact_set",
        "main_stats",
        "substats",
        "talent_priority",
        "team_note",
      ],
    ],
    ["item_name", "Item / recommendation"],
    ["equipment_id", "Equipment (optional)", "equipment"],
    ["rank", "Display order", "number"],
    ["notes", "When and why to use it", "textarea"],
    ["source_meta", "Source reference", "json"],
  ],
  skills: [
    ["character_id", "Character", "characters"],
    ["name", "Talent name"],
    ["type", "Talent type"],
    ["description", "Description", "textarea"],
    ["icon_url", "Icon URL", "url"],
    ["sort_order", "Display order", "number"],
  ],
  guides: [
    ["title", "Title"],
    ["category", "Category"],
    ["body", "Guide text", "textarea"],
    [
      "status",
      "Publication state",
      "select",
      ["draft", "published", "unpublished", "archived"],
    ],
  ],
  maps: [
    ["name", "Map name"],
    ["image_url", "Map image URL", "url"],
    ["source_url", "Attribution / source URL", "url"],
  ],
  markers: [
    ["map_id", "Map", "maps"],
    ["label", "Location name"],
    ["category", "Marker category"],
    ["x", "Horizontal position (0–100%)", "number"],
    ["y", "Vertical position (0–100%)", "number"],
    ["notes", "Location notes", "textarea"],
  ],
  events: [
    ["name", "Event name"],
    ["description", "Description", "textarea"],
    ["starts_at", "Starts (UTC)", "datetime-local"],
    ["ends_at", "Ends (UTC)", "datetime-local"],
    ["version", "Version"],
    ["image_url", "Image URL", "url"],
  ],
  "tier-lists": [
    ["title", "Title"],
    ["methodology_notes", "Methodology and assumptions", "textarea"],
    ["version", "Game version"],
  ],
  tiers: [
    ["tier_list_id", "Tier list", "tier-lists"],
    ["label", "Tier label"],
    ["sort_order", "Display order", "number"],
  ],
  "tier-entries": [
    ["tier_id", "Tier row", "tiers"],
    ["character_id", "Character", "characters"],
    ["explanation", "Why this placement?", "textarea"],
  ],
};
const noGame = new Set([
  "recommendations",
  "skills",
  "markers",
  "tiers",
  "tier-entries",
]);
const visibility = new Set([
  "characters",
  "equipment",
  "materials",
  "domains",
  "recommendations",
  "maps",
  "events",
]);
export default function Admin() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user)
    return (
      <section className="section">
        <SignInPrompt />
      </section>
    );
  if (user.role !== "admin")
    return (
      <section className="section">
        <Empty
          title="Administrator access required"
          body="This area is available to project administrators."
        />
      </section>
    );
  return <ContentStudio />;
}
function ContentStudio() {
  const games = useApi("/games"),
    [gameId, setGameId] = useState(""),
    [resource, setResource] = useState("characters"),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState(null),
    [error, setError] = useState(""),
    [mode, setMode] = useState("content");
  const activeGame = gameId || games.data?.games[0]?.id;
  const list = useApi(
      activeGame && mode === "content"
        ? `/admin/content/${resource}?page=${page}&q=${encodeURIComponent(query)}${noGame.has(resource) ? "" : `&gameId=${activeGame}`}`
        : null,
      { auth: true },
    ),
    history = useApi(mode === "history" ? "/admin/content/history" : null, {
      auth: true,
    }),
    reports = useApi(mode === "reports" ? "/admin/reports" : null, {
      auth: true,
    });
  return (
    <section className="section">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">GAME ROSTER / CONTENT STUDIO</p>
          <h1>A well-kept archive.</h1>
          <p className="muted">
            Draft, preview, and publish content. Changes in this studio retain
            an audit history.
          </p>
        </div>
        {mode === "content" && (
          <Button onClick={() => setEditing({})}>Create entry +</Button>
        )}
      </div>
      <div className="tabs">
        {["content", "history", "reports"].map((m) => (
          <button
            key={m}
            className={mode === m ? "active" : ""}
            onClick={() => setMode(m)}
          >
            {m}
          </button>
        ))}
      </div>
      <ErrorNotice
        error={error || list.error || history.error || reports.error}
        retry={
          mode === "content"
            ? list.reload
            : mode === "history"
              ? history.reload
              : reports.reload
        }
      />
      {mode === "content" && (
        <>
          <div className="filters">
            <Select
              label="Game"
              value={activeGame || ""}
              onChange={(e) => {
                setGameId(e.target.value);
                setPage(1);
              }}
            >
              {games.data?.games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
            <Select
              label="Content type"
              value={resource}
              onChange={(e) => {
                setResource(e.target.value);
                setPage(1);
                setQuery("");
              }}
            >
              {Object.entries(resources).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
            <Field
              label="Search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {list.loading ? (
            <Loading />
          ) : list.data?.items.length ? (
            <div className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>Entry</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <b>
                          {item.name ||
                            item.title ||
                            item.item_name ||
                            item.label ||
                            item.explanation}
                        </b>
                        <small>
                          {item.stats?.element || item.category || item.kind}
                        </small>
                      </td>
                      <td>
                        {item.archived_at
                          ? "Archived"
                          : item.status ||
                            ((item.is_visible ?? item.is_published)
                              ? "Published"
                              : "Draft")}
                      </td>
                      <td>
                        {item.source_meta?.provider ||
                          item.source_meta?.recommendationType ||
                          "Editorial"}
                      </td>
                      <td>
                        <Button kind="ghost" onClick={() => setEditing(item)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="No entries found"
              body="Create an entry or change your filters."
            />
          )}
          <Pagination
            page={page}
            total={list.data?.total || 0}
            pageSize={50}
            onChange={setPage}
          />
        </>
      )}
      {mode === "history" &&
        (history.loading ? (
          <Loading />
        ) : (
          <div className="tableScroll">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Editor</th>
                  <th>Content</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.data?.revisions.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
                    <td>{r.username || "Deleted user"}</td>
                    <td>{resources[r.resource] || r.resource}</td>
                    <td>{r.action === "post" ? "Created" : "Updated"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      {mode === "reports" &&
        (reports.loading ? (
          <Loading />
        ) : reports.data?.reports.length ? (
          reports.data.reports.map((r) => (
            <Card key={r.id}>
              <h3>{r.entity_type} report</h3>
              <p>{r.reason}</p>
              <Button
                onClick={async () => {
                  try {
                    await api.patch(`/admin/reports/${r.id}/resolve`, {});
                    reports.reload();
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                Mark resolved
              </Button>
            </Card>
          ))
        ) : (
          <Empty
            title="No open reports"
            body="Reported community content will appear here."
          />
        ))}
      {editing && (
        <ContentEditor
          key={`${resource}-${editing.id || "new"}`}
          resource={resource}
          item={editing}
          gameId={activeGame}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
    </section>
  );
}
function ContentEditor({ resource, item, gameId, close, saved }) {
  const initial = {};
  for (const [key, , type] of fields[resource]) {
    const v = item[key];
    initial[key] =
      type === "json"
        ? JSON.stringify(v || {}, null, 2)
        : type === "lines"
          ? (v || []).join("\n")
          : type === "datetime-local"
            ? v
              ? v.slice(0, 16)
              : ""
            : (v ?? "");
  }
  const [form, setForm] = useState(initial),
    [published, setPublished] = useState(
      item.is_visible ?? item.is_published ?? false,
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false);
  const chars = useApi(`/characters?gameId=${gameId}&pageSize=250`),
    equipment = useApi(`/catalog/equipment?gameId=${gameId}&pageSize=500`),
    maps = useApi(
      resource === "markers" ? `/admin/content/maps?gameId=${gameId}` : null,
      { auth: true },
    ),
    lists = useApi(
      resource === "tiers"
        ? `/admin/content/tier-lists?gameId=${gameId}`
        : null,
      { auth: true },
    ),
    tiers = useApi(
      resource === "tier-entries" ? "/admin/content/tiers" : null,
      { auth: true },
    );
  const choices = {
    characters: chars.data?.characters || [],
    equipment: equipment.data?.equipment || [],
    maps: maps.data?.items || [],
    "tier-lists": lists.data?.items || [],
    tiers: tiers.data?.items || [],
  };
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {};
      for (const [key, , type] of fields[resource]) {
        const value = form[key];
        if (type === "json") {
          try {
            body[key] = JSON.parse(value || "{}");
          } catch {
            throw Error(`Check the formatting of ${key}.`);
          }
        } else if (type === "lines")
          body[key] = value
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
        else if (type === "number") {
          if (value !== "" || ["rarity", "x", "y"].includes(key))
            body[key] = value === "" ? null : Number(value);
        } else if (type === "datetime-local")
          body[key] = value ? new Date(`${value}:00Z`).toISOString() : null;
        else if (
          type === "date" ||
          type === "url" ||
          key === "equipment_id" ||
          key === "release_version"
        )
          body[key] = value || null;
        else body[key] = value;
      }
      if (!noGame.has(resource)) body.game_id = gameId;
      if (visibility.has(resource)) body.is_visible = published;
      if (resource === "tier-lists") body.is_published = published;
      if (item.id)
        await api.patch(`/admin/content/${resource}/${item.id}`, body);
      else await api.post(`/admin/content/${resource}`, body);
      saved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={`${item.id ? "Edit" : "Create"} ${resources[resource]}`}
      close={close}
    >
      <div className="tabs">
        <button
          className={!preview ? "active" : ""}
          onClick={() => setPreview(false)}
        >
          Edit
        </button>
        <button
          className={preview ? "active" : ""}
          onClick={() => setPreview(true)}
        >
          Preview
        </button>
      </div>
      {preview ? (
        <Card>
          <Image
            src={form.portrait_url || form.image_url}
            alt={form.name || form.title}
          />
          <h2>{form.name || form.title || form.item_name || form.label}</h2>
          <p className="preserveLines">
            {form.body ||
              form.gameplay_notes ||
              form.effect_text ||
              form.description ||
              form.notes ||
              form.methodology_notes ||
              form.explanation}
          </p>
          <p className="muted">
            {published ? "Will be public" : "Draft / hidden"}
          </p>
          <Button kind="ghost" onClick={() => setPreview(false)}>
            Continue editing
          </Button>
        </Card>
      ) : (
        <form onSubmit={save}>
          <ErrorNotice error={error} />
          {fields[resource].map(([key, label, type, options]) => {
            const value = form[key],
              onChange = (e) => setForm({ ...form, [key]: e.target.value });
            if (type === "select")
              return (
                <Select
                  label={label}
                  key={key}
                  value={value}
                  onChange={onChange}
                >
                  <option value="">Choose…</option>
                  {options.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Select>
              );
            if (choices[type])
              return (
                <Select
                  key={key}
                  label={label}
                  value={value}
                  onChange={onChange}
                >
                  <option value="">Choose…</option>
                  {choices[type].map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name || c.title || c.label}
                    </option>
                  ))}
                </Select>
              );
            if (["textarea", "json", "lines"].includes(type))
              return (
                <Textarea
                  label={label + (type === "json" ? " (JSON)" : "")}
                  key={key}
                  rows={type === "json" ? 5 : 4}
                  value={value}
                  onChange={onChange}
                />
              );
            return (
              <Field
                label={label}
                key={key}
                type={type || "text"}
                step={["x", "y"].includes(key) ? "any" : undefined}
                value={value}
                onChange={onChange}
              />
            );
          })}
          {(visibility.has(resource) || resource === "tier-lists") && (
            <label className="check">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              Published and visible to everyone
            </label>
          )}
          <Button disabled={busy}>
            {busy ? "Saving…" : item.id ? "Save changes" : "Create entry"}
          </Button>
        </form>
      )}
    </Dialog>
  );
}
