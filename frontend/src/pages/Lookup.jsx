import React, { useState } from "react";
import { useApi } from "../lib/hooks";
import { api } from "../lib/api";
import {
  Button,
  Card,
  Field,
  Empty,
  ErrorNotice,
  Dialog,
} from "../components/UI";
import BuildCard from "../components/BuildCard";
import BuildComparison from "../components/BuildComparison";
export default function Lookup() {
  const [uid, setUid] = useState(""),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(null),
    [compare, setCompare] = useState([]);
  const game = useApi("/games/genshin-impact");
  async function lookup(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setData(null);
    setSelected(null);
    setCompare([]);
    try {
      const r = await api.post(
        "/profile-lookup",
        { gameSlug: "genshin-impact", uid: uid.trim() },
        { auth: false },
      );
      setData(r);
      setSelected(r.characters[0]?.key || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const build = data?.characters.find((c) => c.key === selected);
  return (
    <section className="section">
      <div className="pageIntro">
        <p className="eyebrow">A CLOSER LOOK AT YOUR JOURNEY</p>
        <h1>
          Your showcase,
          <br />
          <em>beautifully clear.</em>
        </h1>
        <p>
          View the characters and builds you’ve made public in Genshin Impact.
        </p>
      </div>
      <Card className="lookupForm">
        <form onSubmit={lookup}>
          <Field
            label="Genshin UID"
            inputMode="numeric"
            pattern="[0-9]{9,10}"
            placeholder="Enter a 9 or 10 digit UID"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            required
          />
          <Button disabled={busy}>
            {busy ? "Finding showcase…" : "View showcase →"}
          </Button>
        </form>
        <small>
          Enable “Show Character Details” in your in-game profile. Only your
          public showcase is available.
        </small>
      </Card>
      <ErrorNotice error={error} />
      {data && (
        <>
          <div className="sectionHeading">
            <div>
              <h2>{data.player.nickname}</h2>
              <p className="muted">
                AR {data.player.level ?? "—"} · World level{" "}
                {data.player.worldLevel ?? "—"} ·{" "}
                {data.player.achievements ?? "—"} achievements
              </p>
              <p>{data.player.signature}</p>
            </div>
            <small className="sourceNote">
              Via {data.provider}
              <br />
              {data.cached ? "Cached snapshot" : "Fetched"}{" "}
              {new Date(data.fetchedAt).toLocaleTimeString()}
              <br />
              Provider cache: {data.ttl}s
            </small>
          </div>
          {data.showcaseStatus !== "available" ? (
            <Empty
              title="The showcase is empty or private"
              body="Add characters to your in-game showcase and enable character details, then wait for the provider cache to refresh."
            />
          ) : (
            <>
              <div className="showcaseTabs">
                {data.characters.map((c) => (
                  <button
                    key={c.key}
                    className={selected === c.key ? "active" : ""}
                    onClick={() => setSelected(c.key)}
                  >
                    {c.name}
                    <small>
                      Lv. {c.level ?? "—"} · {c.element}
                    </small>
                  </button>
                ))}
              </div>
              {build && (
                <BuildCard
                  key={build.key}
                  build={build}
                  uid={data.uid}
                  gameId={game.data?.game.id}
                  canSave={!!game.data}
                  onCompare={(b) =>
                    setCompare((x) => (x.length >= 2 ? [b] : [...x, b]))
                  }
                />
              )}{" "}
              {compare.length === 1 && (
                <div className="notice">
                  {compare[0].name} selected. Choose another character/build and
                  press Compare.{" "}
                  <button className="textButton" onClick={() => setCompare([])}>
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
      {compare.length === 2 && (
        <Dialog title="Compare displayed stats" close={() => setCompare([])}>
          <BuildComparison left={compare[0]} right={compare[1]} />
        </Dialog>
      )}
    </section>
  );
}
