import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { useApi } from "../lib/hooks";
import {
  Button,
  Card,
  Image,
  Select,
  Loading,
  Empty,
  ErrorNotice,
  SignInPrompt,
} from "../components/UI";
export default function Farming() {
  const { user } = useAuth(),
    [server, setServer] = useState(user?.game_server || "Asia"),
    [now, setNow] = useState(Date.now()),
    [tab, setTab] = useState("plans");
  const schedule = useApi(
      `/companion/schedule?server=${encodeURIComponent(server)}`,
    ),
    plans = useApi(user ? "/farming-plans" : null, { auth: true });
  useEffect(() => {
    if (user?.game_server) setServer(user.game_server);
  }, [user?.game_server]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (schedule.data && now >= Date.parse(schedule.data.nextReset))
      schedule.reload();
  }, [now, schedule.data]);
  const remaining = Math.max(
      0,
      Date.parse(schedule.data?.nextReset || "") - now,
    ),
    hours = Math.floor(remaining / 3600000),
    minutes = Math.floor((remaining % 3600000) / 60000);
  const grouped = new Map();
  for (const d of schedule.data?.domains || []) {
    const key = d.name.replace(/ [IVX]+$/, "");
    if (
      !grouped.has(key) ||
      Number(d.difficulty) > Number(grouped.get(key).difficulty)
    )
      grouped.set(key, d);
  }
  return (
    <section className="section">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">A LITTLE PROGRESS, EVERY DAY</p>
          <h1>Farming planner</h1>
          <p className="muted">
            Turn your next upgrade into a manageable checklist.
          </p>
        </div>
        <Link className="btn primary" to="/games/genshin-impact/characters">
          Plan an upgrade →
        </Link>
      </div>
      <Card className="resetBanner">
        <div>
          <small>{server.toUpperCase()} SERVER</small>
          <h2>{schedule.data?.day || "Daily rotation"}</h2>
          <p>
            Next daily reset:{" "}
            {Number.isFinite(hours) ? `${hours}h ${minutes}m` : "…"} · 04:00
            server time
          </p>
        </div>
        <Select
          label="Game server"
          value={server}
          onChange={(e) => setServer(e.target.value)}
        >
          {["Asia", "Europe", "America", "TW/HK/MO"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Card>
      <div className="tabs">
        <button
          className={tab === "plans" ? "active" : ""}
          onClick={() => setTab("plans")}
        >
          My farming plans
        </button>
        <button
          className={tab === "schedule" ? "active" : ""}
          onClick={() => setTab("schedule")}
        >
          Available today
        </button>
      </div>
      {tab === "plans" ? (
        <>
          <ErrorNotice error={plans.error} retry={plans.reload} />
          {plans.loading ? (
            <Loading />
          ) : !user ? (
            <SignInPrompt />
          ) : !plans.data?.plans.length ? (
            <Empty
              title="Make your next upgrade a plan"
              body="Open a character’s Ascension tab, calculate your target, and save the result here."
            />
          ) : (
            plans.data.plans.map((p) => (
              <Plan
                key={`${p.id}-${p.updated_at}`}
                plan={p}
                reload={plans.reload}
                day={schedule.data?.day}
              />
            ))
          )}
        </>
      ) : (
        <>
          <ErrorNotice error={schedule.error} retry={schedule.reload} />
          {schedule.loading ? (
            <Loading />
          ) : (
            <div className="catalogGrid">
              {[...grouped.values()].map((d) => (
                <Link key={d.id} to={`/catalog/domains/${d.id}`}>
                  <Card>
                    <small>
                      {d.location} · {d.detail?.entrance}
                    </small>
                    <h3>{d.name}</h3>
                    <p>{d.drops}</p>
                    <span className="badge">
                      {d.available_days?.length
                        ? d.available_days.join(" · ")
                        : "Every day"}
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
function Plan({ plan, reload, day }) {
  const [collected, setCollected] = useState(plan.materials_collected || {}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const needed = Object.entries(plan.materials_needed || {});
  const completed = needed.filter(
    ([id, n]) => (collected[id] || 0) >= n,
  ).length;
  async function save() {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/farming-plans/${plan.id}`, {
        materialsCollected: collected,
      });
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="farmingPlan">
      <div className="sectionHeading">
        <div>
          <Link to={`/characters/${plan.character_id}?tab=ascension`}>
            <h2>{plan.target_upgrades.characterName || "Character upgrade"}</h2>
          </Link>
          <p className="muted">
            Level {plan.target_upgrades.fromLevel || "—"} →{" "}
            {plan.target_upgrades.toLevel || "—"} · {completed}/{needed.length}{" "}
            materials ready
          </p>
        </div>
        <button
          className="textButton"
          onClick={async () => {
            try {
              await api.del(`/farming-plans/${plan.id}`);
              reload();
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          Delete plan
        </button>
      </div>
      <progress
        value={completed}
        max={needed.length || 1}
        aria-label="Material checklist progress"
      />
      <div className="materialList">
        {needed.map(([id, n]) => {
          const item = plan.target_upgrades.items?.find(
              (x) => String(x.id) === id,
            ),
            have = collected[id] || 0,
            days = item?.detail?.days || [];
          return (
            <div className="itemRow" key={id}>
              <Image src={item?.portrait_url} alt={item?.name || id} />
              <span>
                <b>{item?.name || id}</b>
                <small>
                  {Math.max(0, n - have).toLocaleString()} remaining{" "}
                  {days.length && (day === "Sunday" || days.includes(day))
                    ? "· Farmable today"
                    : ""}
                </small>
              </span>
              <label className="inventoryField">
                <span className="srOnly">Collected {item?.name || id}</span>
                <input
                  type="number"
                  min="0"
                  max="100000000"
                  step="1"
                  value={have}
                  onChange={(e) => {
                    setCollected({
                      ...collected,
                      [id]: Math.max(0, Math.trunc(Number(e.target.value))),
                    });
                    setSaved(false);
                  }}
                />
                <small>/ {n.toLocaleString()}</small>
              </label>
              <button
                className="iconButton"
                aria-label={`Mark ${item?.name || id} complete`}
                onClick={() => {
                  setCollected({ ...collected, [id]: n });
                  setSaved(false);
                }}
              >
                ✓
              </button>
            </div>
          );
        })}
      </div>
      <ErrorNotice error={error} />
      <div className="buttonRow">
        <Button disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save progress"}
        </Button>
        {saved && (
          <span className="success" role="status">
            Progress saved
          </span>
        )}
      </div>
      <p className="sourceNote">
        Inventory counts belong to this plan. Character EXP:{" "}
        {(plan.target_upgrades.experience || 0).toLocaleString()}.
      </p>
    </Card>
  );
}
