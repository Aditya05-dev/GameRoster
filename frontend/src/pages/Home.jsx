import React from "react";
import { Link } from "react-router-dom";
import { useApi } from "../lib/hooks";
import { Card, Loading, ErrorNotice } from "../components/UI";
export default function Home() {
  const { data, loading, error, reload } = useApi("/games");
  return (
    <>
      <section className="hero">
        <div className="heroStars" aria-hidden="true">
          ✧
        </div>
        <p className="eyebrow">A HOME FOR EVERY ADVENTURE</p>
        <h1>
          Many worlds.
          <br />
          One <em>GameRoster.</em>
        </h1>
        <p>
          Your characters, your builds, your next adventure.
          <br />
          Give your journey a little more direction.
        </p>
        <div className="buttonRow">
          <Link className="btn primary" to="/games/genshin-impact">
            Explore Genshin <span>→</span>
          </Link>
          <Link className="btn ghost" to="/lookup">
            Find my showcase
          </Link>
        </div>
        <div className="heroCaption">
          <span /> Built for the way you play
        </div>
      </section>
      <section className="section">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">CHOOSE YOUR WORLD</p>
            <h2>Where are we heading?</h2>
          </div>
          <Link className="textButton" to="/games">
            All games ↗
          </Link>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorNotice error={error} retry={reload} />
        ) : (
          <div className="grid games">
            {data.games.map((g, i) => (
              <Link key={g.id} to={`/games/${g.slug}`}>
                <Card
                  className={`gameCard gameCard${i}`}
                  style={{ "--accent": g.accent_color }}
                >
                  <span className="gameGlyph">
                    {["✦", "✧", "ϟ", "≈", "◇", "◌"][i] || "✦"}
                  </span>
                  <div>
                    <small>{g.franchise || "EXPLORE A NEW WORLD"}</small>
                    <h3>{g.short_name}</h3>
                    <p>
                      {g.slug === "genshin-impact"
                        ? "Characters, builds & daily planning"
                        : "Explore available community content"}
                    </p>
                  </div>
                  <span className="cardArrow">↗</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="section closingBanner">
        <div>
          <p className="eyebrow">YOUR NEXT GOOD BUILD STARTS HERE</p>
          <h2>Turn a showcase into a plan.</h2>
          <p>
            Look up your public Genshin showcase, save a build, and track what
            you need next.
          </p>
        </div>
        <Link className="btn primary" to="/lookup">
          Enter your UID →
        </Link>
      </section>
    </>
  );
}
