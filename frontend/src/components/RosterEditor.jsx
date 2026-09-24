import React, { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import { Button, Field, Select, ErrorNotice } from "./UI";
export default function RosterEditor({ character, entry, onSaved }) {
  const { user } = useAuth(),
    [status, setStatus] = useState(entry?.status || "owned"),
    [level, setLevel] = useState(entry?.level || 1),
    [constellation, setConstellation] = useState(entry?.constellation || 0),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.put(
        `/companion/roster/${character.id || character.character_id}`,
        { status, level: Number(level), constellation: Number(constellation) },
      );
      setMessage("Saved to your roster.");
      onSaved?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <p className="muted">
        Log in to add this character to your roster or wish list.
      </p>
    );
  return (
    <form onSubmit={save}>
      <div className="filters">
        <Select
          label="Collection"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="owned">Owned</option>
          <option value="wishlist">Wish list</option>
        </Select>
        <Field
          label="Level"
          type="number"
          min="1"
          max="90"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        />
        <Select
          label="Constellation"
          value={constellation}
          onChange={(e) => setConstellation(e.target.value)}
        >
          {[0, 1, 2, 3, 4, 5, 6].map((n) => (
            <option value={n} key={n}>
              C{n}
            </option>
          ))}
        </Select>
      </div>
      <ErrorNotice error={error} />
      <div className="buttonRow">
        <Button disabled={busy}>
          {busy ? "Saving…" : "Save to my roster"}
        </Button>
        <span className="success" role="status">
          {message}
        </span>
      </div>
    </form>
  );
}
