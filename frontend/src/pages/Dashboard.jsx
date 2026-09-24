import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";
import {
  Card,
  Button,
  Field,
  Select,
  Textarea,
  Loading,
  ErrorNotice,
  SignInPrompt,
  Empty,
  Dialog,
} from "../components/UI";
export default function Dashboard() {
  const { user, loading, reload, logout } = useAuth(),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [profile, setProfile] = useState(null),
    [passwords, setPasswords] = useState({
      currentPassword: "",
      newPassword: "",
    }),
    [username, setUsername] = useState(""),
    [search, setSearch] = useState(""),
    [results, setResults] = useState([]),
    [selected, setSelected] = useState(null);
  const notifications = useApi(user ? "/notifications" : null, { auth: true });
  useEffect(() => {
    if (user) {
      setProfile({
        bio: user.bio || "",
        avatarUrl: user.avatarUrl || "",
        visibility: user.visibility || "public",
        notifyNewCharacters: user.notify_new_characters ?? true,
        gameServer: user.game_server || "Asia",
      });
      setUsername(user.username);
    }
  }, [user]);
  async function action(fn, text) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      setMessage(text);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (!user)
    return (
      <section className="section">
        <SignInPrompt />
      </section>
    );
  return (
    <section className="section">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">YOUR ADVENTURER’S JOURNAL</p>
          <h1>Welcome, {user.username}.</h1>
          <p className="muted">Permanent ID: {user.userIdPublic}</p>
        </div>
        <Button kind="ghost" onClick={logout}>
          Log out
        </Button>
      </div>
      <div className="toolGrid">
        {[
          ["/roster", "My roster", "Owned characters & wish list"],
          ["/teams", "My teams", "Roles, equipment & rotations"],
          ["/builds", "My builds", "Snapshots & comparisons"],
          ["/farming", "Farming plans", "Keep track of every upgrade"],
        ].map(([url, title, description]) => (
          <Link key={url} to={url}>
            <Card>
              <h3>{title} ↗</h3>
              <p>{description}</p>
            </Card>
          </Link>
        ))}
      </div>
      <ErrorNotice error={error} />
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      <div className="twoCol">
        <div>
          <Card>
            <h2>Profile settings</h2>
            {profile && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  action(async () => {
                    await api.patch("/users/me/profile", profile);
                    await reload();
                  }, "Profile saved.");
                }}
              >
                <Textarea
                  label="Bio"
                  rows={3}
                  maxLength={500}
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                />
                <Field
                  label="Avatar image URL"
                  type="url"
                  value={profile.avatarUrl}
                  onChange={(e) =>
                    setProfile({ ...profile, avatarUrl: e.target.value })
                  }
                />
                <Select
                  label="Profile visibility"
                  value={profile.visibility}
                  onChange={(e) =>
                    setProfile({ ...profile, visibility: e.target.value })
                  }
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </Select>
                <Select
                  label="Default game server"
                  value={profile.gameServer}
                  onChange={(e) =>
                    setProfile({ ...profile, gameServer: e.target.value })
                  }
                >
                  {["Asia", "Europe", "America", "TW/HK/MO"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={profile.notifyNewCharacters}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        notifyNewCharacters: e.target.checked,
                      })
                    }
                  />
                  Notify me when a character is published
                </label>
                <Button disabled={busy}>Save profile</Button>
              </form>
            )}
          </Card>
          <Card>
            <h2>Username</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                action(async () => {
                  await api.patch("/users/me/username", { username });
                  await reload();
                }, "Username updated. Your permanent ID is unchanged.");
              }}
            >
              <Field
                label="Unique username"
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_]+"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <Button disabled={busy}>Update username</Button>
            </form>
          </Card>
          <Card>
            <h2>Change password</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                action(async () => {
                  await api.post("/auth/change-password", passwords);
                  await logout();
                }, "Password changed. Please log in again.");
              }}
            >
              <Field
                label="Current password"
                type="password"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={(e) =>
                  setPasswords({
                    ...passwords,
                    currentPassword: e.target.value,
                  })
                }
                required
              />
              <Field
                label="New password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={passwords.newPassword}
                onChange={(e) =>
                  setPasswords({ ...passwords, newPassword: e.target.value })
                }
                required
              />
              <Button disabled={busy}>Change password</Button>
            </form>
          </Card>
        </div>
        <div>
          <Card>
            <div className="sectionHeading">
              <h2>Notifications</h2>
              <small>{notifications.data?.unreadCount || 0} unread</small>
            </div>
            <ErrorNotice
              error={notifications.error}
              retry={notifications.reload}
            />
            {notifications.data?.notifications.length ? (
              notifications.data.notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification ${n.read_at ? "read" : ""}`}
                >
                  <Link
                    to={
                      n.payload.characterId
                        ? `/characters/${n.payload.characterId}`
                        : "/games"
                    }
                  >
                    {n.payload.characterName ||
                      n.payload.title ||
                      n.type.replaceAll("_", " ")}
                  </Link>
                  <small>{new Date(n.created_at).toLocaleDateString()}</small>
                </div>
              ))
            ) : (
              <Empty
                title="All caught up"
                body="New character announcements will appear here."
              />
            )}
            <Button
              kind="ghost"
              disabled={!notifications.data?.unreadCount}
              onClick={() =>
                action(async () => {
                  await api.post("/notifications/mark-read", {});
                  notifications.reload();
                }, "Notifications marked as read.")
              }
            >
              Mark all read
            </Button>
          </Card>
          <Card>
            <h2>Find a player</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                action(async () => {
                  const r = await api.get(
                    `/users/search?q=${encodeURIComponent(search)}`,
                    { auth: false },
                  );
                  setResults(r.results);
                }, "Search complete.");
              }}
            >
              <Field
                label="Username or permanent ID"
                value={search}
                maxLength={100}
                onChange={(e) => setSearch(e.target.value)}
                required
              />
              <Button kind="ghost" disabled={busy}>
                Search profiles
              </Button>
            </form>
            {results.map((r) => (
              <button
                className="profileResult"
                key={r.id}
                onClick={() =>
                  action(async () => {
                    setSelected(
                      await api.get(`/users/${encodeURIComponent(r.username)}`),
                    );
                  }, "")
                }
              >
                <b>{r.username}</b>
                <small>{r.userIdPublic}</small>
              </button>
            ))}
          </Card>
          {user.role === "admin" && (
            <Link className="btn primary" to="/admin">
              Open content studio →
            </Link>
          )}
        </div>
      </div>
      {selected && (
        <Dialog title={selected.user.username} close={() => setSelected(null)}>
          <p>{selected.user.bio || "No bio yet."}</p>
          <small>{selected.user.userIdPublic}</small>
          <h3>Public builds</h3>
          {selected.publicBuilds.length ? (
            selected.publicBuilds.map((b) => <p key={b.id}>{b.title}</p>)
          ) : (
            <p className="muted">No public builds.</p>
          )}
          <h3>Public teams</h3>
          {selected.publicTeams.map((t) => (
            <p key={t.id}>{t.name}</p>
          ))}
        </Dialog>
      )}
    </section>
  );
}
