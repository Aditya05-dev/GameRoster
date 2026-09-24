import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useApi } from "../lib/hooks";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import {
  Card,
  Field,
  Button,
  Dialog,
  Empty,
  Loading,
  ErrorNotice,
} from "../components/UI";
export default function Guides() {
  const context = useOutletContext(),
    { user } = useAuth(),
    { data, loading, error, reload } = useApi(
      `/guides${context ? `?gameId=${context.game.id}` : ""}`,
      { auth: true },
    ),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState(null),
    [message, setMessage] = useState("");
  const guides = (data?.guides || []).filter((g) =>
    `${g.title} ${g.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className={context ? "" : "section"}>
      <p className="eyebrow">KNOWLEDGE WORTH KEEPING</p>
      <h1>Guides</h1>
      <Field
        label="Search guides"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ErrorNotice error={error} retry={reload} />
      {loading ? (
        <Loading />
      ) : guides.length ? (
        <div className="catalogGrid">
          {guides.map((g) => (
            <Card key={g.id}>
              <small>
                {g.category} · {g.status}
              </small>
              <h2>{g.title}</h2>
              <p>{g.body.slice(0, 160)}…</p>
              <small>By {g.author_username}</small>
              <p>
                <Button
                  kind="ghost"
                  onClick={() => {
                    setSelected(g);
                    setMessage("");
                  }}
                >
                  Read guide →
                </Button>
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <Empty
          title="Knowledge is on its way"
          body="Published guides will appear here. Admins can draft and publish guides in the content studio."
        />
      )}
      {selected && (
        <Dialog title={selected.title} close={() => setSelected(null)}>
          <p className="sourceNote">
            {selected.category} · By {selected.author_username}
          </p>
          <p className="preserveLines">{selected.body}</p>
          {user && (
            <Button
              kind="ghost"
              onClick={async () => {
                try {
                  const r = await api.post("/social/bookmarks/toggle", {
                    entityType: "guide",
                    entityId: selected.id,
                  });
                  setMessage(
                    r.active ? "Bookmark saved." : "Bookmark removed.",
                  );
                } catch (e) {
                  setMessage(e.message);
                }
              }}
            >
              Bookmark guide
            </Button>
          )}
          <p role="status">{message}</p>
        </Dialog>
      )}
    </div>
  );
}
