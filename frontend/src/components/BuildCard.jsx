import React, { useState } from "react";
import { Link } from "react-router-dom";
import { elementColors, formatStat } from "../lib/hooks";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import { exportBuild } from "../lib/exportBuild";
import { Card, Image, Badge, Button, ErrorNotice } from "./UI";
const slotNames = {
  EQUIP_BRACER: "Flower",
  EQUIP_NECKLACE: "Plume",
  EQUIP_SHOES: "Sands",
  EQUIP_RING: "Goblet",
  EQUIP_DRESS: "Circlet",
};
export default function BuildCard({
  build,
  uid = "",
  onCompare,
  canSave = false,
  gameId,
}) {
  const { user } = useAuth(),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [showUid, setShowUid] = useState(false);
  async function action(fn) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card
      className="buildCard"
      style={{ "--element": elementColors[build.element] || "#bdccea" }}
    >
      <div className="buildHeader">
        <Image src={build.image} alt={build.name} />
        <div>
          <p className="eyebrow">{build.element} / CHARACTER SHOWCASE</p>
          {build.characterId ? (
            <Link to={`/characters/${build.characterId}`}>
              <h2>{build.name}</h2>
            </Link>
          ) : (
            <h2>{build.name}</h2>
          )}
          <div className="badgeRow">
            <Badge>Lv. {build.level ?? "—"}</Badge>
            <Badge>C{build.constellation ?? "—"}</Badge>
            {build.friendship != null && (
              <Badge>Friendship {build.friendship}</Badge>
            )}
          </div>
        </div>
      </div>
      <div className="buildColumns">
        <div>
          <div className="buildStats">
            {Object.entries(build.stats || {})
              .filter(
                ([k, s]) =>
                  [
                    "hp",
                    "atk",
                    "def",
                    "em",
                    "critRate",
                    "critDamage",
                    "energyRecharge",
                  ].includes(k) ||
                  (s.value != null && s.value > 0),
              )
              .map(([key, s]) => (
                <div className="statLine" key={key}>
                  <span>{s.label}</span>
                  <b>{formatStat(s)}</b>
                </div>
              ))}
          </div>
          <div className="weaponPanel">
            <Image
              src={build.weapon?.image}
              alt={build.weapon?.name || "Weapon"}
            />
            <div>
              <b>{build.weapon?.name || "Weapon unavailable"}</b>
              {build.weapon && (
                <>
                  <small>
                    Lv. {build.weapon.level ?? "—"} · R
                    {build.weapon.refinement ?? "—"} · {build.weapon.rarity}★
                  </small>
                  {build.weapon.stats?.map((s, i) => (
                    <small key={i}>
                      {s.label}: {formatStat(s)}
                    </small>
                  ))}
                </>
              )}
            </div>
          </div>
          <div className="talentLevels">
            {build.talents?.map((t) => (
              <div key={t.id}>
                <Image src={t.image} alt="Talent" />
                <b>{t.baseLevel == null ? "—" : t.baseLevel + t.bonus}</b>
                <small>
                  {t.bonus ? `${t.baseLevel} + ${t.bonus}` : "Base level"}
                </small>
              </div>
            ))}
          </div>
        </div>
        <div className="artifactList">
          {build.artifacts?.length ? (
            build.artifacts.map((a) => (
              <div className="artifact" key={`${a.slot}-${a.itemId}`}>
                <Image src={a.image} alt={a.name} />
                <div>
                  <small>
                    {slotNames[a.slot] || a.slot} · +{a.level ?? "—"}
                  </small>
                  <b>{a.name}</b>
                  <small>{a.setName}</small>
                  <p>
                    {a.mainStat.label}:{" "}
                    <strong>{formatStat(a.mainStat)}</strong>
                  </p>
                  <div className="substats">
                    {a.substats.map((s, i) => (
                      <span key={i}>
                        {s.label} <b>{formatStat(s)}</b>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No artifact details are visible.</p>
          )}
        </div>
      </div>
      <ErrorNotice error={error} />
      <p className="success" role="status">
        {message}
      </p>
      <div className="buildActions">
        <label className="check">
          <input
            type="checkbox"
            checked={showUid}
            onChange={(e) => setShowUid(e.target.checked)}
            disabled={!uid}
          />
          Show UID on export
        </label>
        <Button
          kind="ghost"
          disabled={busy}
          onClick={() =>
            action(async () => {
              const r = await exportBuild(build, { uid, showUid });
              setMessage(
                r.imageIncluded
                  ? "PNG exported."
                  : "PNG exported without artwork; the image host was unavailable.",
              );
            })
          }
        >
          Export PNG
        </Button>
        {onCompare && (
          <Button kind="ghost" onClick={() => onCompare(build)}>
            Compare
          </Button>
        )}
        {canSave && user && build.characterId && (
          <Button
            disabled={busy}
            onClick={() =>
              action(async () => {
                await api.post("/builds", {
                  gameId,
                  characterId: build.characterId,
                  title: `${build.name} · ${new Date().toLocaleDateString()}`,
                  buildType: "endgame",
                  visibility: "private",
                  snapshot: build,
                });
                setMessage("Saved privately to My builds.");
              })
            }
          >
            Save build
          </Button>
        )}
      </div>
    </Card>
  );
}
