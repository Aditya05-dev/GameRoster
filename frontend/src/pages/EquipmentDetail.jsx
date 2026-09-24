import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useApi } from "../lib/hooks";
import {
  Card,
  Image,
  Loading,
  ErrorNotice,
  BackLink,
  Select,
} from "../components/UI";
export default function EquipmentDetail() {
  const { resource, id } = useParams(),
    { data, loading, error, reload } = useApi(`/catalog/${resource}/${id}`),
    [refinement, setRefinement] = useState(0);
  if (loading) return <Loading />;
  if (error)
    return (
      <section className="section">
        <ErrorNotice error={error} retry={reload} />
      </section>
    );
  const e = data.item;
  return (
    <section className="section">
      <BackLink
        to={`/games/genshin-impact/${e.kind === "artifact_set" ? "artifacts" : resource}`}
      >
        Back to catalog
      </BackLink>
      <div className="itemHero">
        <Image src={e.portrait_url || e.detail?.portrait} alt={e.name} />
        <div>
          <p className="eyebrow">{e.kind || e.category || e.location}</p>
          <h1>{e.name}</h1>
          {e.rarity && <p className="stars">{"★".repeat(e.rarity)}</p>}
          <p>{e.stats?.description || e.detail?.description}</p>
        </div>
      </div>
      <div className="twoCol">
        <Card>
          <h2>{e.kind === "weapon" ? "Weapon effect" : "Details"}</h2>
          {e.stats?.refinements && (
            <Select
              label="Refinement"
              value={refinement}
              onChange={(v) => setRefinement(Number(v.target.value))}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <option value={i} key={i}>
                  R{i + 1}
                </option>
              ))}
            </Select>
          )}
          <p className="preserveLines">
            {e.stats?.refinements?.[refinement] ||
              e.effect_text ||
              e.drops ||
              e.detail?.domainName ||
              "See source locations below."}
          </p>
          {e.stats?.baseAttack != null && (
            <p>
              Base ATK at level 90: <b>{Math.round(e.stats.baseAttack)}</b>
              <br />
              Secondary stat: <b>{e.stats.secondaryStat}</b>
            </p>
          )}
          {e.stats?.pieces?.map((p) => (
            <div key={p.slot} className="itemRow">
              <Image src={p.portrait} alt={p.name} />
              <span>
                {p.name}
                <small>{p.slot}</small>
              </span>
            </div>
          ))}
        </Card>
        <Card>
          <h2>
            {resource === "domains" ? "Plan your run" : "Sources & progression"}
          </h2>
          {e.available_days && (
            <p>{e.available_days.join(" · ") || "Every day"}</p>
          )}
          {e.detail?.days?.length > 0 && <p>{e.detail.days.join(" · ")}</p>}
          {e.source_locations?.map((s) => (
            <p key={s}>{s}</p>
          ))}
          {e.detail?.entrance && (
            <p>
              {e.detail.entrance} · Level {e.difficulty}
            </p>
          )}
          {e.detail?.recommendedElements?.length > 0 && (
            <p>
              Recommended elements: {e.detail.recommendedElements.join(", ")}
            </p>
          )}
          {e.detail?.disorder?.map((s) => (
            <p key={s}>{s}</p>
          ))}
          {e.stats?.ascension &&
            Object.entries(e.stats.ascension).map(([key, costs]) => (
              <details key={key}>
                <summary>Ascension {key.replace("ascend", "")}</summary>
                <ul>
                  {costs.map((c) => (
                    <li key={c.id}>
                      {c.name} × {c.count.toLocaleString()}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          <p className="sourceNote">
            Catalog: {e.source_meta?.provider || "Community entry"}{" "}
            {e.source_meta?.packageVersion || ""} · Source version{" "}
            {e.source_meta?.version || "unspecified"}
          </p>
        </Card>
      </div>
    </section>
  );
}
