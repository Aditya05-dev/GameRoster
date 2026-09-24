import React from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { useApi, elementColors } from "../lib/hooks";
import {
  Card,
  Image,
  Field,
  Select,
  Loading,
  ErrorNotice,
  Empty,
  Pagination,
  Badge,
} from "../components/UI";
const titles = {
  characters: ["Characters", "Meet your next main."],
  equipment: ["Weapons", "The right weapon for every playstyle."],
  artifacts: ["Artifact sets", "Build around the bonuses that matter."],
  materials: ["Materials", "A clear path from wish list to fully built."],
  domains: ["Domains", "Know where your next upgrade begins."],
};
export default function Catalog({ resource }) {
  const { game } = useOutletContext(),
    [params, setParams] = useSearchParams();
  const query = new URLSearchParams(params);
  query.set("gameId", game.id);
  query.set("pageSize", "24");
  if (resource === "artifacts") query.set("kind", "artifact_set");
  if (resource === "equipment") query.set("kind", "weapon");
  const endpoint =
    resource === "characters"
      ? "characters"
      : `catalog/${resource === "artifacts" ? "equipment" : resource}`;
  const { data, loading, error, reload } = useApi(`/${endpoint}?${query}`);
  const rows = data?.[resource === "artifacts" ? "equipment" : resource] || [];
  const change = (key, value) => {
    setParams((p) => {
      const next = new URLSearchParams(p);
      value ? next.set(key, value) : next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  };
  return (
    <>
      <div className="sectionHeading">
        <div>
          <h2>{titles[resource][0]}</h2>
          <p className="muted">{titles[resource][1]}</p>
        </div>
        {data && <Badge>{data.total} entries</Badge>}
      </div>
      <div className="filters">
        <Field
          label="Search"
          type="search"
          placeholder={`Search ${resource}…`}
          value={params.get("q") || ""}
          onChange={(e) => change("q", e.target.value)}
        />
        {resource === "characters" && (
          <>
            <Select
              label="Element"
              value={params.get("element") || ""}
              onChange={(e) => change("element", e.target.value)}
            >
              <option value="">All elements</option>
              {Object.keys(elementColors).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
            <Select
              label="Sort"
              value={params.get("sort") || "name"}
              onChange={(e) => change("sort", e.target.value)}
            >
              <option value="name">Name A–Z</option>
              <option value="rarity">Rarity</option>
              <option value="newest">Newest source version</option>
            </Select>
          </>
        )}
        {["characters", "equipment"].includes(resource) && (
          <Select
            label="Weapon"
            value={params.get("weaponType") || ""}
            onChange={(e) => change("weaponType", e.target.value)}
          >
            <option value="">All weapons</option>
            {["Sword", "Claymore", "Polearm", "Bow", "Catalyst"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        )}
        {["characters", "equipment", "artifacts", "materials"].includes(
          resource,
        ) && (
          <Select
            label="Rarity"
            value={params.get("rarity") || ""}
            onChange={(e) => change("rarity", e.target.value)}
          >
            <option value="">Any rarity</option>
            {[5, 4, 3, 2, 1].map((x) => (
              <option key={x} value={x}>
                {x}★
              </option>
            ))}
          </Select>
        )}
        {resource === "domains" && (
          <Select
            label="Available"
            value={params.get("day") || ""}
            onChange={(e) => change("day", e.target.value)}
          >
            <option value="">All days</option>
            {[
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        )}
        <button
          className="textButton filterReset"
          onClick={() => setParams({})}
        >
          Reset filters
        </button>
      </div>
      <ErrorNotice error={error} retry={reload} />
      {loading ? (
        <Loading />
      ) : !rows.length ? (
        <Empty
          title="Nothing here yet"
          body="Try different filters, or check back after more content is published."
        />
      ) : (
        <div
          className={
            resource === "characters" ? "characterGrid" : "catalogGrid"
          }
        >
          {rows.map((row) =>
            resource === "characters" ? (
              <Link
                key={row.id}
                to={`/characters/${row.id}`}
                className="characterCard"
                style={{
                  "--element": elementColors[row.stats?.element] || "#9db3d5",
                }}
              >
                <div className="characterPortrait">
                  <span className="elementTag">{row.stats?.element}</span>
                  <Image src={row.portrait_url} alt={row.name} />
                  <span className="stars">{"★".repeat(row.rarity || 0)}</span>
                </div>
                <div className="characterName">
                  <h3>{row.name}</h3>
                  <p>
                    {row.stats?.weaponType}
                    <span>↗</span>
                  </p>
                </div>
              </Link>
            ) : (
              <Link
                key={row.id}
                to={`/catalog/${resource === "artifacts" ? "equipment" : resource}/${row.id}`}
              >
                <Card className="catalogCard">
                  <Image
                    src={row.portrait_url || row.detail?.portrait}
                    alt={row.name}
                    className="catalogImage"
                  />
                  <div>
                    <small>
                      {row.kind === "artifact_set"
                        ? "ARTIFACT SET"
                        : row.stats?.weaponType || row.category || row.location}
                    </small>
                    <h3>{row.name}</h3>
                    {row.rarity && (
                      <span className="stars">{"★".repeat(row.rarity)}</span>
                    )}
                    <p>
                      {resource === "domains"
                        ? row.available_days?.join(" · ") || "Every day"
                        : row.effect_text?.slice(0, 120) ||
                          row.detail?.domainName ||
                          row.source_locations?.[0]}
                    </p>
                  </div>
                </Card>
              </Link>
            ),
          )}
        </div>
      )}
      <Pagination
        page={Number(params.get("page") || 1)}
        total={data?.total || 0}
        pageSize={24}
        onChange={(p) => change("page", String(p))}
      />
    </>
  );
}
