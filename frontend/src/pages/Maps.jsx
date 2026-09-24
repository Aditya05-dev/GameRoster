import React, { useEffect, useRef, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { api, safeLink } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { useApi } from "../lib/hooks";
import {
  Card,
  Button,
  Select,
  Field,
  Textarea,
  Dialog,
  Empty,
  Loading,
  ErrorNotice,
} from "../components/UI";
export default function Maps() {
  const context = useOutletContext(),
    { user } = useAuth(),
    gameData = useApi(context ? null : "/games/genshin-impact"),
    game = context?.game || gameData.data?.game;
  const maps = useApi(game ? `/maps?gameId=${game.id}` : null),
    [mapId, setMapId] = useState(""),
    [selected, setSelected] = useState(null),
    [categories, setCategories] = useState([]),
    [hideCollected, setHideCollected] = useState(false),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [adding, setAdding] = useState(null),
    [error, setError] = useState(""),
    [imageError, setImageError] = useState(false);
  const map = maps.data?.maps.find((m) => m.id === mapId) || maps.data?.maps[0],
    markers = useApi(map ? `/maps/${map.id}/markers` : null),
    collections = useApi(map && user ? `/maps/${map.id}/collected` : null, {
      auth: true,
    }),
    imageRef = useRef(),
    drag = useRef();
  const all = markers.data?.markers || [],
    collected = collections.data?.collected || [];
  const unique = [...new Set(all.map((m) => m.category || "Other"))];
  useEffect(() => {
    setSelected(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCategories([]);
    setImageError(false);
  }, [map?.id]);
  const toggleCollected = async (marker) => {
    try {
      await api.put(`/maps/${map.id}/collected/${marker.id}`, {
        collected: !collected.includes(marker.id),
      });
      collections.reload();
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className={context ? "" : "section"}>
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">LEAVE NO STONE UNTURNED</p>
          <h1>World map</h1>
        </div>
        {game?.slug === "genshin-impact" && (
          <a
            className="btn primary"
            href="https://act.hoyolab.com/ys/app/interactive-map/index.html"
            target="_blank"
            rel="noreferrer"
          >
            Open official Teyvat map ↗
          </a>
        )}
      </div>
      <p className="muted">
        Community maps below support pan, zoom, category filters, and saved
        collection progress. Use the official map for the complete live world.
      </p>
      <ErrorNotice
        error={error || maps.error || markers.error || collections.error}
        retry={maps.reload}
      />
      {maps.loading ? (
        <Loading />
      ) : !map ? (
        <Empty
          title="No community map has been published yet"
          body="The official interactive map is available above. Admins can publish a map image and add accurately placed markers."
        />
      ) : (
        <>
          <div className="filters">
            <Select
              label="Map"
              value={map.id}
              onChange={(e) => setMapId(e.target.value)}
            >
              {maps.data.maps.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
            <label className="check">
              <input
                type="checkbox"
                checked={hideCollected}
                onChange={(e) => setHideCollected(e.target.checked)}
              />
              Hide collected
            </label>
            <small>
              {collected.length} collected / {all.length} markers
            </small>
          </div>
          <div className="mapLayout">
            <aside className="mapSidebar">
              <h3>Locations</h3>
              <p className="muted">No selection shows all categories.</p>
              {unique.map((c) => (
                <label key={c} className="check">
                  <input
                    type="checkbox"
                    checked={categories.includes(c)}
                    onChange={(e) =>
                      setCategories(
                        e.target.checked
                          ? [...categories, c]
                          : categories.filter((x) => x !== c),
                      )
                    }
                  />
                  {c}
                </label>
              ))}
              {selected && (
                <Card>
                  <h3>{selected.label}</h3>
                  <small>{selected.category}</small>
                  <p>{selected.notes}</p>
                  {user ? (
                    <Button onClick={() => toggleCollected(selected)}>
                      {collected.includes(selected.id)
                        ? "Mark uncollected"
                        : "Mark collected"}
                    </Button>
                  ) : (
                    <p className="muted">Log in to track this location.</p>
                  )}
                </Card>
              )}
              {safeLink(map.source_url) && (
                <a href={map.source_url} target="_blank" rel="noreferrer">
                  Map source ↗
                </a>
              )}
              {user?.role === "admin" && (
                <p className="sourceNote">
                  Double-click the map image to place a marker.
                </p>
              )}
            </aside>
            <div
              className="mapViewport"
              tabIndex={0}
              aria-label="Interactive map. Use arrow keys to pan and plus/minus to zoom."
              onKeyDown={(e) => {
                const moves = {
                  ArrowLeft: [30, 0],
                  ArrowRight: [-30, 0],
                  ArrowUp: [0, 30],
                  ArrowDown: [0, -30],
                };
                if (moves[e.key]) {
                  e.preventDefault();
                  setPan((p) => ({
                    x: p.x + moves[e.key][0],
                    y: p.y + moves[e.key][1],
                  }));
                }
                if (e.key === "+") setZoom((z) => Math.min(6, z + 0.25));
                if (e.key === "-") setZoom((z) => Math.max(0.5, z - 0.25));
              }}
              onPointerDown={(e) => {
                if (e.target.closest("button")) return;
                drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (drag.current)
                  setPan({
                    x: e.clientX - drag.current.x,
                    y: e.clientY - drag.current.y,
                  });
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            >
              <div
                className="mapImageLayer"
                ref={imageRef}
                style={{
                  transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
                }}
                onDoubleClick={(e) => {
                  if (user?.role !== "admin" || e.target.closest("button"))
                    return;
                  const rect = imageRef.current.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100,
                    y = ((e.clientY - rect.top) / rect.height) * 100;
                  if (x >= 0 && x <= 100 && y >= 0 && y <= 100)
                    setAdding({
                      x,
                      y,
                      label: "",
                      category: "Material",
                      notes: "",
                    });
                }}
              >
                {imageError ? (
                  <Empty
                    title="The map image could not load"
                    body="Check the published image URL or open the official map."
                  />
                ) : (
                  <img
                    className="mapImage"
                    src={map.image_url}
                    alt={map.name}
                    draggable="false"
                    onError={() => setImageError(true)}
                  />
                )}{" "}
                {!imageError &&
                  all
                    .filter(
                      (m) =>
                        (!categories.length ||
                          categories.includes(m.category || "Other")) &&
                        (!hideCollected || !collected.includes(m.id)),
                    )
                    .map((m) => (
                      <button
                        key={m.id}
                        className={`mapMarker ${collected.includes(m.id) ? "collected" : ""}`}
                        style={{
                          left: `${m.x}%`,
                          top: `${m.y}%`,
                          transform: `translate(-50%,-50%) scale(${1 / zoom})`,
                        }}
                        title={m.label}
                        aria-label={m.label}
                        onClick={() => setSelected(m)}
                      >
                        {collected.includes(m.id) ? "✓" : "◆"}
                      </button>
                    ))}
              </div>
              <div className="mapControls">
                <button
                  className="iconButton"
                  aria-label="Zoom in"
                  onClick={() => setZoom((z) => Math.min(6, z + 0.25))}
                >
                  +
                </button>
                <button
                  className="iconButton"
                  aria-label="Zoom out"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                >
                  −
                </button>
                <button
                  className="iconButton"
                  aria-label="Reset map view"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                >
                  ↺
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {user?.role === "admin" && (
        <p>
          <Link to="/admin">Manage map images and markers →</Link>
        </p>
      )}
      {adding && (
        <Dialog title="Place a map marker" close={() => setAdding(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.post(`/maps/${map.id}/markers`, adding);
                setAdding(null);
                markers.reload();
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            <Field
              label="Location name"
              value={adding.label}
              required
              maxLength={120}
              onChange={(e) => setAdding({ ...adding, label: e.target.value })}
            />
            <Field
              label="Category"
              value={adding.category}
              maxLength={80}
              onChange={(e) =>
                setAdding({ ...adding, category: e.target.value })
              }
            />
            <Textarea
              label="Notes"
              value={adding.notes}
              maxLength={500}
              onChange={(e) => setAdding({ ...adding, notes: e.target.value })}
            />
            <p className="muted">
              X {adding.x.toFixed(2)}% · Y {adding.y.toFixed(2)}%
            </p>
            <Button>Save marker</Button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
