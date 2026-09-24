import React, { useEffect, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { Menu, X, UserRound, SlidersHorizontal, Sparkles } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import AuthModal from "./AuthModal";
import Atmosphere from "./Atmosphere";
import { Button, Dialog } from "./UI";
export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false),
    [auth, setAuth] = useState(false),
    [settings, setSettings] = useState(false);
  const [particles, setParticles] = useState(
      () => localStorage.getItem("particles") !== "off",
    ),
    [cursor, setCursor] = useState(
      () => localStorage.getItem("fantasyCursor") === "on",
    );
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  useEffect(() => {
    document.documentElement.classList.toggle("fantasyCursor", cursor);
    localStorage.setItem("fantasyCursor", cursor ? "on" : "off");
  }, [cursor]);
  const nav = [
    ["/games", "Explore"],
    ["/lookup", "UID Lookup"],
    ["/teams", "Teams"],
    ["/farming", "Farming"],
    ["/builds", "Builds"],
    ...(user?.role === "admin" ? [["/admin", "Admin"]] : []),
  ];
  return (
    <>
      <a href="#main" className="skipLink">
        Skip to content
      </a>
      <Atmosphere enabled={particles} />
      <header className="siteHeader">
        <Link className="brand" to="/">
          <Sparkles size={25} />
          GAME<span>ROSTER</span>
        </Link>
        <nav aria-label="Main navigation" className={open ? "open" : ""}>
          {nav.map(([to, n]) => (
            <NavLink key={to} to={to}>
              {n}
            </NavLink>
          ))}
        </nav>
        <div className="headActions">
          <button
            className="iconButton"
            aria-label="Appearance settings"
            onClick={() => setSettings(true)}
          >
            <SlidersHorizontal size={18} />
          </button>
          {user ? (
            <Link className="userChip" to="/dashboard">
              <UserRound size={16} />
              <span>{user.username}</span>
            </Link>
          ) : (
            <Button onClick={() => setAuth(true)}>Log in</Button>
          )}
          <button
            className="menu iconButton"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer>
        <Link className="brand" to="/">
          GAME<span>ROSTER</span>
        </Link>
        <p>Your journey, thoughtfully organized.</p>
        <small>
          Unofficial community companion. Game content belongs to its respective
          owners. Catalog: genshin-db · Public showcases: Enka.Network.
        </small>
      </footer>
      {auth && <AuthModal close={() => setAuth(false)} />}{" "}
      {settings && (
        <Dialog title="Make yourself at home" close={() => setSettings(false)}>
          <label className="check">
            <input
              type="checkbox"
              checked={particles}
              onChange={(e) => {
                setParticles(e.target.checked);
                localStorage.setItem(
                  "particles",
                  e.target.checked ? "on" : "off",
                );
              }}
            />
            Ambient particles
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={cursor}
              onChange={(e) => setCursor(e.target.checked)}
            />
            Fantasy cursor
          </label>
          <p className="muted">
            Your device’s reduced motion preference is always respected.
          </p>
          {user && (
            <Button
              kind="ghost"
              onClick={async () => {
                await logout();
                setSettings(false);
              }}
            >
              Log out
            </Button>
          )}
        </Dialog>
      )}
    </>
  );
}
