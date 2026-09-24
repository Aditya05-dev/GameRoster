import React from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useApi } from "../lib/hooks";
import { Card, Empty, Loading, ErrorNotice } from "../components/UI";
export default function TierLists() {
  const { game } = useOutletContext(),
    { data, loading, error, reload } = useApi(`/tier-lists?gameId=${game.id}`);
  return (
    <>
      <p className="eyebrow">CONTEXT BEFORE RANKINGS</p>
      <h1>Tier lists</h1>
      <p className="muted">
        Rankings reflect their stated assumptions and version. Your team and
        investment can change the result.
      </p>
      <ErrorNotice error={error} retry={reload} />
      {loading ? (
        <Loading />
      ) : !data?.tierLists.length ? (
        <Empty
          title="No published tier lists yet"
          body="A ranking needs a clear methodology. Admins can publish a list with its assumptions and explanations."
        />
      ) : (
        data.tierLists.map((list) => (
          <Card key={list.id}>
            <h2>{list.title}</h2>
            <small>Version {list.version || "not specified"}</small>
            <p>{list.methodology_notes}</p>
            {list.tiers.map((t) => (
              <div className="tierRow" key={t.id}>
                <b>{t.label}</b>
                <div>
                  {t.entries.map((e) => (
                    <Link
                      to={`/characters/${e.characterId}`}
                      key={e.characterId}
                      title={e.explanation || ""}
                    >
                      {e.name}
                      <small>{e.explanation}</small>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        ))
      )}
    </>
  );
}
