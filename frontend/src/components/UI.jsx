import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../lib/api";
export function Button({ children, kind = "primary", ...p }) {
  return (
    <button className={`btn ${kind}`} {...p}>
      {children}
    </button>
  );
}
export function Card({ children, className = "", ...p }) {
  return (
    <div className={`card ${className}`} {...p}>
      {children}
    </div>
  );
}
export function Badge({ children }) {
  return <span className="badge">{children}</span>;
}
export function Empty({ title, body }) {
  return (
    <div className="empty">
      <b>{title}</b>
      <p>{body}</p>
    </div>
  );
}
export function Field({ label, ...p }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input aria-label={label} {...p} />
    </label>
  );
}
export function Select({ label, children, ...p }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select aria-label={label} {...p}>
        {children}
      </select>
    </label>
  );
}
export function Textarea({ label, ...p }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea aria-label={label} {...p} />
    </label>
  );
}
export function ErrorNotice({ error, retry }) {
  return error ? (
    <div className="error" role="alert">
      {error}
      {retry && (
        <button className="textButton" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="loader" />
      Loading your next adventure…
    </div>
  );
}
export function Image({ src, alt = "", className = "", ...props }) {
  if (
    src &&
    /^https:\/\/(enka\.network|upload-os-bbs\.mihoyo\.com)\//.test(src)
  ) {
    const name = src.split("/").pop();
    if (/^[A-Za-z0-9_-]+\.png$/.test(name)) src = `${API}/assets/${name}`;
  }
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      {...props}
    />
  ) : (
    <span
      role="img"
      aria-label={`${alt || "Artwork"} unavailable`}
      className={`imageFallback ${className}`}
    >
      ✧
    </span>
  );
}
export function SignInPrompt() {
  return (
    <Empty
      title="Make it your roster"
      body="Log in from the navigation bar to save characters, teams, builds, and farming progress."
    />
  );
}
export function Pagination({ page, total, pageSize, onChange }) {
  const pages = Math.ceil(total / pageSize);
  return pages > 1 ? (
    <div className="pagination">
      <Button
        kind="ghost"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </Button>
      <span>
        Page {page} of {pages} · {total} results
      </span>
      <Button
        kind="ghost"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  ) : null;
}
export function Dialog({ title, close, children }) {
  const ref = useRef();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modalHeading">
        <h2>{title}</h2>
        <button
          type="button"
          className="iconButton"
          onClick={close}
          aria-label="Close dialog"
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function BackLink({ to, children }) {
  return (
    <Link className="backLink" to={to}>
      ← {children}
    </Link>
  );
}
