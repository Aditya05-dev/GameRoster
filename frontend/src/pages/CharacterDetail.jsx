import React from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useApi, elementColors } from "../lib/hooks";
import { safeLink } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import {
  Card,
  Badge,
  Image,
  Loading,
  ErrorNotice,
  Empty,
  BackLink,
} from "../components/UI";
import RosterEditor from "../components/RosterEditor";
import AscensionCalculator from "../components/AscensionCalculator";
const skillLabels = {
  combat1: "Normal attack",
  combat2: "Elemental skill",
  combat3: "Elemental burst",
  passive1: "Ascension passive",
  passive2: "Ascension passive",
  passive3: "Utility passive",
};
function Recommendation({ row }) {
  return (
    <div className={`itemRow ${row.equipment_id ? "" : "textOnly"}`}>
      {row.equipment_id && <Image src={row.portrait_url} alt={row.item_name} />}
      <span>
        {row.equipment_id ? (
          <Link to={`/catalog/equipment/${row.equipment_id}`}>
            <b>{row.item_name}</b>
          </Link>
        ) : (
          <b>{row.item_name}</b>
        )}
        <small>{row.notes}</small>
        {safeLink(row.source_meta?.url) && (
          <a
            className="sourceNote"
            target="_blank"
            rel="noreferrer"
            href={row.source_meta.url}
          >
            Guide reference ↗
          </a>
        )}
      </span>
    </div>
  );
}
export default function CharacterDetail() {
  const { id } = useParams(),
    { user } = useAuth(),
    [params, setParams] = useSearchParams(),
    { data, loading, error, reload } = useApi(`/characters/${id}`);
  const roster = useApi(user ? "/companion/roster" : null, { auth: true });
  if (loading) return <Loading />;
  if (error)
    return (
      <section className="section">
        <ErrorNotice error={error} retry={reload} />
      </section>
    );
  const c = data.character,
    tab = params.get("tab") || "overview",
    recs = c.recommendations || [],
    entry = roster.data?.roster.find((r) => r.character_id === c.id);
  const grouped = (category) => recs.filter((r) => r.category === category);
  const weapons = grouped("weapon");
  return (
    <section
      className="section characterDetail"
      style={{ "--element": elementColors[c.stats?.element] || "#a7badf" }}
    >
      <BackLink to="/games/genshin-impact/characters">
        Character archive
      </BackLink>
      <div className="characterHero">
        <div className="characterHeroCopy">
          <p className="eyebrow">{c.detail?.title || "CHARACTER ARCHIVE"}</p>
          <h1>{c.name}</h1>
          <p className="stars">{"★".repeat(c.rarity || 0)}</p>
          <div className="badgeRow">
            {[c.stats?.element, c.stats?.weaponType, c.stats?.role]
              .filter(Boolean)
              .map((x) => (
                <Badge key={x}>{x}</Badge>
              ))}
          </div>
          <p>{c.stats?.description}</p>
          <small>
            Source version {c.release_version || "unlisted"} ·{" "}
            {c.stats?.region || c.detail?.affiliation}
          </small>
        </div>
        <Image
          src={c.artwork_url || c.portrait_url}
          alt={c.name}
          className="characterSplash"
        />
      </div>
      <nav className="tabs detailTabs" aria-label="Character details">
        {["overview", "build", "talents", "ascension", "lore", "gallery"].map(
          (t) => (
            <button
              key={t}
              className={t === tab ? "active" : ""}
              onClick={() => setParams({ tab: t })}
            >
              {t}
            </button>
          ),
        )}
      </nav>
      {tab === "overview" && (
        <div className="twoCol">
          <div>
            <Card>
              <h2>At a glance</h2>
              <p>{c.gameplay_notes || c.stats?.description}</p>
              {c.detail?.baseStats && (
                <>
                  <h3>Base stats at level 90</h3>
                  <div className="statStrip">
                    {[
                      ["HP", c.detail.baseStats.hp],
                      ["ATK", c.detail.baseStats.attack],
                      ["DEF", c.detail.baseStats.defense],
                    ].map(([key, value]) => (
                      <div key={key}>
                        <span>{key}</span>
                        <b>{Math.round(value).toLocaleString()}</b>
                      </div>
                    ))}
                  </div>
                  <small className="muted">
                    Character base stats before weapon and artifact bonuses.
                  </small>
                </>
              )}
            </Card>
            <Card>
              <h3>Strengths & considerations</h3>
              {c.strengths?.length || c.weaknesses?.length ? (
                <>
                  <ul>
                    {c.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  <ul className="muted">
                    {c.weaknesses.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="muted">
                  Editorial notes have not been published for this character.
                </p>
              )}
            </Card>
          </div>
          <Card>
            <h2>Your collection</h2>
            {roster.loading && user ? (
              <Loading />
            ) : (
              <RosterEditor
                key={`${c.id}-${entry?.updated_at || ""}`}
                character={c}
                entry={entry}
                onSaved={roster.reload}
              />
            )}
            <div className="quickLinks">
              <Link to={`/characters/${c.id}?tab=ascension`}>
                Plan an upgrade →
              </Link>
              <Link to="/teams">Build a team →</Link>
              <Link to="/lookup">View a live build →</Link>
            </div>
          </Card>
        </div>
      )}
      {tab === "build" && (
        <>
          <p className="muted">
            Context matters: recommendations depend on team, stats, and
            playstyle. Only editorial selections appear here.
          </p>
          {[5, 4].map((rarity) => (
            <Card key={rarity}>
              <h2>{rarity}★ weapon recommendations</h2>
              {weapons.filter((r) => r.rarity === rarity).length ? (
                weapons
                  .filter((r) => r.rarity === rarity)
                  .map((r) => <Recommendation row={r} key={r.id} />)
              ) : (
                <p className="muted">
                  No {rarity}★ recommendations published yet.
                </p>
              )}
            </Card>
          ))}
          {weapons.filter((r) => ![4, 5].includes(r.rarity)).length > 0 && (
            <Card>
              <h2>Other selected weapons</h2>
              {weapons
                .filter((r) => ![4, 5].includes(r.rarity))
                .map((r) => (
                  <Recommendation row={r} key={r.id} />
                ))}
            </Card>
          )}
          <div className="twoCol">
            {[
              ["artifact_set", "Artifact sets"],
              ["main_stats", "Main stats"],
              ["substats", "Substat priorities"],
              ["talent_priority", "Talent priorities"],
              ["team_note", "Team notes"],
            ].map(([key, label]) => (
              <Card key={key}>
                <h2>{label}</h2>
                {grouped(key).length ? (
                  grouped(key).map((r) => <Recommendation row={r} key={r.id} />)
                ) : (
                  <p className="muted">No published guidance yet.</p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
      {tab === "talents" && (
        <div className="talentGrid">
          {c.skills.length ? (
            c.skills.map((s) => (
              <Card key={s.id}>
                <div className="itemRow">
                  <Image src={s.icon_url} alt="" />
                  <div>
                    <small>{skillLabels[s.type] || s.type}</small>
                    <h3>{s.name}</h3>
                  </div>
                </div>
                <p>
                  {s.description?.split("\n\n")[0]?.slice(0, 250)}
                  {s.description?.split("\n\n")[0]?.length > 250 ? "…" : ""}
                </p>
                <details>
                  <summary>Read full talent description</summary>
                  <p className="preserveLines">{s.description}</p>
                </details>
              </Card>
            ))
          ) : (
            <Empty
              title="Talents not yet available"
              body="A matching talent sheet has not been imported for this character."
            />
          )}
        </div>
      )}
      {tab === "ascension" && <AscensionCalculator key={c.id} character={c} />}
      {tab === "lore" && (
        <div className="twoCol">
          <Card>
            <h2>{c.detail?.title || c.name}</h2>
            <p>{c.stats?.description}</p>
            <dl className="definitionList">
              <dt>Affiliation</dt>
              <dd>{c.detail?.affiliation || "Unlisted"}</dd>
              <dt>Birthday</dt>
              <dd>{c.detail?.birthday || "Unlisted"}</dd>
              <dt>Constellation</dt>
              <dd>{c.detail?.constellation || "Unlisted"}</dd>
            </dl>
          </Card>
          <Card>
            <h2>Voice cast</h2>
            {Object.entries(c.detail?.voiceActors || {}).map(
              ([lang, actor]) => (
                <div className="statLine" key={lang}>
                  <span>{lang}</span>
                  <b>{actor}</b>
                </div>
              ),
            )}
          </Card>
        </div>
      )}
      {tab === "gallery" && (
        <div className="gallery">
          {[c.artwork_url, ...(c.detail?.gallery || [])]
            .filter(Boolean)
            .map((src) => (
              <Card key={src}>
                <Image src={src} alt={`${c.name} artwork`} />
              </Card>
            ))}
        </div>
      )}
      <p className="sourceNote">
        Catalog: {c.source_meta?.provider || "Community entry"}{" "}
        {c.source_meta?.packageVersion || ""}. Source version labels may include
        upcoming content. Game artwork and text belong to HoYoverse.
      </p>
    </section>
  );
}
