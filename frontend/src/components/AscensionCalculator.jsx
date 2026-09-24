import React, { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import { Button, Card, Field, Select, Image, ErrorNotice } from "./UI";
export default function AscensionCalculator({ character }) {
  const { user } = useAuth(),
    [input, setInput] = useState({
      fromLevel: 1,
      toLevel: 90,
      fromAscension: 0,
      toAscension: 6,
      fromTalents: [1, 1, 1],
      toTalents: [1, 8, 8],
    }),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const change = (k, v) => {
    setInput((x) => ({ ...x, [k]: v }));
    setResult(null);
    setSaved(false);
  };
  async function calculate(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      setResult(
        await api.post(
          "/companion/calculate",
          { characterId: character.id, ...input },
          { auth: false },
        ),
      );
      setSaved(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    try {
      await api.post("/farming-plans", {
        gameId: result.gameId,
        characterId: character.id,
        targetUpgrades: {
          ...input,
          characterName: character.name,
          experience: result.experience,
          items: result.items.map((x) => ({
            id: x.id,
            name: x.name,
            portrait_url: x.portrait_url,
            detail: x.detail,
          })),
        },
        materialsNeeded: Object.fromEntries(
          result.items.map((x) => [String(x.id), x.count]),
        ),
        materialsCollected: {},
      });
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <h2>Plan an upgrade</h2>
      <p className="muted">
        Choose exact levels and ascension phases. At a level cap, phase
        distinguishes before and after ascending.
      </p>
      <form onSubmit={calculate}>
        <div className="twoCol">
          {["from", "to"].map((prefix) => (
            <div key={prefix}>
              <h3>
                {prefix === "from" ? "Current progress" : "Target progress"}
              </h3>
              <div className="filters">
                <Field
                  label="Character level"
                  type="number"
                  min="1"
                  max="90"
                  value={input[`${prefix}Level`]}
                  onChange={(e) =>
                    change(`${prefix}Level`, Number(e.target.value))
                  }
                />
                <Select
                  label="Ascension phase"
                  value={input[`${prefix}Ascension`]}
                  onChange={(e) =>
                    change(`${prefix}Ascension`, Number(e.target.value))
                  }
                >
                  {[20, 40, 50, 60, 70, 80, 90].map((n, i) => (
                    <option key={i} value={i}>
                      {i} · Max Lv. {n}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="filters">
                {["Normal attack", "Skill", "Burst"].map((label, i) => (
                  <Field
                    key={label}
                    label={label}
                    type="number"
                    min="1"
                    max="10"
                    value={input[`${prefix}Talents`][i]}
                    onChange={(e) =>
                      change(
                        `${prefix}Talents`,
                        input[`${prefix}Talents`].map((n, j) =>
                          j === i ? Number(e.target.value) : n,
                        ),
                      )
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <ErrorNotice error={error} />
        <Button disabled={busy}>
          {busy ? "Calculating…" : "Calculate materials"}
        </Button>
      </form>
      {result && (
        <div className="calculatorResults">
          <h3>Your upgrade checklist</h3>
          <p>
            {result.experience.toLocaleString()} character EXP · About{" "}
            {result.herosWitEquivalent.toLocaleString()} Hero’s Wit equivalent
          </p>
          <p className="sourceNote">
            EXP assumes no partial progress at the current level. Book
            equivalent rounds up; excess EXP and book inventory are not
            deducted. Mora includes level-up, ascension, and selected talent
            costs. Talent levels exclude constellation bonuses.
          </p>
          <div className="materialList">
            {result.items.map((x) => (
              <div className="itemRow" key={x.id}>
                <Image src={x.portrait_url} alt={x.name} />
                <span>
                  <b>{x.name}</b>
                  <small>
                    {x.detail?.domainName || x.source_locations?.[0]}
                    {x.detail?.days?.length
                      ? ` · ${x.detail.days.join(", ")}`
                      : ""}
                  </small>
                </span>
                <strong>{x.count.toLocaleString()}</strong>
              </div>
            ))}
          </div>
          {user ? (
            <Button disabled={saved || busy} onClick={save}>
              {saved ? "Saved to farming plans" : "Save farming plan"}
            </Button>
          ) : (
            <p className="muted">
              Log in to save this plan and track collected materials.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
