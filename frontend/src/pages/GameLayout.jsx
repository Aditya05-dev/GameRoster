import React from "react";
import { NavLink, Outlet, useParams, Link } from "react-router-dom";
import { useApi } from "../lib/hooks";
import { Loading, ErrorNotice } from "../components/UI";
export default function GameLayout() {
  const { slug } = useParams(),
    { data, loading, error, reload } = useApi(`/games/${slug}`);
  if (loading) return <Loading />;
  if (error)
    return (
      <section className="section">
        <ErrorNotice error={error} retry={reload} />
      </section>
    );
  const game = data.game;
  return (
    <section className="section gameSection">
      <div className="gameHeading">
        <div>
          <Link className="eyebrow" to="/games">
            EXPLORE THE WORLDS /
          </Link>
          <h1>{game.name}</h1>
        </div>
        <span className="worldEmblem" aria-hidden="true">
          ✦
        </span>
      </div>
      <nav className="gameNav" aria-label={`${game.name} sections`}>
        {[
          ["", "Overview"],
          ["characters", "Characters"],
          ["equipment", "Weapons"],
          ["artifacts", "Artifacts"],
          ["materials", "Materials"],
          ["domains", "Domains"],
          ["map", "Map"],
          ["guides", "Guides"],
          ["teams", "Teams"],
          ["tier-lists", "Tier lists"],
        ].map(([path, label]) => (
          <NavLink
            end
            key={path}
            to={`/games/${slug}${path ? `/${path}` : ""}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet context={{ game }} />
    </section>
  );
}
