import React, { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";
import {
  Card,
  Image,
  Button,
  Select,
  Field,
  Textarea,
  Dialog,
  Loading,
  ErrorNotice,
  Empty,
  SignInPrompt,
} from "../components/UI";
const blankSlot = () => ({
  characterId: "",
  role: "Flexible",
  weaponId: null,
  artifactId: null,
});
export default function Teams() {
  const context = useOutletContext(),
    { user } = useAuth(),
    gameData = useApi(context ? null : "/games/genshin-impact"),
    game = context?.game || gameData.data?.game;
  const [mine, setMine] = useState(true),
    [editing, setEditing] = useState(null),
    [error, setError] = useState("");
  const catalog = useApi(
      game ? `/characters?gameId=${game.id}&pageSize=250` : null,
    ),
    gear = useApi(
      game ? `/catalog/equipment?gameId=${game.id}&pageSize=500` : null,
    ),
    roster = useApi(user ? "/companion/roster" : null, { auth: true });
  const list = useApi(
    game && (!mine || user)
      ? `/teams?gameId=${game.id}${mine ? "&mine=true" : ""}`
      : null,
    { auth: true },
  );
  const characters = catalog.data?.characters || [];
  return (
    <div className={context ? "" : "section"}>
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">BETTER TOGETHER</p>
          <h1>Team workshop</h1>
          <p className="muted">
            Choose your characters, assign roles, and write a rotation that
            works for you.
          </p>
        </div>
        {user && game && (
          <Button
            onClick={() =>
              setEditing({
                name: "",
                description: "",
                notes: "",
                visibility: "private",
                slots: Array.from(
                  {
                    length: Math.min(
                      Number(game.entity_schema?.teamSize) || 4,
                      12,
                    ),
                  },
                  blankSlot,
                ),
              })
            }
          >
            Create team +
          </Button>
        )}
      </div>
      <div className="tabs">
        <button className={mine ? "active" : ""} onClick={() => setMine(true)}>
          My teams
        </button>
        <button
          className={!mine ? "active" : ""}
          onClick={() => setMine(false)}
        >
          Community teams
        </button>
      </div>
      <ErrorNotice
        error={
          error || list.error || catalog.error || gameData.error || gear.error
        }
        retry={list.reload}
      />
      {list.loading ? (
        <Loading />
      ) : mine && !user ? (
        <SignInPrompt />
      ) : !list.data?.teams.length ? (
        <Empty
          title="The perfect party starts with one character"
          body="Create a team and fill its slots as you decide who to bring."
        />
      ) : (
        <div className="teamGrid">
          {list.data.teams.map((t) => (
            <Card key={t.id}>
              <div className="sectionHeading">
                <h2>{t.name}</h2>
                <small>{t.visibility}</small>
              </div>
              <p>{t.description}</p>
              <div className="teamPortraits">
                {t.character_ids.map((id) => {
                  const c = characters.find((x) => x.id === id),
                    s = t.slots?.find((x) => x.characterId === id);
                  return (
                    <Link to={`/characters/${id}`} key={id}>
                      <Image
                        src={c?.portrait_url}
                        alt={c?.name || "Character"}
                      />
                      <b>{c?.name || "Unlisted character"}</b>
                      <small>{s?.role}</small>
                    </Link>
                  );
                })}
              </div>
              <details>
                <summary>Rotation & notes</summary>
                <p className="preserveLines">
                  {t.notes || "No rotation notes yet."}
                </p>
                {t.slots?.map((s) => (
                  <p key={s.characterId}>
                    {characters.find((c) => c.id === s.characterId)?.name}:{" "}
                    {[s.weaponId, s.artifactId]
                      .filter(Boolean)
                      .map(
                        (id) =>
                          gear.data?.equipment.find((e) => e.id === id)?.name ||
                          "Unlisted equipment",
                      )
                      .join(" · ") || "Equipment not assigned"}
                  </p>
                ))}
              </details>
              <small className="muted">By {t.author_username}</small>
              {mine && (
                <div className="buttonRow">
                  <Button
                    kind="ghost"
                    onClick={() =>
                      setEditing({
                        ...t,
                        slots: t.slots?.length
                          ? t.slots
                          : t.character_ids.map((id) => ({
                              ...blankSlot(),
                              characterId: id,
                            })),
                      })
                    }
                  >
                    Edit team
                  </Button>
                  <button
                    className="textButton"
                    onClick={async () => {
                      try {
                        await api.del(`/teams/${t.id}`);
                        list.reload();
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {editing && (
        <TeamEditor
          team={editing}
          game={game}
          characters={characters}
          equipment={gear.data?.equipment || []}
          roster={roster.data?.roster || []}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
    </div>
  );
}
function TeamEditor({
  team,
  game,
  characters,
  equipment,
  roster,
  close,
  saved,
}) {
  const [form, setForm] = useState(team),
    [ownedOnly, setOwnedOnly] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const max = Math.min(Number(game.entity_schema?.teamSize) || 4, 12);
  const slots = Array.from(
    { length: max },
    (_, i) => form.slots[i] || blankSlot(),
  );
  const update = (index, patch) =>
    setForm({
      ...form,
      slots: slots.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    });
  const selected = slots
    .map((s) => characters.find((c) => c.id === s.characterId))
    .filter(Boolean);
  const elements = [...new Set(selected.map((c) => c.stats?.element))];
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = {
        gameId: game.id,
        name: form.name,
        description: form.description || "",
        notes: form.notes || "",
        visibility: form.visibility,
        slots: slots
          .filter((s) => s.characterId)
          .map(({ characterId, role, weaponId, artifactId }) => ({
            characterId,
            role,
            weaponId: weaponId || null,
            artifactId: artifactId || null,
          })),
      };
      team.id
        ? await api.patch(`/teams/${team.id}`, payload)
        : await api.post("/teams", payload);
      saved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title={team.id ? "Edit team" : "Create your party"} close={close}>
      <form onSubmit={submit}>
        <Field
          label="Team name"
          maxLength={120}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Field
          label="Short description"
          maxLength={1000}
          value={form.description || ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={ownedOnly}
            onChange={(e) => setOwnedOnly(e.target.checked)}
          />
          Only show owned characters
        </label>
        <div className="slotGrid">
          {slots.map((s, i) => {
            const c = characters.find((c) => c.id === s.characterId);
            return (
              <Card key={i}>
                <p className="eyebrow">SLOT {i + 1}</p>
                <Select
                  label="Character"
                  value={s.characterId}
                  onChange={(e) =>
                    update(i, {
                      characterId: e.target.value,
                      weaponId: null,
                      artifactId: null,
                    })
                  }
                >
                  <option value="">Choose a character</option>
                  {characters
                    .filter(
                      (c) =>
                        (!ownedOnly ||
                          roster.some(
                            (r) =>
                              r.character_id === c.id && r.status === "owned",
                          ) ||
                          s.characterId === c.id) &&
                        !slots.some(
                          (other, j) => j !== i && other.characterId === c.id,
                        ),
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </Select>
                <Select
                  label="Role"
                  value={s.role}
                  onChange={(e) => update(i, { role: e.target.value })}
                >
                  {[
                    "On-field DPS",
                    "Off-field DPS",
                    "Support",
                    "Healer",
                    "Shielder",
                    "Flexible",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Select>
                <Select
                  label="Weapon"
                  disabled={!c}
                  value={s.weaponId || ""}
                  onChange={(e) =>
                    update(i, { weaponId: e.target.value || null })
                  }
                >
                  <option value="">Not assigned</option>
                  {equipment
                    .filter(
                      (e) =>
                        e.kind === "weapon" &&
                        e.stats?.weaponType === c?.stats.weaponType,
                    )
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </Select>
                <Select
                  label="Artifact set"
                  disabled={!c}
                  value={s.artifactId || ""}
                  onChange={(e) =>
                    update(i, { artifactId: e.target.value || null })
                  }
                >
                  <option value="">Not assigned</option>
                  {equipment
                    .filter((e) => e.kind === "artifact_set")
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </Select>
              </Card>
            );
          })}
        </div>
        <p className="notice">
          {selected.length}/{max} slots filled · Elements:{" "}
          {elements.join(", ") || "None selected"}
          {selected.some((c) => c.name === "Skirk") &&
          selected.some((c) => !["Hydro", "Cryo"].includes(c.stats?.element))
            ? " · Skirk’s full team passives require only Hydro/Cryo teammates."
            : ""}
        </p>
        <Textarea
          label="Rotation and notes"
          rows={4}
          maxLength={4000}
          placeholder="Describe the order of skills, bursts, and swaps…"
          value={form.notes || ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <Select
          label="Who can see this team?"
          value={form.visibility}
          onChange={(e) => setForm({ ...form, visibility: e.target.value })}
        >
          <option value="private">Only me</option>
          <option value="public">Everyone</option>
        </Select>
        <ErrorNotice error={error} />
        <Button disabled={busy}>{busy ? "Saving…" : "Save team"}</Button>
      </form>
    </Dialog>
  );
}
