import React from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Users,
  Swords,
  Gem,
  Compass,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import { useApi } from "../lib/hooks";
import { Card } from "../components/UI";
export default function GameDetail() {
  const { game } = useOutletContext();
  const { data } = useApi(
    game.slug === "genshin-impact" ? "/catalog/status" : null,
  );
  const counts = data?.latest?.counts;
  return (
    <>
      <div className="worldHero">
        <div>
          <p className="eyebrow">
            {game.slug === "genshin-impact"
              ? "YOUR COMPANION IN TEYVAT"
              : "YOUR GAME COMPANION"}
          </p>
          <h2>
            A little planning.
            <br />A whole world to explore.
          </h2>
          <p>
            Find your next character, refine a build, and make every day of
            farming count.
          </p>
          <Link className="btn primary" to={`/games/${game.slug}/characters`}>
            Explore characters →
          </Link>
          {game.slug === "genshin-impact" && (
            <Link className="btn ghost" to="/lookup">
              View my showcase
            </Link>
          )}
        </div>
        <div className="orbital" aria-hidden="true">
          <span>✧</span>
        </div>
      </div>
      <div className="sectionHeading">
        <h2>Your adventure toolkit</h2>
        <span className="muted">One place for every step</span>
      </div>
      <div className="toolGrid">
        {[
          [
            "characters",
            "Characters",
            "Discover kits, talents, and progression.",
            Users,
            counts?.characters,
          ],
          [
            "equipment",
            "Weapons & equipment",
            "Find the tools that fit your playstyle.",
            Swords,
            counts?.equipment,
          ],
          [
            "materials",
            "Materials",
            "Know what you need and where to find it.",
            Gem,
            counts?.materials,
          ],
          [
            "domains",
            "Domain schedule",
            "Plan around daily material rotations.",
            CalendarDays,
            counts?.domains,
          ],
          [
            "map",
            "Explore the map",
            "Filter locations and track your collection.",
            Compass,
          ],
          ["guides", "Guides", "Read published community knowledge.", BookOpen],
        ].map(([path, title, description, Icon, count]) => (
          <Link to={`/games/${game.slug}/${path}`} key={path}>
            <Card className="toolCard">
              <Icon />
              <span className="toolCount">{count || "↗"}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </Card>
          </Link>
        ))}
      </div>
      {data?.latest && (
        <p className="sourceNote">
          Catalog snapshot: {data.latest.source_meta.provider}{" "}
          {data.latest.source_meta.packageVersion} · Imported{" "}
          {new Date(data.latest.imported_at).toLocaleDateString()}. Provider
          entries may include upcoming content; version labels are not verified
          release dates.
        </p>
      )}
    </>
  );
}
