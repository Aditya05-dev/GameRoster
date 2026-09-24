import React from "react";
import { Link } from "react-router-dom";
import { useApi } from "../lib/hooks";
import { Card, Loading, ErrorNotice } from "../components/UI";

export default function Games() {
  const { data, loading, error, reload } = useApi("/games");
  return (
    <section className="section">
      <h1>Games</h1>
      <p className="muted">Choose a game to open its archive and tools.</p>
      <ErrorNotice error={error} retry={reload} />
      {loading ? (
        <Loading />
      ) : (
        <div className="grid games">
          {data?.games.map((g) => (
            <Link to={`/games/${g.slug}`} key={g.id}>
              <Card className="gameCard">
                <span
                  className="gameDot"
                  style={{ background: g.accent_color }}
                />
                <h3>{g.name}</h3>
                <p>
                  {g.entity_schema?.domainWord || "Content"} ·{" "}
                  {g.entity_schema?.currency || "Resources"}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
