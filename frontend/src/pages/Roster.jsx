import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";
import {
  Card,
  Image,
  Loading,
  ErrorNotice,
  Empty,
  SignInPrompt,
  Button,
  Dialog,
} from "../components/UI";
import RosterEditor from "../components/RosterEditor";
export default function Roster() {
  const { user, loading: authLoading } = useAuth(),
    { data, loading, error, reload } = useApi(
      user ? "/companion/roster" : null,
      { auth: true },
    ),
    [filter, setFilter] = useState("owned"),
    [editing, setEditing] = useState(null),
    [actionError, setActionError] = useState("");
  const rows = (data?.roster || []).filter((r) => r.status === filter);
  return (
    <section className="section">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">YOUR COLLECTION</p>
          <h1>My roster</h1>
        </div>
        <Link className="btn primary" to="/games/genshin-impact/characters">
          Add characters →
        </Link>
      </div>
      {authLoading || loading ? (
        <Loading />
      ) : !user ? (
        <SignInPrompt />
      ) : (
        <>
          <div className="tabs">
            {["owned", "wishlist"].map((x) => (
              <button
                key={x}
                className={filter === x ? "active" : ""}
                onClick={() => setFilter(x)}
              >
                {x === "owned" ? "Owned characters" : "Wish list"} ·{" "}
                {(data?.roster || []).filter((r) => r.status === x).length}
              </button>
            ))}
          </div>
          <ErrorNotice error={error || actionError} retry={reload} />
          <div className="catalogGrid">
            {rows.map((r) => (
              <Card key={r.character_id}>
                <div className="itemRow">
                  <Image src={r.portrait_url} alt={r.name} />
                  <div>
                    <Link to={`/characters/${r.character_id}`}>
                      <h3>{r.name}</h3>
                    </Link>
                    <small>
                      Lv. {r.level} · C{r.constellation} · {r.stats?.element}
                    </small>
                  </div>
                </div>
                <div className="buttonRow">
                  <Button kind="ghost" onClick={() => setEditing(r)}>
                    Edit progress
                  </Button>
                  <button
                    className="textButton"
                    onClick={async () => {
                      try {
                        await api.del(`/companion/roster/${r.character_id}`);
                        reload();
                      } catch (e) {
                        setActionError(e.message);
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              </Card>
            ))}
          </div>
          {!rows.length && (
            <Empty
              title={
                filter === "owned"
                  ? "Your collection starts here"
                  : "A little room for future favorites"
              }
              body="Open a character page to add them to your collection."
            />
          )}
        </>
      )}
      {editing && (
        <Dialog title={editing.name} close={() => setEditing(null)}>
          <RosterEditor
            character={editing}
            entry={editing}
            onSaved={() => {
              reload();
              setEditing(null);
            }}
          />
        </Dialog>
      )}
    </section>
  );
}
