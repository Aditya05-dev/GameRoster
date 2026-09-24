import React from "react";
import { formatStat } from "../lib/hooks";
export default function BuildComparison({ left, right }) {
  const keys = [
    ...new Set([
      ...Object.keys(left?.stats || {}),
      ...Object.keys(right?.stats || {}),
    ]),
  ];
  return (
    <>
      <p className="muted">
        Displayed stats only. Differences do not predict damage, team buffs, or
        combat performance.
      </p>
      {left.nativeId !== right.nativeId && (
        <p className="notice">These builds belong to different characters.</p>
      )}
      <div className="tableScroll">
        <table>
          <thead>
            <tr>
              <th>Stat</th>
              <th>{left.name}</th>
              <th>{right.name}</th>
              <th>Change (right − left)</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => {
              const a = left.stats?.[k],
                b = right.stats?.[k],
                delta =
                  a?.value != null && b?.value != null
                    ? b.value - a.value
                    : null;
              return (
                <tr key={k}>
                  <th>{a?.label || b?.label || k}</th>
                  <td>{formatStat(a)}</td>
                  <td>{formatStat(b)}</td>
                  <td>
                    {delta == null
                      ? "—"
                      : `${delta > 0 ? "+" : ""}${delta.toLocaleString(undefined, { maximumFractionDigits: a.percent ? 1 : 0 })}${a.percent ? " pp" : ""}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
