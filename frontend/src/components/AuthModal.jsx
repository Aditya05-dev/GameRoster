import React, { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { Button, Field, Dialog, ErrorNotice } from "./UI";
export default function AuthModal({ close }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login"),
    [username, setUsername] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      mode === "login"
        ? await login(username, password)
        : await signup(username, email, password);
      close();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={mode === "login" ? "Welcome back, Traveler" : "Start your journey"}
      close={close}
    >
      <div className="tabs">
        <button
          className={mode === "login" ? "active" : ""}
          onClick={() => setMode("login")}
        >
          Log in
        </button>
        <button
          className={mode === "signup" ? "active" : ""}
          onClick={() => setMode("signup")}
        >
          Sign up
        </button>
      </div>
      <form onSubmit={submit}>
        <Field
          label="Username"
          autoFocus
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        {mode === "signup" && (
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        )}
        <Field
          label="Password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={mode === "signup" ? 8 : 1}
          required
        />
        <ErrorNotice error={error} />
        <Button disabled={busy}>
          {busy ? "Working…" : mode === "login" ? "Log in" : "Create account"}
        </Button>
      </form>
    </Dialog>
  );
}
