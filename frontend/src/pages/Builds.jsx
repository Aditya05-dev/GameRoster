import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";
import {
  Card,
  Button,
  Field,
  Select,
  Textarea,
  Loading,
  ErrorNotice,
  Empty,
  Dialog,
  SignInPrompt,
} from "../components/UI";
import BuildCard from "../components/BuildCard";
import BuildComparison from "../components/BuildComparison";
export default function Builds() {
  const { user } = useAuth(),
    [mine, setMine] = useState(true),
    [editing, setEditing] = useState(null),
    [compare, setCompare] = useState([]),
    [error, setError] = useState("");
  const list = useApi(
      mine && !user ? null : `/builds${mine ? "?mine=true" : ""}`,
      { auth: true },
    ),
    game = useApi("/games/genshin-impact"),
    characters = useApi(
      game.data ? `/characters?gameId=${game.data.game.id}&pageSize=250` : null,
    );
  return (
    <section className="section">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">SAVE WHAT WORKS</p>
          <h1>Build library</h1>
          <p className="muted">
            Keep your best setups, compare their stats, and share a build card.
          </p>
        </div>
        {user && (
          <Button
            onClick={() =>
              setEditing({
                title: "",
                characterId: "",
                buildType: "dps",
                visibility: "private",
                notes: "",
                mainStats: {},
              })
            }
          >
            Create build +
          </Button>
        )}
      </div>
      <div className="tabs">
        <button className={mine ? "active" : ""} onClick={() => setMine(true)}>
          My builds
        </button>
        <button
          className={!mine ? "active" : ""}
          onClick={() => setMine(false)}
        >
          Community builds
        </button>
      </div>
      <ErrorNotice error={error || list.error} retry={list.reload} />
      {list.loading ? (
        <Loading />
      ) : mine && !user ? (
        <SignInPrompt />
      ) : !list.data?.builds.length ? (
        <Empty
          title="A home for your favorite setups"
          body="Save a real showcase build from UID Lookup, or create a build with your own notes."
        />
      ) : (
        list.data.builds.map((b) => (
          <Card key={b.id}>
            <div className="sectionHeading">
              <div>
                <h2>{b.title}</h2>
                <p className="muted">
                  {b.character_name} · {b.build_type.replace("_", " ")} · By{" "}
                  {b.author_username} · {b.visibility}
                </p>
              </div>
            </div>
            <p className="preserveLines">{b.notes}</p>
            {Object.entries(b.main_stats || {}).length > 0 && (
              <p>
                {Object.entries(b.main_stats)
                  .map(([slot, value]) => `${slot}: ${value}`)
                  .join(" · ")}
              </p>
            )}
            {b.snapshot?.stats ? (
              <details>
                <summary>View build card</summary>
                <BuildCard
                  build={b.snapshot}
                  onCompare={(x) =>
                    setCompare((a) => (a.length >= 2 ? [x] : [...a, x]))
                  }
                />
              </details>
            ) : (
              <p className="sourceNote">
                Build notes only. Import a showcase to include actual combat
                stats.
              </p>
            )}
            {mine && (
              <div className="buttonRow">
                <Button
                  kind="ghost"
                  onClick={() =>
                    setEditing({
                      ...b,
                      characterId: b.character_id,
                      buildType: b.build_type,
                      mainStats: b.main_stats || {},
                    })
                  }
                >
                  Edit build
                </Button>
                <Button
                  kind="ghost"
                  onClick={async () => {
                    try {
                      await api.patch(`/builds/${b.id}`, {
                        visibility:
                          b.visibility === "private" ? "public" : "private",
                      });
                      list.reload();
                    } catch (e) {
                      setError(e.message);
                    }
                  }}
                >
                  {b.visibility === "private" ? "Make public" : "Make private"}
                </Button>
                <button
                  className="textButton"
                  onClick={async () => {
                    try {
                      await api.del(`/builds/${b.id}`);
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
        ))
      )}
      {compare.length === 1 && (
        <p className="notice">
          One build selected. Open another card and press Compare.{" "}
          <button className="textButton" onClick={() => setCompare([])}>
            Cancel
          </button>
        </p>
      )}
      {compare.length === 2 && (
        <Dialog title="Build comparison" close={() => setCompare([])}>
          <BuildComparison left={compare[0]} right={compare[1]} />
        </Dialog>
      )}
      {editing && (
        <BuildEditor
          build={editing}
          game={game.data?.game}
          characters={characters.data?.characters || []}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
      <p>
        <Link to="/lookup">Import a public showcase →</Link>
      </p>
    </section>
  );
}
function BuildEditor({ build, game, characters, close, saved }) {
  const [form, setForm] = useState(build),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        title: form.title,
        buildType: form.buildType,
        visibility: form.visibility,
        notes: form.notes || "",
        mainStats: form.mainStats,
      };
      if (build.id) await api.patch(`/builds/${build.id}`, body);
      else
        await api.post("/builds", {
          ...body,
          characterId: form.characterId,
          gameId: game.id,
        });
      saved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title={build.id ? "Edit build" : "Create a build"} close={close}>
      <form onSubmit={submit}>
        <Field
          label="Build title"
          maxLength={120}
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Select
          label="Character"
          disabled={!!build.id}
          required
          value={form.characterId}
          onChange={(e) => setForm({ ...form, characterId: e.target.value })}
        >
          <option value="">Select a character</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          label="Build type"
          value={form.buildType}
          onChange={(e) => setForm({ ...form, buildType: e.target.value })}
        >
          {["dps", "sub_dps", "support", "f2p", "beginner", "endgame"].map(
            (x) => (
              <option key={x} value={x}>
                {x.replace("_", " ")}
              </option>
            ),
          )}
        </Select>
        <div className="filters">
          {["Sands", "Goblet", "Circlet"].map((slot) => (
            <Field
              key={slot}
              label={`${slot} main stat`}
              maxLength={80}
              value={form.mainStats[slot] || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  mainStats: { ...form.mainStats, [slot]: e.target.value },
                })
              }
            />
          ))}
        </div>
        <Textarea
          label="Equipment, priorities & notes"
          rows={5}
          maxLength={2000}
          value={form.notes || ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <Select
          label="Visibility"
          value={form.visibility}
          onChange={(e) => setForm({ ...form, visibility: e.target.value })}
        >
          <option value="private">Only me</option>
          <option value="public">Everyone</option>
        </Select>
        <ErrorNotice error={error} />
        <Button disabled={busy || !game}>
          {busy ? "Saving…" : "Save build"}
        </Button>
      </form>
    </Dialog>
  );
}
